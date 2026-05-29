/**
 * Carbon — PebbleKit JS phone-side script
 *
 * 1. Gets device GPS location
 * 2. In parallel: fetches Open-Meteo weather + ArcGIS reverse geocode
 * 3. Sends all data to the watch via AppMessage
 *
 * Uses XMLHttpRequest (fetch() is not available in PebbleKit JS).
 * Uses localStorage to cache weather between refreshes.
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

var WEATHER_BASE_URL = 'https://api.open-meteo.com/v1/forecast';
var GEOCODE_BASE_URL = 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode';
var CACHE_KEY = 'carbon.weather.v3';
var CACHE_TTL_MS = 15 * 60 * 1000;  // 15 minutes

var Clay = require('@rebble/clay');
var clayConfig = require('./config');
var clay = new Clay(clayConfig, null, { autoHandleEvents: false });

/**
 * Make a GET request.
 *
 * @param {string}   url      URL to fetch.
 * @param {Function} callback Called with (err, responseText) on completion.
 */
function xhrGet(url, callback) {
	var xhr = new XMLHttpRequest();
	xhr.onload = function() {
		callback(null, this.responseText);
	};
	xhr.onerror = function() {
		callback('XHR error for ' + url);
	};
	xhr.open('GET', url);
	xhr.send();
}

/**
 * Returns true if the watch/phone locale indicates Fahrenheit (en_US).
 * Checks the watch locale first (most reliable), then navigator.language.
 *
 * @returns {boolean}
 */
function shouldUseFahrenheit() {
	try {
		var info = Pebble.getActiveWatchInfo();
		if (info && info.language) {
			return info.language === 'en_US';
		}
	} catch (e) {}
	var lang = (navigator && navigator.language) || '';
	return lang === 'en-US' || lang === 'en_US';
}

/**
 * Returns 'celsius' or 'fahrenheit'.
 * Reads the stored Clay setting first; if it is -1 (auto) or absent, falls
 * back to locale detection via shouldUseFahrenheit().
 *
 * @returns {'celsius'|'fahrenheit'}
 */
function getTempUnit() {
	try {
		var raw = localStorage.getItem('clay-settings');
		if (raw) {
			var s = JSON.parse(raw);
			// Clay stores select values as strings from the HTML form;
			// always parse to int before comparing.
			var unit = parseInt(s.SETTING_TEMP_UNIT, 10);
			if (unit === 0) return 'celsius';
			if (unit === 1) return 'fahrenheit';
			// -1 (auto) or NaN: fall through to locale detection
		}
	} catch (e) {}
	return shouldUseFahrenheit() ? 'fahrenheit' : 'celsius';
}

/**
 * Maps a WMO weather code to a short condition string (informational only).
 *
 * @param   {number} code  WMO weather interpretation code.
 * @returns {string}       Short condition label e.g. 'Clear', 'Rain', 'Snow'.
 */
function conditionFromCode(code) {
	if (code === 0) return 'Clear';
	if (code <= 2)  return 'Partly Cloudy';
	if (code === 3) return 'Cloudy';
	if (code <= 48) return 'Fog';
	if (code <= 57) return 'Drizzle';
	if (code <= 67) return 'Rain';
	if (code <= 77) return 'Snow';
	if (code <= 82) return 'Rain';
	if (code <= 86) return 'Snow';
	if (code <= 99) return 'Storm';
	return 'Unknown';
}

/**
 * Pack up to 24 values into a clamped uint8 array for AppMessage transport.
 *
 * @param   {number[]} values  Input values; missing entries default to 0.
 * @returns {number[]}         24-element array with values clamped to [0, 255].
 */
function packUint8Array(values) {
	var arr = [];
	for (var i = 0; i < 24; i++) {
		arr.push(Math.min(255, Math.max(0, Math.round(values[i] || 0))));
	}
	return arr;
}

/**
 * Pack up to 24 values into a clamped int8 array (two's complement) for AppMessage transport.
 *
 * @param   {number[]} values  Input values; missing entries default to 0.
 * @returns {number[]}         24-element array clamped to [-128, 127], encoded as unsigned bytes.
 */
function packInt8Array(values) {
	var arr = [];
	for (var i = 0; i < 24; i++) {
		var v = Math.round(values[i] || 0);
		v = Math.min(127, Math.max(-128, v));
		// Convert negative to unsigned byte (two's complement)
		arr.push(v < 0 ? v + 256 : v);
	}
	return arr;
}

