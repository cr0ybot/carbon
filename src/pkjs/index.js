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

var {
	WEATHER_BASE_URL,
	GEOCODE_BASE_URL,
	CACHE_KEY,
	GEONAME_CACHE_KEY,
	GEONAME_TTL_MS,
	GEONAME_COORD_PRECISION,
	CACHE_TTL_MARGIN_MS,
	FORECAST_HOURS,
	XHR_TIMEOUT_MS,
	WEATHER_RETRY_ATTEMPTS,
	WEATHER_RETRY_BASE_DELAY_MS,
	GEOCODE_RETRY_ATTEMPTS,
	GEOCODE_RETRY_BASE_DELAY_MS,
	SEND_RETRY_ATTEMPTS,
	SEND_RETRY_BASE_DELAY_MS,
	FETCH_DEDUPE_WINDOW_MS,
	SEND_DEDUPE_WINDOW_MS,
	REQ_DEDUPE_WINDOW_MS,
} = require('./constants');

var buildInfo = require('../../.buildinfo.json');
var eventLog = require('./eventlog');

var Clay = require('@rebble/clay');
var clayConfig = require('./config');
var clay = new Clay(clayConfig, require('./config/custom'), { autoHandleEvents: false });
clay.registerComponent(require('./config/debug'));

var s_fetchStartedAt = 0;
var s_lastHandledAt = 0;
var s_lastSentAt = 0;
var s_lastSentSignature = '';

/**
 * Make a GET request.
 *
 * @param {string}   url      URL to fetch.
 * @param {Function} callback Called with (err, responseText) on completion.
 */
function xhrGet(url, callback) {
	var xhr = new XMLHttpRequest();
	var settled = false;

	function done(err, responseText) {
		if (settled) return;
		settled = true;
		callback(err, responseText);
	}

	xhr.onload = function () {
		if (this.status >= 200 && this.status < 300) {
			done(null, this.responseText);
			return;
		}
		done('HTTP ' + this.status + ' for ' + url + ': ' +
			String(this.responseText || '').slice(0, 120));
	};
	xhr.onerror = function () {
		done('XHR error for ' + url);
	};
	xhr.ontimeout = function () {
		done('XHR timeout for ' + url + ' after ' + XHR_TIMEOUT_MS + 'ms');
	};
	xhr.timeout = XHR_TIMEOUT_MS;
	xhr.open('GET', url);
	xhr.send();
}

/**
 * Retry an XHR GET with exponential backoff.
 *
 * @param {string}   url
 * @param {number}   maxAttempts   Total attempts including the first try.
 * @param {number}   baseDelayMs   Backoff base delay in milliseconds.
 * @param {string}   label         Log label for this fetch type.
 * @param {Function} callback      Called with (err, responseText, validated).
 * @param {Object=}  events        Optional event code mapping for retry/ok/fail logs.
 * @param {Function=} validate     Optional validator: (responseText) => value or error string.
 */
function retryXhr(url, maxAttempts, baseDelayMs, label, callback, events, validate) {
	events = events || {};
	var attempt = 1;

	function run() {
		xhrGet(url, function (err, responseText) {
			var validated = null;

			if (!err && typeof validate === 'function') {
				try {
					var validationResult = validate(responseText);
					if (typeof validationResult === 'string' && validationResult.length > 0) {
						err = validationResult;
					} else {
						validated = validationResult;
					}
				} catch (e) {
					err = 'validate error for ' + label + ': ' + e;
				}
			}

			if (!err) {
				if (events.ok) {
					eventLog.log(events.ok, label + ' a=' + attempt);
				}
				callback(null, responseText, validated);
				return;
			}

			if (attempt >= maxAttempts) {
				if (events.fail) {
					eventLog.log(events.fail,
						label + ' a=' + attempt + ' err=' + err);
				}
				callback(err);
				return;
			}

			var delayMs = baseDelayMs * Math.pow(2, attempt - 1);
			if (events.retry) {
				eventLog.log(events.retry,
					label + ' a=' + attempt + ' d=' + delayMs +
					' err=' + err);
			}
			console.log(
				'Carbon: ' + label + ' retry ' + attempt + '/' + (maxAttempts - 1) +
				' in ' + delayMs + 'ms after error: ' + err
			);
			attempt += 1;
			setTimeout(run, delayMs);
		});
	}

	run();
}

