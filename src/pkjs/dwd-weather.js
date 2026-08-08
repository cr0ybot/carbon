/**
 * DWD (Deutscher Wetterdienst) weather source, fetched via the free,
 * keyless Bright Sky API (https://brightsky.dev) — a JSON wrapper around
 * DWD's open weather data. Best used for locations in/around Germany.
 *
 * Differences from the Open-Meteo source that callers must account for:
 *  - Bright Sky always returns temperature in Celsius; there is no
 *    server-side unit conversion, so we convert to Fahrenheit here when
 *    needed.
 *  - There is no daily sunrise/sunset field, so sunrise/sunset hours are
 *    computed locally (see computeSunHours()).
 *  - There is no "apparent temperature" field; the actual temperature is
 *    used as a stand-in.
 *  - Conditions are reported as `icon`/`condition` strings rather than WMO
 *    codes, so they are translated to a representative WMO code understood
 *    by weather_code_to_condition() in the C app (see iconToWmoCode()).
 *  - Raw DWD/MOSMIX total cloud cover runs noticeably higher than
 *    Open-Meteo's for the same subjectively "good weather" (e.g. Bright Sky
 *    still calls 60%+ cloud cover "partly cloudy"), so the cloud graph's
 *    percentage is also derived from `icon`/`condition` rather than sent
 *    as-is (see iconToCloudCoverPct()).
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

var {
	DWD_BASE_URL,
	DWD_MAX_DIST_METERS,
	FORECAST_HOURS,
	WEATHER_RETRY_ATTEMPTS,
	WEATHER_RETRY_BASE_DELAY_MS,
} = require('./constants');

var HOUR_MS = 60 * 60 * 1000;

/**
 * Bright Sky `icon` values mapped to a representative WMO weather code
 * understood by weather_code_to_condition() in src/c/modules/weather.c.
 */
var ICON_TO_WMO_CODE = {
	'clear-day': 0,
	'clear-night': 0,
	'partly-cloudy-day': 1,
	'partly-cloudy-night': 1,
	'cloudy': 3,
	'fog': 45,
	'wind': 7,
	'rain': 61,
	'sleet': 67,
	'snow': 73,
	'hail': 90,
	'thunderstorm': 95,
};

/**
 * Fallback mapping when `icon` is unavailable but `condition` is present.
 * Coarser than ICON_TO_WMO_CODE (no clear/cloudy/wind granularity).
 */
var CONDITION_TO_WMO_CODE = {
	'dry': 0,
	'fog': 45,
	'rain': 61,
	'sleet': 67,
	'snow': 73,
	'hail': 90,
	'thunderstorm': 95,
};

/**
 * Bright Sky `icon` values mapped to a representative cloud-cover percentage
 * for the watch's cloud graph (src/c/ui/cloud_layer.c), rather than passing
 * Bright Sky's raw `cloud_cover` (DWD/MOSMIX total cloud amount) straight
 * through.
 *
 * DWD's raw total cloud cover runs noticeably higher than Open-Meteo's for
 * the same subjectively "good weather" — e.g. Bright Sky still reports
 * `partly-cloudy-day` at 60%+ cloud cover, well past the watch's "large
 * cloud" render threshold (70%), which was tuned against Open-Meteo's scale.
 * Deriving the value from the already-interpreted `icon` instead keeps the
 * cloud graph visually consistent with what the icon (and the human eye)
 * would call "mostly sunny" vs. "overcast", and doubles as a fallback when
 * a record's raw `cloud_cover` is missing/null. `wind` has no bearing on
 * cloud amount and is intentionally omitted (falls through to raw value).
 */
var ICON_TO_CLOUD_COVER_PCT = {
	'clear-day': 5,
	'clear-night': 5,
	'partly-cloudy-day': 30,
	'partly-cloudy-night': 30,
	'cloudy': 90,
	'fog': 80,
	'rain': 85,
	'sleet': 85,
	'snow': 85,
	'hail': 85,
	'thunderstorm': 90,
};

/**
 * Fallback mapping when `icon` is unavailable but `condition` is present.
 * `dry` is intentionally omitted — it covers everything from clear to
 * overcast and carries no useful cloud-amount signal on its own.
 */
var CONDITION_TO_CLOUD_COVER_PCT = {
	'fog': 80,
	'rain': 85,
	'sleet': 85,
	'snow': 85,
	'hail': 85,
	'thunderstorm': 90,
};