/**
 * Extract the local hour from a Unix timestamp.
 * With timeformat=unixtime, daily.sunrise/sunset are Unix timestamps (seconds).
 *
 * @param   {number} timestamp  Unix timestamp in seconds.
 * @returns {number}            Local hour (0–23).
 */
function extractHourFromUnix(timestamp) {
	// timestamp is seconds since epoch; multiply by 1000 for JS Date
	var d = new Date(timestamp * 1000);
	return d.getHours();
}

/**
 * Read the weather cache from localStorage, or null if absent/invalid.
 *
 * @returns {{expiresAt: number, payload: Object}|null}
 */
function readCache() {
	try {
		var raw = localStorage.getItem(CACHE_KEY);
		if (!raw) return null;
		var obj = JSON.parse(raw);
		if (!obj || !obj.payload || !obj.expiresAt) return null;
		return obj;
	} catch (e) {
		return null;
	}
}

/**
 * Persist payload to localStorage with a TTL-based expiry timestamp.
 *
 * @param {Object} payload  Weather data object to cache.
 */
function writeCache(payload) {
	try {
		localStorage.setItem(CACHE_KEY, JSON.stringify({
			expiresAt: Date.now() + CACHE_TTL_MS,
			payload: payload
		}));
	} catch (e) {}
}

/**
 * Send a weather payload to the watch via AppMessage.
 *
 * @param {Object}   payload                      Weather data object.
 * @param {number[]} payload.precip_prob           Hourly precipitation probability (0–100).
 * @param {number[]} payload.temp_hourly           Hourly temperature values.
 * @param {number[]} payload.apparent_temp_hourly  Hourly apparent temperature values.
 * @param {number[]} payload.cloud_cover           Hourly cloud cover (0–100).
 * @param {number[]} payload.hourly_weather_code   Hourly WMO weather codes.
 * @param {string}   payload.city_name             City label for the time layer.
 * @param {string}   payload.temp_unit             'celsius' or 'fahrenheit'.
 * @param {number}  [payload.current_temp]         Current temperature (omitted when null).
 * @param {number}  [payload.high_temp]            Day high temperature (omitted when null).
 * @param {number}  [payload.low_temp]             Day low temperature (omitted when null).
 * @param {number}  [payload.weather_code]         Current WMO code (omitted when null).
 * @param {number}  [payload.sunrise_hour]         Sunrise hour 0–23 (omitted when null).
 * @param {number}  [payload.sunset_hour]          Sunset hour 0–23 (omitted when null).
 * @param {number}  [payload.fetch_time]           Unix fetch timestamp (omitted when null).
 */
function sendToWatch(payload) {
	var hourlyCount = 24;

	var precipProb    = (payload.precip_prob            || []).slice(0, hourlyCount);
	var tempHourly    = (payload.temp_hourly             || []).slice(0, hourlyCount);
	var apparentHourly = (payload.apparent_temp_hourly   || []).slice(0, hourlyCount);
	var cloudCover    = (payload.cloud_cover             || []).slice(0, hourlyCount);
	var hourlyCode    = (payload.hourly_weather_code     || []).slice(0, hourlyCount);

	while (precipProb.length     < hourlyCount) precipProb.push(0);
	while (tempHourly.length     < hourlyCount) tempHourly.push(0);
	while (apparentHourly.length < hourlyCount) apparentHourly.push(0);
	while (cloudCover.length     < hourlyCount) cloudCover.push(0);
	while (hourlyCode.length     < hourlyCount) hourlyCode.push(0);

	// 0 = celsius, 1 = fahrenheit  (matches settings.c convention)
	var tempUnitFlag = (payload.temp_unit === 'fahrenheit') ? 1 : 0;

	var dict = {
		'WEATHER_PRECIP_PROB':           packUint8Array(precipProb),
		'WEATHER_TEMP_HOURLY':           packInt8Array(tempHourly),
		'WEATHER_APPARENT_TEMP_HOURLY':  packInt8Array(apparentHourly),
		'WEATHER_CLOUD_COVER':           packUint8Array(cloudCover),
		'WEATHER_HOURLY_CODE':           packUint8Array(hourlyCode),
		'CITY_NAME':                     (payload.city_name || 'Unknown').substring(0, 23),
		'SETTING_TEMP_UNIT':             tempUnitFlag,
	};

	// Scalar weather fields are only included when the value is actually present;
	// omitting a key is the AppMessage equivalent of null.
	if (payload.current_temp != null) dict['WEATHER_TEMP']         = Math.round(payload.current_temp);
	if (payload.high_temp    != null) dict['WEATHER_TEMP_HIGH']    = Math.round(payload.high_temp);
	if (payload.low_temp     != null) dict['WEATHER_TEMP_LOW']     = Math.round(payload.low_temp);
	if (payload.weather_code != null) dict['WEATHER_CODE']         = payload.weather_code;
	if (payload.sunrise_hour != null) dict['WEATHER_SUNRISE_HOUR'] = payload.sunrise_hour;
	if (payload.sunset_hour  != null) dict['WEATHER_SUNSET_HOUR']  = payload.sunset_hour;
	if (payload.fetch_time   != null) dict['WEATHER_FETCH_TIME']   = Math.floor(payload.fetch_time);

	Pebble.sendAppMessage(dict,
		function() { console.log('Carbon: weather sent to watch'); },
		function(e) { console.log('Carbon: sendAppMessage failed: ' + JSON.stringify(e)); }
	);
}