/**
 * Retry Pebble.sendAppMessage with exponential backoff.
 *
 * SEND_RETRY_ATTEMPTS is treated as retry count (in addition to the first
 * send), so base 1000ms yields delays of 1s/2s/4s.
 *
 * @param {Object} dict
 */
function sendToWatchWithRetry(dict) {
	var retriesLeft = SEND_RETRY_ATTEMPTS;
	var retryIndex = 0;

	function send() {
		Pebble.sendAppMessage(dict,
			function () {
				eventLog.log('send_ok', 'a=' + (retryIndex + 1));
				console.log('Carbon: weather sent to watch');
			},
			function (e) {
				if (retriesLeft <= 0) {
					eventLog.log('send_fail', 'a=' + (retryIndex + 1) +
						' err=' + JSON.stringify(e));
					console.log('Carbon: sendAppMessage failed: ' + JSON.stringify(e));
					return;
				}

				var delayMs = SEND_RETRY_BASE_DELAY_MS * Math.pow(2, retryIndex);
				eventLog.log('send_retry',
					'a=' + (retryIndex + 1) + ' d=' + delayMs +
					' err=' + JSON.stringify(e));
				console.log(
					'Carbon: send retry ' + (retryIndex + 1) + '/' + SEND_RETRY_ATTEMPTS +
					' in ' + delayMs + 'ms after error: ' + JSON.stringify(e)
				);
				retriesLeft -= 1;
				retryIndex += 1;
				setTimeout(send, delayMs);
			}
		);
	}

	send();
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
	} catch (e) { }
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
	} catch (e) { }
	return shouldUseFahrenheit() ? 'fahrenheit' : 'celsius';
}

/**
 * Returns the configured fetch interval in minutes from Clay settings.
 * Falls back to 30 when unset or invalid.
 *
 * @returns {number}
 */
function getFetchIntervalMin() {
	try {
		var raw = localStorage.getItem('clay-settings');
		if (raw) {
			var s = JSON.parse(raw);
			var interval = parseInt(s.SETTING_FETCH_INTERVAL, 10);
			if (interval === 15 || interval === 30 || interval === 60) {
				return interval;
			}
		}
	} catch (e) { }
	return 30;
}

/**
 * Resolve the locale language used for reverse geocoding.
 * Prefers watch locale, then phone locale, then falls back to English.
 *
 * @returns {string}
 */
function getLocalityLanguage() {
	var rawLang = '';

	try {
		var info = Pebble.getActiveWatchInfo();
		if (info && info.language) rawLang = String(info.language);
	} catch (e) { }

	if (!rawLang && navigator && navigator.language) {
		rawLang = String(navigator.language);
	}

	rawLang = rawLang.replace('_', '-');
	var match = /^[A-Za-z]{2,3}/.exec(rawLang);
	if (!match) return 'en';
	return match[0].toLowerCase();
}

/**
 * Read Clay settings from localStorage.
 *
 * @returns {Object}
 */
function readClaySettings() {
	try {
		var raw = localStorage.getItem('clay-settings');
		return raw ? (JSON.parse(raw) || {}) : {};
	} catch (e) {
		return {};
	}
}

/**
 * Unwrap a raw value that may be stored as {value: ...}.
 *
 * @param   {*} value
 * @returns {*}
 */
function unwrapSettingValue(value) {
	if (value !== null && typeof value === 'object' && 'value' in value) {
		return value.value;
	}
	return value;
}

/**
 * Parse a boolean setting with a default fallback.
 *
 * @param   {Object}  settings
 * @param   {string}  key
 * @param   {boolean} defaultValue
 * @returns {boolean}
 */
function getBoolSetting(settings, key, defaultValue) {
	if (!settings || !(key in settings)) return defaultValue;
	var value = unwrapSettingValue(settings[key]);
	if (value === 'false' || value === '0' || value === 0) return false;
	if (value === 'true' || value === '1' || value === 1) return true;
	return !!value;
}