/**
 * Convert Celsius to Fahrenheit.
 *
 * @param   {number} celsius
 * @returns {number}
 */
function celsiusToFahrenheit(celsius) {
	return celsius * 9 / 5 + 32;
}

/**
 * Last-resort condition guess from cloud cover percentage, used when a
 * record has neither `icon` nor `condition` populated.
 *
 * @param   {?number} cloudCoverPct  0-100, or null/undefined.
 * @returns {number}                 WMO weather code.
 */
function cloudCoverToWmoCode(cloudCoverPct) {
	if (cloudCoverPct == null) return 0;
	if (cloudCoverPct <= 10) return 0;
	if (cloudCoverPct <= 50) return 1;
	if (cloudCoverPct <= 87) return 2;
	return 3;
}

/**
 * Translate a Bright Sky weather record's condition fields to a
 * representative WMO weather code.
 *
 * @param   {?string} icon           Bright Sky `icon` value.
 * @param   {?string} condition      Bright Sky `condition` value.
 * @param   {?number} cloudCoverPct  Bright Sky `cloud_cover` value (0-100).
 * @returns {number}                 WMO weather code.
 */
function iconToWmoCode(icon, condition, cloudCoverPct) {
	if (icon && Object.prototype.hasOwnProperty.call(ICON_TO_WMO_CODE, icon)) {
		return ICON_TO_WMO_CODE[icon];
	}
	if (condition && Object.prototype.hasOwnProperty.call(CONDITION_TO_WMO_CODE, condition)) {
		return CONDITION_TO_WMO_CODE[condition];
	}
	return cloudCoverToWmoCode(cloudCoverPct);
}

/**
 * Derive the cloud-cover percentage sent to the watch's cloud graph from a
 * Bright Sky record's `icon`/`condition`, falling back to the raw
 * `cloud_cover` value only when neither is available. See
 * ICON_TO_CLOUD_COVER_PCT for why the raw DWD/MOSMIX percentage isn't used
 * directly.
 *
 * @param   {?string} icon           Bright Sky `icon` value.
 * @param   {?string} condition      Bright Sky `condition` value.
 * @param   {?number} rawCloudCoverPct  Bright Sky `cloud_cover` value (0-100).
 * @returns {number}                 Cloud-cover percentage (0-100).
 */
function iconToCloudCoverPct(icon, condition, rawCloudCoverPct) {
	if (icon && Object.prototype.hasOwnProperty.call(ICON_TO_CLOUD_COVER_PCT, icon)) {
		return ICON_TO_CLOUD_COVER_PCT[icon];
	}
	if (condition && Object.prototype.hasOwnProperty.call(CONDITION_TO_CLOUD_COVER_PCT, condition)) {
		return CONDITION_TO_CLOUD_COVER_PCT[condition];
	}
	return typeof rawCloudCoverPct === 'number' ? rawCloudCoverPct : 0;
}

/**
 * Compute local sunrise/sunset hours for today, adapted from the
 * public-domain sunrise/sunset equations used by SunCalc
 * (https://github.com/mourner/suncalc, (c) 2014 Vladimir Agafonkin, MIT).
 * Condensed here to avoid pulling in the full SunCalc dependency.
 *
 * @param   {number} lat  Latitude in decimal degrees.
 * @param   {number} lon  Longitude in decimal degrees.
 * @param   {Date}   date Reference date/time (local "now" is fine).
 * @returns {{sunriseHour: number, sunsetHour: number}}
 */