/**
 * Fetch fresh weather and city name in parallel, then send to watch.
 *
 * @param {number} lat  Device latitude in decimal degrees.
 * @param {number} lon  Device longitude in decimal degrees.
 */
function fetchAndSend(lat, lon) {
	var weatherDone = false;
	var cityDone    = false;
	var weatherOk   = false;
	var payload     = {};

	var tempUnit = getTempUnit();
	payload.temp_unit = tempUnit;

	function tryFinish() {
		if (!weatherDone || !cityDone) return;

		if (!weatherOk) {
			// Weather fetch/parse failed; fall back to stale cache so the watch
			// doesn't receive zeroed-out data.
			var stale = readCache();
			if (stale && stale.payload) {
				console.log('Carbon: weather failed, using stale cache');
				sendToWatch(stale.payload);
			} else {
				console.log('Carbon: weather failed, no cache — not sending');
			}
			return;
		}

		writeCache(payload);
		sendToWatch(payload);
	}

	// Open-Meteo weather — forecast_hours=24 returns exactly 24 hourly entries
	// starting from the current hour; timeformat=unixtime for sunrise/sunset
	var weatherUrl = WEATHER_BASE_URL +
		'?latitude='  + lat +
		'&longitude=' + lon +
		'&current=temperature_2m,weather_code' +
		'&hourly=precipitation_probability,temperature_2m,apparent_temperature,cloud_cover,weather_code' +
		'&forecast_hours=24' +
		'&daily=sunrise,sunset,temperature_2m_min,temperature_2m_max' +
		'&forecast_days=1' +
		'&temperature_unit=' + tempUnit +
		'&timeformat=unixtime' +
		'&timezone=auto';

	xhrGet(weatherUrl, function(err, responseText) {
		if (err) {
			console.log('Carbon: weather fetch error: ' + err);
			weatherDone = true;
			tryFinish();
			return;
		}
		try {
			var json = JSON.parse(responseText);
			var cur  = json.current;
			var hrly = json.hourly;
			var dly  = json.daily;

			payload.current_temp = cur.temperature_2m;
			payload.weather_code = cur.weather_code;
			payload.high_temp    = dly && dly.temperature_2m_max ? dly.temperature_2m_max[0] : cur.temperature_2m;
			payload.low_temp     = dly && dly.temperature_2m_min ? dly.temperature_2m_min[0] : cur.temperature_2m;

			// Sunrise/sunset are Unix timestamps with timeformat=unixtime
			payload.sunrise_hour = dly && dly.sunrise ? extractHourFromUnix(dly.sunrise[0]) : 6;
			payload.sunset_hour  = dly && dly.sunset  ? extractHourFromUnix(dly.sunset[0])  : 20;

			// forecast_hours=24 returns exactly 24 entries starting from now
			if (hrly) {
				payload.precip_prob          = hrly.precipitation_probability || [];
				payload.temp_hourly           = hrly.temperature_2m            || [];
				payload.apparent_temp_hourly  = hrly.apparent_temperature      || [];
				payload.cloud_cover           = hrly.cloud_cover               || [];
				payload.hourly_weather_code   = hrly.weather_code              || [];
			}

			// Record the real origin time so the watch can compute how many
			// hourly slots are already in the past when serving from cache.
			payload.fetch_time = Math.floor(Date.now() / 1000);
			weatherOk = true;
		} catch (e) {
			console.log('Carbon: weather parse error: ' + e);
		}
		weatherDone = true;
		tryFinish();
	});

	// ArcGIS reverse geocode for city name
	var geocodeUrl = GEOCODE_BASE_URL +
		'?f=json&langCode=EN&location=' + lon + ',' + lat;

	xhrGet(geocodeUrl, function(err, responseText) {
		if (err) {
			console.log('Carbon: geocode error: ' + err);
			payload.city_name = 'Unknown';
			cityDone = true;
			tryFinish();
			return;
		}
		try {
			var json = JSON.parse(responseText);
			var addr = json && json.address;
			payload.city_name = (addr && (addr.City || addr.ShortLabel)) || 'Unknown';
		} catch (e) {
			payload.city_name = 'Unknown';
		}
		cityDone = true;
		tryFinish();
	});
}