/**
 * Parse a string setting with a default fallback.
 *
 * @param   {Object} settings
 * @param   {string} key
 * @param   {string} defaultValue
 * @returns {string}
 */
function getStringSetting(settings, key, defaultValue) {
	if (!settings || !(key in settings)) return defaultValue;
	var value = unwrapSettingValue(settings[key]);
	if (value === null || value === undefined) return defaultValue;
	return String(value);
}

/**
 * Parse a static location from Clay settings.
 * Returns null when static mode is off or values are invalid.
 *
 * @param   {Object=} settings
 * @returns {{lat:number,lon:number}|null}
 */
function getStaticLocation(settings) {
	var allSettings = settings || readClaySettings();
	if (!getBoolSetting(allSettings, 'SETTING_USE_STATIC_LOCATION', false)) {
		return null;
	}

	var lat = parseFloat(getStringSetting(allSettings, 'SETTING_STATIC_LAT', ''));
	var lon = parseFloat(getStringSetting(allSettings, 'SETTING_STATIC_LON', ''));

	if (!isFinite(lat) || !isFinite(lon)) return null;
	if (lat < -90 || lat > 90) return null;
	if (lon < -180 || lon > 180) return null;

	return { lat: lat, lon: lon };
}

/**
 * Round a coordinate for cache matching.
 *
 * @param   {number} value
 * @returns {number}
 */
function roundCoord(value) {
	return parseFloat(Number(value).toFixed(GEONAME_COORD_PRECISION));
}

/**
 * Return true when coordinates match at configured precision.
 *
 * @param   {number} latA
 * @param   {number} lonA
 * @param   {number} latB
 * @param   {number} lonB
 * @returns {boolean}
 */
function coordsMatchRounded(latA, lonA, latB, lonB) {
	return roundCoord(latA) === roundCoord(latB) &&
		roundCoord(lonA) === roundCoord(lonB);
}

/**
 * Read geocode name cache.
 *
 * @returns {{lat:number,lon:number,name:string,fetchedAt:number,static:boolean}|null}
 */
function readGeonameCache() {
	try {
		var raw = localStorage.getItem(GEONAME_CACHE_KEY);
		if (!raw) return null;
		var obj = JSON.parse(raw);
		if (!obj || typeof obj.name !== 'string') return null;
		if (!isFinite(obj.lat) || !isFinite(obj.lon)) return null;
		if (!isFinite(obj.fetchedAt)) return null;
		obj.static = !!obj.static;
		return obj;
	} catch (e) {
		return null;
	}
}

/**
 * Persist geocode name cache entry.
 *
 * @param {number}  lat
 * @param {number}  lon
 * @param {string}  name
 * @param {boolean} isStatic
 */
function writeGeonameCache(lat, lon, name, isStatic) {
	try {
		localStorage.setItem(GEONAME_CACHE_KEY, JSON.stringify({
			lat: lat,
			lon: lon,
			name: name,
			fetchedAt: Date.now(),
			static: !!isStatic,
		}));
	} catch (e) { }
}

/**
 * Return cached geocode name when valid for the current mode and coordinates.
 *
 * @param   {number}  lat
 * @param   {number}  lon
 * @param   {boolean} isStatic
 * @returns {string|null}
 */
function getCachedGeoname(lat, lon, isStatic) {
	var cache = readGeonameCache();
	if (!cache) return null;

	if (!coordsMatchRounded(lat, lon, cache.lat, cache.lon)) {
		return null;
	}

	if (isStatic && cache.static) {
		return cache.name;
	}

	if (Date.now() - cache.fetchedAt <= GEONAME_TTL_MS) {
		return cache.name;
	}

	return null;
}

/**
 * Extract last-known coordinates from weather cache payload.
 *
 * @returns {{lat:number,lon:number}|null}
 */
function getLastKnownCoordsFromCache() {
	var cache = readCache();
	if (!cache || !cache.payload) return null;
	var lat = cache.payload.lat;
	var lon = cache.payload.lon;
	if (!isFinite(lat) || !isFinite(lon)) return null;
	return { lat: lat, lon: lon };
}