function computeSunHours(lat, lon, date) {
	var rad = Math.PI / 180;
	var dayMs = 1000 * 60 * 60 * 24;
	var J1970 = 2440588;
	var J2000 = 2451545;
	var J0 = 0.0009;
	var e = rad * 23.4397; // obliquity of the Earth

	function toJulian(d) { return d.valueOf() / dayMs - 0.5 + J1970; }
	function fromJulian(j) { return new Date((j + 0.5 - J1970) * dayMs); }
	function toDays(d) { return toJulian(d) - J2000; }
	function solarMeanAnomaly(d) { return rad * (357.5291 + 0.98560028 * d); }
	function eclipticLongitude(M) {
		var C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
		var P = rad * 102.9372;
		return M + C + P + Math.PI;
	}
	function declination(l) { return Math.asin(Math.sin(l) * Math.sin(e)); }
	function julianCycle(d, lw) { return Math.round(d - J0 - lw / (2 * Math.PI)); }
	function approxTransit(ht, lw, n) { return J0 + (ht + lw) / (2 * Math.PI) + n; }
	function solarTransitJ(ds, M, L) { return J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L); }
	function hourAngle(h, phi, d) {
		return Math.acos((Math.sin(h) - Math.sin(phi) * Math.sin(d)) / (Math.cos(phi) * Math.cos(d)));
	}

	var DEFAULT_HOURS = { sunriseHour: 6, sunsetHour: 20 };

	var lw = rad * -lon;
	var phi = rad * lat;
	var d = toDays(date);
	var n = julianCycle(d, lw);
	var ds = approxTransit(0, lw, n);
	var M = solarMeanAnomaly(ds);
	var L = eclipticLongitude(M);
	var dec = declination(L);
	var h0 = -0.833 * rad;

	var w0 = hourAngle(h0, phi, dec);
	// Math.acos() returns NaN (rather than throwing) outside [-1, 1], which
	// happens during polar day/night at extreme latitudes.
	if (isNaN(w0)) return DEFAULT_HOURS;

	var Jset = solarTransitJ(approxTransit(w0, lw, n), M, L);
	var Jnoon = solarTransitJ(ds, M, L);
	var Jrise = Jnoon - (Jset - Jnoon);

	var sunrise = fromJulian(Jrise);
	var sunset = fromJulian(Jset);
	if (isNaN(sunrise.getTime()) || isNaN(sunset.getTime())) return DEFAULT_HOURS;

	return { sunriseHour: sunrise.getHours(), sunsetHour: sunset.getHours() };
}

/**
 * Build the ISO 8601 forecast window: FORECAST_HOURS hourly buckets
 * starting at the current wall-clock hour. Bright Sky returns the bucket
 * whose timestamp >= `date`, so anchoring on the hour boundary keeps the
 * first entry aligned with the hour the user is currently in.
 *
 * @returns {{start: string, end: string}}
 */
function forecastWindow() {
	var startMs = Math.floor(Date.now() / HOUR_MS) * HOUR_MS;
	var endMs = startMs + (FORECAST_HOURS - 1) * HOUR_MS;
	return {
		start: new Date(startMs).toISOString(),
		end: new Date(endMs).toISOString(),
	};
}

/**
 * @param   {number} lat
 * @param   {number} lon
 * @returns {string} Bright Sky `/weather` (hourly forecast) request URL.
 */
function buildForecastUrl(lat, lon) {
	var win = forecastWindow();
	return DWD_BASE_URL + '/weather' +
		'?lat=' + lat +
		'&lon=' + lon +
		'&date=' + encodeURIComponent(win.start) +
		'&last_date=' + encodeURIComponent(win.end) +
		'&max_dist=' + DWD_MAX_DIST_METERS;
}

/**
 * @param   {number} lat
 * @param   {number} lon
 * @returns {string} Bright Sky `/current_weather` request URL.
 */
function buildCurrentUrl(lat, lon) {
	return DWD_BASE_URL + '/current_weather' +
		'?lat=' + lat +
		'&lon=' + lon +
		'&max_dist=' + DWD_MAX_DIST_METERS;
}

/**
 * Convert a Celsius value to the display unit.
 *
 * @param   {number} celsius
 * @param   {'celsius'|'fahrenheit'} tempUnit
 * @returns {number}
 */
function toDisplayTemp(celsius, tempUnit) {
	return tempUnit === 'fahrenheit' ? celsiusToFahrenheit(celsius) : celsius;
}

/**
 * Build the same field shape produced by index.js's Open-Meteo parser, so
 * both sources can feed into the same payload-assembly code.
 *
 * @param   {Object[]} hourly     Bright Sky `/weather` records, ascending by timestamp.
 * @param   {Object}   current    Bright Sky `/current_weather` record.
 * @param   {'celsius'|'fahrenheit'} tempUnit
 * @param   {number}   lat
 * @param   {number}   lon
 * @returns {Object}   Fields matching index.js's weather payload contract.
 */