/**
 * Check the local cache and send if still valid; otherwise acquire geolocation
 * and call fetchAndSend.
 */
function getWeather() {
	// Check cache first
	var cache = readCache();
	if (cache && cache.expiresAt > Date.now()) {
		console.log('Carbon: using cached weather');
		// Re-evaluate unit in case locale changed; re-fetch if unit differs
		var cachedUnit = cache.payload && cache.payload.temp_unit;
		if (cachedUnit && cachedUnit === getTempUnit()) {
			sendToWatch(cache.payload);
			return;
		}
		console.log('Carbon: temp unit changed, refreshing weather');
	}

	navigator.geolocation.getCurrentPosition(
		function(pos) {
			fetchAndSend(pos.coords.latitude, pos.coords.longitude);
		},
		function(err) {
			console.log('Carbon: geolocation error: ' + err.message);
			// Fall back to stale cache if available
			if (cache) {
				console.log('Carbon: using stale cache');
				sendToWatch(cache.payload);
			}
		},
		{ timeout: 15000, maximumAge: 300000 }
	);
}

//
// Event listeners
//

Pebble.addEventListener('ready', function() {
	console.log('Carbon: PebbleKit JS ready');
	getWeather();
});

Pebble.addEventListener('showConfiguration', function() {
	Pebble.openURL(clay.generateUrl());
});

Pebble.addEventListener('webviewclosed', function(e) {
	if (!e.response) return;

	// Use convert=false to get raw string-keyed settings; Clay's HTML <select>
	// always returns string values even when the config defines number options,
	// so we parse each integer value ourselves instead of relying on Clay's
	// type conversion (which leaves strings as-is and breaks C int8 parsing).
	var rawSettings = clay.getSettings(e.response, false);

	/**
	 * Extract an integer from a raw Clay setting value.
	 * Clay sends either a bare string ("0") or an object ({value:"0",label:"…"}).
	 *
	 * @param   {string|{value:string}} setting
	 * @returns {number}  Parsed integer, or NaN if unparseable.
	 */
	function extractInt(setting) {
		var v = (setting !== null && typeof setting === 'object' && 'value' in setting)
			? setting.value : setting;
		return parseInt(v, 10);
	}

	var tempUnit = extractInt(rawSettings['SETTING_TEMP_UNIT']);
	if (isNaN(tempUnit) || tempUnit < 0) {
		tempUnit = shouldUseFahrenheit() ? 1 : 0;
	}

	var dict = { 'SETTING_TEMP_UNIT': tempUnit };

	// Date format is a strftime string, not an integer — extract the raw value.
	var rawDateFmt = rawSettings['SETTING_DATE_FORMAT'];
	var dateFormat = (rawDateFmt !== null && typeof rawDateFmt === 'object' &&
	                  'value' in rawDateFmt)
		? rawDateFmt.value : rawDateFmt;
	if (typeof dateFormat === 'string' && dateFormat.length > 0) {
		dict['SETTING_DATE_FORMAT'] = dateFormat;
	}

	var batteryDisplay = extractInt(rawSettings['SETTING_BATTERY_DISPLAY']);
	if (!isNaN(batteryDisplay)) dict['SETTING_BATTERY_DISPLAY'] = batteryDisplay;

	Pebble.sendAppMessage(dict,
		function() { console.log('Carbon: settings sent to watch'); },
		function(err) { console.log('Carbon: settings send failed: ' + JSON.stringify(err)); }
	);
	// Refresh weather in case the temperature unit changed
	getWeather();
});

Pebble.addEventListener('appmessage', function(e) {
	if (e.payload && e.payload['WEATHER_REQUEST']) {
		console.log('Carbon: weather refresh requested');
		getWeather();
	}
});