/**
 * Maps a WMO weather code to a short condition string (informational only).
 *
 * @param   {number} code  WMO weather interpretation code.
 * @returns {string}       Short condition label e.g. 'Clear', 'Rain', 'Snow'.
 */
function conditionFromCode(code) {
	if (code === 0) return 'Clear';
	if (code <= 2) return 'Partly Cloudy';
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
 * Pack up to hourlyCount values into a clamped uint8 array for AppMessage transport.
 *
 * @param   {number[]} values  Input values; missing entries default to 0.
 * @returns {number[]}         hourlyCount-element array with values clamped to [0, 255].
 */
function packUint8Array(values, hourlyCount) {
	var arr = [];
	for (var i = 0; i < hourlyCount; i++) {
		arr.push(Math.min(255, Math.max(0, Math.round(values[i] || 0))));
	}
	return arr;
}

/**
 * Pack up to hourlyCount values into a clamped int8 array (two's complement) for AppMessage transport.
 *
 * @param   {number[]} values  Input values; missing entries default to 0.
 * @returns {number[]}         hourlyCount-element array clamped to [-128, 127], encoded as unsigned bytes.
 */
function packInt8Array(values, hourlyCount) {
	var arr = [];
	for (var i = 0; i < hourlyCount; i++) {
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
	var ttlMs = getFetchIntervalMin() * 60 * 1000 - CACHE_TTL_MARGIN_MS;
	if (ttlMs < 60 * 1000) ttlMs = 60 * 1000;
	try {
		localStorage.setItem(CACHE_KEY, JSON.stringify({
			expiresAt: Date.now() + ttlMs,
			payload: payload
		}));
	} catch (e) { }
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
	var hourlyCount = FORECAST_HOURS;

	var precipProb = (payload.precip_prob || []).slice(0, hourlyCount);
	var tempHourly = (payload.temp_hourly || []).slice(0, hourlyCount);
	var apparentHourly = (payload.apparent_temp_hourly || []).slice(0, hourlyCount);
	var cloudCover = (payload.cloud_cover || []).slice(0, hourlyCount);
	var hourlyCode = (payload.hourly_weather_code || []).slice(0, hourlyCount);

	while (precipProb.length < hourlyCount) precipProb.push(0);
	while (tempHourly.length < hourlyCount) tempHourly.push(0);
	while (apparentHourly.length < hourlyCount) apparentHourly.push(0);
	while (cloudCover.length < hourlyCount) cloudCover.push(0);
	while (hourlyCode.length < hourlyCount) hourlyCode.push(0);

	// 0 = celsius, 1 = fahrenheit  (matches settings.c convention)
	var tempUnitFlag = (payload.temp_unit === 'fahrenheit') ? 1 : 0;
	var cityName = (payload.city_name === null || payload.city_name === undefined)
		? ''
		: String(payload.city_name);
	if (cityName === 'Unknown') cityName = '';

	var dict = {
		'WEATHER_PRECIP_PROB': packUint8Array(precipProb, hourlyCount),
		'WEATHER_TEMP_HOURLY': packInt8Array(tempHourly, hourlyCount),
		'WEATHER_APPARENT_TEMP_HOURLY': packInt8Array(apparentHourly, hourlyCount),
		'WEATHER_CLOUD_COVER': packUint8Array(cloudCover, hourlyCount),
		'WEATHER_HOURLY_CODE': packUint8Array(hourlyCode, hourlyCount),
		'CITY_NAME': cityName.substring(0, 23),
		'SETTING_TEMP_UNIT': tempUnitFlag,
	};

	// Scalar weather fields are only included when the value is actually present;
	// omitting a key is the AppMessage equivalent of null.
	if (payload.current_temp != null) dict['WEATHER_TEMP'] = Math.round(payload.current_temp);
	if (payload.high_temp != null) dict['WEATHER_TEMP_HIGH'] = Math.round(payload.high_temp);
	if (payload.low_temp != null) dict['WEATHER_TEMP_LOW'] = Math.round(payload.low_temp);
	if (payload.weather_code != null) dict['WEATHER_CODE'] = payload.weather_code;
	if (payload.sunrise_hour != null) dict['WEATHER_SUNRISE_HOUR'] = payload.sunrise_hour;
	if (payload.sunset_hour != null) dict['WEATHER_SUNSET_HOUR'] = payload.sunset_hour;
	if (payload.fetch_time != null) dict['WEATHER_FETCH_TIME'] = Math.floor(payload.fetch_time);

	var nowMs = Date.now();
	var signature = JSON.stringify(dict);
	if (s_lastSentAt > 0 && nowMs - s_lastSentAt < SEND_DEDUPE_WINDOW_MS &&
		signature === s_lastSentSignature) {
		eventLog.aggregate('dedupe_send', 'ms=' + (nowMs - s_lastSentAt));
		return;
	}
	s_lastSentAt = nowMs;
	s_lastSentSignature = signature;

	sendToWatchWithRetry(dict);
}

/**
 * Fetch fresh weather and city name in parallel, then send to watch.
 *
 * @param {number} lat  Device latitude in decimal degrees.
 * @param {number} lon  Device longitude in decimal degrees.
 */
function fetchAndSend(lat, lon, isStaticLocation) {
	var weatherDone = false;
	var cityDone = false;
	var weatherOk = false;
	var payload = {};
	var settings = readClaySettings();
	var geocodeEnabled = getBoolSetting(settings, 'SETTING_GEOCODE_ENABLED', true);
	var locationOverride = getStringSetting(settings, 'SETTING_LOCATION_OVERRIDE', '');
	var cachedGeoname;

	var tempUnit = getTempUnit();
	payload.temp_unit = tempUnit;
	payload.lat = lat;
	payload.lon = lon;

	function tryFinish() {
		if (!weatherDone || !cityDone) return;

		if (!weatherOk) {
			// Weather fetch/parse failed; fall back to stale cache so the watch
			// doesn't receive zeroed-out data.
			var stale = readCache();
			if (stale && stale.payload) {
				console.log('Carbon: weather failed, using stale cache');
				eventLog.log('stale_send', 'cache_fallback');
				s_fetchStartedAt = 0;
				sendToWatch(stale.payload);
			} else {
				console.log('Carbon: weather failed, no cache — not sending');
				s_fetchStartedAt = 0;
			}
			return;
		}

		s_fetchStartedAt = 0;
		writeCache(payload);
		sendToWatch(payload);
	}

	// Open-Meteo weather — forecast_hours=FORECAST_HOURS returns hourly entries
	// starting from the current hour; timeformat=unixtime for sunrise/sunset
	var weatherUrl = WEATHER_BASE_URL +
		'?latitude=' + lat +
		'&longitude=' + lon +
		'&current=temperature_2m,weather_code' +
		'&hourly=precipitation_probability,temperature_2m,apparent_temperature,cloud_cover,weather_code' +
		'&forecast_hours=' + FORECAST_HOURS +
		'&daily=sunrise,sunset,temperature_2m_min,temperature_2m_max' +
		'&forecast_days=1' +
		'&temperature_unit=' + tempUnit +
		'&timeformat=unixtime' +
		'&timezone=auto';

	retryXhr(weatherUrl, WEATHER_RETRY_ATTEMPTS,
		WEATHER_RETRY_BASE_DELAY_MS, 'weather fetch',
		function (err, responseText, weatherJson) {
			if (err) {
				eventLog.log('wx_fail', 'xhr err=' + err);
				console.log('Carbon: weather fetch error: ' + err);
				weatherDone = true;
				tryFinish();
				return;
			}
			try {
				var json = weatherJson || JSON.parse(responseText);
				var cur = json.current;
				var hrly = json.hourly;
				var dly = json.daily;

				payload.current_temp = cur.temperature_2m;
				payload.weather_code = cur.weather_code;
				payload.high_temp = dly && dly.temperature_2m_max ? dly.temperature_2m_max[0] : cur.temperature_2m;
				payload.low_temp = dly && dly.temperature_2m_min ? dly.temperature_2m_min[0] : cur.temperature_2m;

				// Sunrise/sunset are Unix timestamps with timeformat=unixtime
				payload.sunrise_hour = dly && dly.sunrise ? extractHourFromUnix(dly.sunrise[0]) : 6;
				payload.sunset_hour = dly && dly.sunset ? extractHourFromUnix(dly.sunset[0]) : 20;

				// forecast_hours=FORECAST_HOURS returns entries starting from now
				if (hrly) {
					payload.precip_prob = hrly.precipitation_probability || [];
					payload.temp_hourly = hrly.temperature_2m || [];
					payload.apparent_temp_hourly = hrly.apparent_temperature || [];
					payload.cloud_cover = hrly.cloud_cover || [];
					payload.hourly_weather_code = hrly.weather_code || [];
				}

				// Record the real origin time so the watch can compute how many
				// hourly slots are already in the past when serving from cache.
				payload.fetch_time = Math.floor(Date.now() / 1000);
				weatherOk = true;
				eventLog.log('wx_ok', 'parsed');
			} catch (e) {
				eventLog.log('wx_fail', 'parse err=' + e);
				console.log('Carbon: weather parse error: ' + e);
			}
			weatherDone = true;
			tryFinish();
		}, {
		retry: 'wx_retry',
	}, function validateWeatherResponse(responseText) {
		var parsed = JSON.parse(responseText);
		if (!parsed || !parsed.current || !parsed.hourly) {
			return 'invalid weather payload';
		}
		return parsed;
	});

	if (!geocodeEnabled) {
		payload.city_name = locationOverride;
		cityDone = true;
		tryFinish();
		return;
	}

	cachedGeoname = getCachedGeoname(lat, lon, !!isStaticLocation);
	if (cachedGeoname) {
		eventLog.log('geo_cache', 'name_hit');
		payload.city_name = cachedGeoname;
		cityDone = true;
		tryFinish();
		return;
	}

	// BigDataCloud reverse geocode for city name
	var localityLanguage = getLocalityLanguage();
	var geocodeUrl = GEOCODE_BASE_URL +
		'?latitude=' + lat +
		'&longitude=' + lon +
		'&localityLanguage=' + encodeURIComponent(localityLanguage);

	retryXhr(geocodeUrl, GEOCODE_RETRY_ATTEMPTS,
		GEOCODE_RETRY_BASE_DELAY_MS, 'geocode fetch',
		function (err, responseText) {
			if (err) {
				console.log('Carbon: geocode error: ' + err);
				payload.city_name = '';
				cityDone = true;
				tryFinish();
				return;
			}
			try {
				var json = JSON.parse(responseText);
				payload.city_name =
					(json && (json.locality || json.city || json.principalSubdivision)) ||
					'';
				writeGeonameCache(lat, lon, payload.city_name, !!isStaticLocation);
			} catch (e) {
				payload.city_name = '';
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
	var nowMs = Date.now();
	if (s_lastHandledAt > 0 && nowMs - s_lastHandledAt < REQ_DEDUPE_WINDOW_MS) {
		return 'dedupe_req';
	}
	// Timestamp moves only on handled calls so bursts cannot self-starve.
	s_lastHandledAt = nowMs;

	var settings = readClaySettings();

	// Check cache first
	var cache = readCache();
	if (cache && cache.expiresAt > Date.now()) {
		console.log('Carbon: using cached weather');
		eventLog.log('cache_hit', 'ttl=' + (cache.expiresAt - Date.now()));
		// Re-evaluate unit in case locale changed; re-fetch if unit differs
		var cachedUnit = cache.payload && cache.payload.temp_unit;
		if (cachedUnit && cachedUnit === getTempUnit()) {
			sendToWatch(cache.payload);
			return;
		}
		console.log('Carbon: temp unit changed, refreshing weather');
	}

	// Layer 1 guard; later dedupe layers catch slow-cycle late arrivals.
	if (s_fetchStartedAt > 0 &&
		nowMs - s_fetchStartedAt < FETCH_DEDUPE_WINDOW_MS) {
		eventLog.aggregate('dedupe_fetch', 'ms=' + (nowMs - s_fetchStartedAt));
		return;
	}
	s_fetchStartedAt = nowMs;

	var staticLocation = getStaticLocation(settings);
	if (staticLocation) {
		eventLog.log('geo_static',
			'lat=' + staticLocation.lat.toFixed(4) +
			' lon=' + staticLocation.lon.toFixed(4));
		fetchAndSend(staticLocation.lat, staticLocation.lon, true);
		return;
	}

	navigator.geolocation.getCurrentPosition(
		function (pos) {
			eventLog.log('geo_ok',
				'lat=' + pos.coords.latitude.toFixed(4) +
				' lon=' + pos.coords.longitude.toFixed(4));
			fetchAndSend(pos.coords.latitude, pos.coords.longitude, false);
		},
		function (err) {
			s_fetchStartedAt = 0;
			eventLog.log('geo_fail', (err && err.message) ? err.message : 'unknown');
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

/**
 * Build a debug snapshot for the Clay config page.
 * Returns a plain object whose keys become collapsible sections in the
 * debug-info component; values are serialised as JSON in the display.
 *
 * @returns {Object}
 */
function formatDebugInfo() {
	var result = {
		buildInfo,
	};
	function mapLogEntries(entries) {
		return entries.map(function (entry) {
			var ts = entry && typeof entry.t === 'number' ? entry.t : null;
			var tsEnd = entry && typeof entry.tn === 'number' ? entry.tn : null;
			return {
				t: ts,
				iso: ts ? new Date(ts).toISOString() : null,
				tn: tsEnd,
				isoEnd: tsEnd ? new Date(tsEnd).toISOString() : null,
				e: entry ? entry.e : null,
				d: entry ? entry.d : null,
				n: entry && typeof entry.n === 'number' ? entry.n : null,
			};
		});
	}
	try {
		var rawCache = localStorage.getItem(CACHE_KEY);
		result.cache = rawCache ? JSON.parse(rawCache) : null;
	} catch (e) {
		result.cache = null;
	}
	try {
		var rawSettings = localStorage.getItem('clay-settings');
		result.settings = rawSettings ? JSON.parse(rawSettings) : null;
	} catch (e) {
		result.settings = null;
	}
	try {
		var logData = eventLog.read();
		result.eventLog = {
			current: mapLogEntries(logData.current || []),
			previous: mapLogEntries(logData.previous || []),
		};
	} catch (e) {
		result.eventLog = { current: [], previous: [] };
	}
	return result;
}

//
// Event listeners
//

Pebble.addEventListener('ready', function () {
	console.log('Carbon: PebbleKit JS ready');
	eventLog.log('ready', 'pkjs_ready');
	if (getWeather() === 'dedupe_req') {
		eventLog.aggregate('dedupe_req', 'ready');
	}
});

Pebble.addEventListener('showConfiguration', function () {
	var userData = clay.meta.userData || {};
	var lastKnown = getLastKnownCoordsFromCache();

	userData.debugInfo = formatDebugInfo();
	if (lastKnown) {
		userData.lastKnownLat = Number(lastKnown.lat.toFixed(4));
		userData.lastKnownLon = Number(lastKnown.lon.toFixed(4));
	} else {
		delete userData.lastKnownLat;
		delete userData.lastKnownLon;
	}

	clay.meta.userData = userData;
	Pebble.openURL(clay.generateUrl());
});

Pebble.addEventListener('webviewclosed', function (e) {
	if (!e.response) return;
	var oldSettings = readClaySettings();

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

	/**
	 * Extract a boolean toggle from a raw Clay setting value as 1/0.
	 * With convert=false, Clay wraps toggle values in an object
	 * ({value:false}); the object itself is always truthy, so we must
	 * unwrap .value before testing it. Returns null if the setting is absent.
	 *
	 * @param   {boolean|string|{value:boolean}} setting
	 * @returns {number|null}  1 (on), 0 (off), or null if unset.
	 */
	function extractBool(setting) {
		if (setting === null || setting === undefined) return null;
		var v = (typeof setting === 'object' && 'value' in setting)
			? setting.value : setting;
		// Guard against the string "false", which is truthy in JS.
		if (v === 'false' || v === '0') return 0;
		return v ? 1 : 0;
	}

	/**
	 * Extract a string value from a raw Clay setting.
	 *
	 * @param   {string|{value:string}} setting
	 * @returns {string}
	 */
	function extractString(setting) {
		if (setting === null || setting === undefined) return '';
		var v = (typeof setting === 'object' && 'value' in setting)
			? setting.value : setting;
		return String(v);
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

	var fetchInterval = extractInt(rawSettings['SETTING_FETCH_INTERVAL']);
	if (fetchInterval === 15 || fetchInterval === 30 || fetchInterval === 60) {
		dict['SETTING_FETCH_INTERVAL'] = fetchInterval;
	}

	var showTimezone = extractBool(rawSettings['SETTING_SHOW_TIMEZONE']);
	if (showTimezone !== null) dict['SETTING_SHOW_TIMEZONE'] = showTimezone;

	var showAmpm = extractBool(rawSettings['SETTING_SHOW_AMPM']);
	if (showAmpm !== null) dict['SETTING_SHOW_AMPM'] = showAmpm;

	var bigTime = extractBool(rawSettings['SETTING_BIG_TIME']);
	if (bigTime !== null) dict['SETTING_BIG_TIME'] = bigTime;

	var clearCacheRequested = extractBool(rawSettings['SETTING_CLEAR_CACHE']) === 1;

	Pebble.sendAppMessage(dict,
		function () { console.log('Carbon: settings sent to watch'); },
		function (err) { console.log('Carbon: settings send failed: ' + JSON.stringify(err)); }
	);

	var newSettings = readClaySettings();
	if (clearCacheRequested) {
		localStorage.removeItem(CACHE_KEY);
		localStorage.removeItem(GEONAME_CACHE_KEY);
		eventLog.log('cache_cleared', 'via_settings');

		try {
			newSettings['SETTING_CLEAR_CACHE'] = false;
			localStorage.setItem('clay-settings', JSON.stringify(newSettings));
		} catch (err) { }
	}

	var geocodeEnabledChanged =
		getBoolSetting(oldSettings, 'SETTING_GEOCODE_ENABLED', true) !==
		getBoolSetting(newSettings, 'SETTING_GEOCODE_ENABLED', true);
	var locationOverrideChanged =
		getStringSetting(oldSettings, 'SETTING_LOCATION_OVERRIDE', '') !==
		getStringSetting(newSettings, 'SETTING_LOCATION_OVERRIDE', '');
	var useStaticChanged =
		getBoolSetting(oldSettings, 'SETTING_USE_STATIC_LOCATION', false) !==
		getBoolSetting(newSettings, 'SETTING_USE_STATIC_LOCATION', false);
	var staticLatChanged =
		extractString(oldSettings['SETTING_STATIC_LAT']) !==
		extractString(newSettings['SETTING_STATIC_LAT']);
	var staticLonChanged =
		extractString(oldSettings['SETTING_STATIC_LON']) !==
		extractString(newSettings['SETTING_STATIC_LON']);

	if (geocodeEnabledChanged || locationOverrideChanged || useStaticChanged ||
		staticLatChanged || staticLonChanged) {
		localStorage.removeItem(CACHE_KEY);
	}
	if (staticLatChanged || staticLonChanged) {
		localStorage.removeItem(GEONAME_CACHE_KEY);
	}

	if (clearCacheRequested) {
		// Clear-cache should force a refresh even in dedupe windows.
		s_lastHandledAt = 0;
		s_fetchStartedAt = 0;
	}

	// Refresh weather in case settings changed.
	if (getWeather() === 'dedupe_req') {
		eventLog.aggregate('dedupe_req', 'config');
	}
});

Pebble.addEventListener('appmessage', function (e) {
	if (e.payload && e.payload['WEATHER_REQUEST'] !== undefined) {
		var seq = e.payload['WEATHER_REQUEST'];
		var dropReason = getWeather();
		if (dropReason === 'dedupe_req') {
			eventLog.aggregate('dedupe_req', 'seq=' + seq);
			return;
		}
		eventLog.log('req', 'seq=' + seq);
		console.log('Carbon: weather refresh requested');
	}
});