function buildPayloadFields(hourly, current, tempUnit, lat, lon) {
	var count = Math.min(hourly.length, FORECAST_HOURS);
	var precipProb = [];
	var tempHourly = [];
	var apparentHourly = [];
	var cloudCover = [];
	var hourlyCode = [];

	for (var i = 0; i < count; i++) {
		var h = hourly[i] || {};
		var tempC = typeof h.temperature === 'number' ? h.temperature : current.temperature;
		var tempDisplay = toDisplayTemp(tempC, tempUnit);
		tempHourly.push(tempDisplay);
		// Bright Sky has no apparent-temperature field; fall back to actual temp.
		apparentHourly.push(tempDisplay);
		precipProb.push(typeof h.precipitation_probability === 'number' ? h.precipitation_probability : 0);
		cloudCover.push(iconToCloudCoverPct(h.icon, h.condition, h.cloud_cover));
		hourlyCode.push(iconToWmoCode(h.icon, h.condition, h.cloud_cover));
	}

	var currentTemp = toDisplayTemp(current.temperature, tempUnit);
	var dayCount = Math.min(count, 24);
	var highTemp = currentTemp;
	var lowTemp = currentTemp;
	for (var j = 0; j < dayCount; j++) {
		if (tempHourly[j] > highTemp) highTemp = tempHourly[j];
		if (tempHourly[j] < lowTemp) lowTemp = tempHourly[j];
	}

	var sun = computeSunHours(lat, lon, new Date());

	return {
		current_temp: currentTemp,
		weather_code: iconToWmoCode(current.icon, current.condition, current.cloud_cover),
		high_temp: highTemp,
		low_temp: lowTemp,
		sunrise_hour: sun.sunriseHour,
		sunset_hour: sun.sunsetHour,
		precip_prob: precipProb,
		temp_hourly: tempHourly,
		apparent_temp_hourly: apparentHourly,
		cloud_cover: cloudCover,
		hourly_weather_code: hourlyCode,
		fetch_time: Math.floor(Date.now() / 1000),
	};
}

/**
 * Fetch current + hourly forecast weather from Bright Sky (DWD) and hand
 * back fields shaped like index.js's Open-Meteo parser output.
 *
 * @param {number}   lat         Latitude in decimal degrees.
 * @param {number}   lon         Longitude in decimal degrees.
 * @param {'celsius'|'fahrenheit'} tempUnit
 * @param {Function} retryXhrFn  index.js's retryXhr(url, maxAttempts, baseDelayMs, label, callback, events, validate).
 * @param {Function} callback    Called with (err) or (null, fields).
 */
function fetchDwdWeather(lat, lon, tempUnit, retryXhrFn, callback) {
	var forecastUrl = buildForecastUrl(lat, lon);

	retryXhrFn(forecastUrl, WEATHER_RETRY_ATTEMPTS, WEATHER_RETRY_BASE_DELAY_MS,
		'dwd forecast fetch',
		function (err, responseText) {
			if (err) {
				callback('dwd forecast fetch failed: ' + err);
				return;
			}

			var hourly;
			try {
				var json = JSON.parse(responseText);
				hourly = json && json.weather;
			} catch (e) {
				callback('dwd forecast parse error: ' + e);
				return;
			}
			if (!Array.isArray(hourly) || hourly.length === 0) {
				callback('dwd forecast empty');
				return;
			}

			var currentUrl = buildCurrentUrl(lat, lon);
			retryXhrFn(currentUrl, WEATHER_RETRY_ATTEMPTS, WEATHER_RETRY_BASE_DELAY_MS,
				'dwd current fetch',
				function (curErr, curResponseText) {
					if (curErr) {
						callback('dwd current fetch failed: ' + curErr);
						return;
					}

					var current;
					try {
						var curJson = JSON.parse(curResponseText);
						current = curJson && curJson.weather;
					} catch (e) {
						callback('dwd current parse error: ' + e);
						return;
					}
					if (!current || typeof current.temperature !== 'number') {
						callback('dwd current missing temperature');
						return;
					}

					try {
						callback(null, buildPayloadFields(hourly, current, tempUnit, lat, lon));
					} catch (e) {
						callback('dwd payload build error: ' + e);
					}
				}, { retry: 'wx_retry' });
		}, { retry: 'wx_retry' });
}

module.exports = {
	fetchDwdWeather: fetchDwdWeather,
	iconToWmoCode: iconToWmoCode,
	iconToCloudCoverPct: iconToCloudCoverPct,
	computeSunHours: computeSunHours,
};
