/**
 * Carbon — PebbleKit JS phone-side script
 *
 * 1. Gets device GPS location
 * 2. In parallel: fetches Open-Meteo weather + BigDataCloud reverse geocode
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
	APP_REPO_URL,
	CACHE_KEY,
	CACHE_TTL_MS,
	GEOCODE_CACHE_KEY,
	GEOCODE_CACHE_TTL_MS,
	GEOCODE_PRECISION,
	SERVICE_CACHE_KEY,
	SERVICE_ENABLED_TTL_MS,
	SERVICE_DISABLED_TTL_MS,
	SERVICE_FAIL_TTL_MS,
	SERVICE_STATUS_URL,
	DISABLE_REMOTE_SERVICES,
	BIGDATACLOUD_SERVICE_KEY,
	OPENMETEO_SERVICE_KEY,
} = require('./constants');

var localServicesSnapshot = require('../../services.json');

var buildInfo = require('../../.buildinfo.json');

var Clay = require('@rebble/clay');
var clayConfig = require('./config');
var clayCustomFn = require('./config/custom');
var clay = new Clay(clayConfig, clayCustomFn, { autoHandleEvents: false });
clay.registerComponent(require('./config/components/debug'));
clay.registerComponent(require('./config/components/service-notice'));

/**
 * Make a GET request.
 *
 * Non-2xx HTTP responses are reported as errors so callers never try to
 * parse error pages (e.g. rate-limit or block responses) as data.
 *
 * @param {string}   url      URL to fetch.
 * @param {Function} callback Called with (err, responseText) on completion.
 */
function xhrGet(url, callback) {
	var xhr = new XMLHttpRequest();
	xhr.onload = function () {
		if (this.status >= 200 && this.status < 300) {
			callback(null, this.responseText);
		} else {
			callback('HTTP ' + this.status + ' for ' + url);
		}
	};
	xhr.onerror = function () {
		callback('XHR error for ' + url);
	};
	xhr.open('GET', url);
	xhr.send();
}

/**
 * Unwrap a raw Clay setting value. With convert=false, Clay may store values
 * either bare or wrapped in an object ({value: …}).
 *
 * @param   {*} v
 * @returns {*}
 */
function unwrapClaySetting(v) {
	return (v !== null && typeof v === 'object' && 'value' in v) ? v.value : v;
}

/**
 * Read the location display settings from stored Clay settings.
 *
 * When geocodeEnabled is true the detected city name is used and the
 * override is ignored. When false, the override text is used as-is,
 * including blank, which means "show no location".
 *
 * @returns {{geocodeEnabled: boolean, override: string}}
 */
function getLocationSettings() {
	var geocodeEnabled = true;
	var override = '';
	try {
		var raw = localStorage.getItem('clay-settings');
		if (raw) {
			var s = JSON.parse(raw);
			var enabled = unwrapClaySetting(s.SETTING_GEOCODE_ENABLED);
			if (enabled === false || enabled === 'false' || enabled === 0 || enabled === '0') {
				geocodeEnabled = false;
			}
			var text = unwrapClaySetting(s.SETTING_LOCATION_OVERRIDE);
			if (typeof text === 'string') override = text.trim();
		}
	} catch (e) { }
	return { geocodeEnabled: geocodeEnabled, override: override };
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
	} catch (e) { }
}

/**
 * Return the service status for a key from the bundled local services.json
 * snapshot. A key absent from the snapshot is treated as disabled.
 *
 * @param   {string} serviceKey
 * @returns {{enabled: boolean, message: string|null}}
 */
function serviceFromLocalSnapshot(serviceKey) {
	try {
		var svc = localServicesSnapshot[serviceKey];
		if (!svc) return { enabled: false, message: null };
		var enabled = svc.enabled !== false;
		return { enabled: enabled, message: (!enabled && svc.message) || null };
	} catch (e) {
		return { enabled: false, message: null };
	}
}

/**
 * Pending checkServiceEnabled callbacks awaiting a single in-flight fetch of
 * services.json, or null when no fetch is in flight. Coalescing avoids multiple
 * GitHub requests when the weather and geocode checks both miss the cache
 * at the same moment.
 */
var serviceCheckQueue = null;

/**
 * Check whether a service is enabled via services.json.
 *
 * Lookup order on every call:
 *  1. localStorage cache (SERVICE_CACHE_KEY) — return immediately if unexpired
 *  2. If DISABLE_REMOTE_SERVICES is set, use the bundled local snapshot
 *  3. Fetch the remote services.json (SERVICE_STATUS_URL); concurrent checks
 *     share a single fetch
 *     - Success: update cache for all services; TTLs can be overridden in the
 *       remote file's "config" object
 *     - Parse/network failure: answer from the bundled local snapshot and
 *       cache that same answer with a short fail TTL so we retry soon
 *
 * A service key absent from the JSON is treated as disabled (not OK).
 *
 * @param {string}   serviceKey  Key in services.json (e.g. 'bigdatacloud').
 * @param {Function} callback    Called with (enabled, message|null).
 */
function checkServiceEnabled(serviceKey, callback) {
	var now = Date.now();

	try {
		var raw = localStorage.getItem(SERVICE_CACHE_KEY);
		var cache = raw ? JSON.parse(raw) : {};
		var entry = cache[serviceKey];
		if (entry && entry.expiresAt > now) {
			callback(entry.enabled, entry.message || null);
			return;
		}
	} catch (e) { }

	if (DISABLE_REMOTE_SERVICES) {
		var local = serviceFromLocalSnapshot(serviceKey);
		callback(local.enabled, local.message);
		return;
	}

	if (serviceCheckQueue) {
		serviceCheckQueue.push({ key: serviceKey, cb: callback });
		return;
	}
	serviceCheckQueue = [{ key: serviceKey, cb: callback }];

	xhrGet(SERVICE_STATUS_URL, function (err, responseText) {
		var queue = serviceCheckQueue || [];
		serviceCheckQueue = null;
		now = Date.now();

		var services;
		if (!err) {
			try {
				services = JSON.parse(responseText);
			} catch (e) {
				console.log('Carbon: services status parse error');
			}
		} else {
			console.log('Carbon: services status fetch failed: ' + err);
		}

		var i, item;

		if (!services) {
			// Remote failed — answer every waiting caller from the bundled
			// local snapshot and cache that same answer with a short fail TTL
			// so cache and callback agree and we retry soon.
			try {
				var fc = JSON.parse(localStorage.getItem(SERVICE_CACHE_KEY) || '{}');
				for (i = 0; i < queue.length; i++) {
					var snap = serviceFromLocalSnapshot(queue[i].key);
					fc[queue[i].key] = {
						enabled: snap.enabled,
						message: snap.message,
						expiresAt: now + SERVICE_FAIL_TTL_MS,
					};
				}
				localStorage.setItem(SERVICE_CACHE_KEY, JSON.stringify(fc));
			} catch (e) { }
			for (i = 0; i < queue.length; i++) {
				item = queue[i];
				var fallback = serviceFromLocalSnapshot(item.key);
				item.cb(fallback.enabled, fallback.message);
			}
			return;
		}

		// Derive TTLs: per-service values > global config block > compiled constants
		var globalCfg = services.config || {};
		var globalEnabledTtl = (typeof globalCfg.ttl_enabled_ms === 'number' && globalCfg.ttl_enabled_ms > 0) ? globalCfg.ttl_enabled_ms : SERVICE_ENABLED_TTL_MS;
		var globalDisabledTtl = (typeof globalCfg.ttl_disabled_ms === 'number' && globalCfg.ttl_disabled_ms > 0) ? globalCfg.ttl_disabled_ms : SERVICE_DISABLED_TTL_MS;

		// Update the cache for every service entry in the response
		try {
			var sc = JSON.parse(localStorage.getItem(SERVICE_CACHE_KEY) || '{}');
			var keys = Object.keys(services);
			for (i = 0; i < keys.length; i++) {
				var k = keys[i];
				if (k === 'config') continue;
				var svc = services[k];
				var enabled = !!(svc && svc.enabled !== false);
				var msg = (svc && svc.message) || null;
				var svcEnabledTtl = (svc && typeof svc.ttl_enabled_ms === 'number' && svc.ttl_enabled_ms > 0) ? svc.ttl_enabled_ms : globalEnabledTtl;
				var svcDisabledTtl = (svc && typeof svc.ttl_disabled_ms === 'number' && svc.ttl_disabled_ms > 0) ? svc.ttl_disabled_ms : globalDisabledTtl;
				sc[k] = {
					enabled: enabled,
					message: msg,
					expiresAt: now + (enabled ? svcEnabledTtl : svcDisabledTtl),
				};
			}
			localStorage.setItem(SERVICE_CACHE_KEY, JSON.stringify(sc));
		} catch (e) { }

		// A key absent from the response is treated as disabled
		for (i = 0; i < queue.length; i++) {
			item = queue[i];
			var result = services[item.key];
			if (!result) {
				item.cb(false, null);
				continue;
			}
			var svcEnabled = result.enabled !== false;
			item.cb(svcEnabled, (!svcEnabled && result.message) || null);
		}
	});
}

/**
 * Round lat/lon to GEOCODE_PRECISION decimal places and return a string key.
 *
 * @param   {number} lat
 * @param   {number} lon
 * @returns {string}
 */
function geocodeCacheKey(lat, lon) {
	return lat.toFixed(GEOCODE_PRECISION) + ',' + lon.toFixed(GEOCODE_PRECISION);
}

/**
 * Read a cached city name for the given lat/lon, or null if absent/expired.
 *
 * @param   {number} lat
 * @param   {number} lon
 * @returns {string|null}
 */
function readGeocodeCache(lat, lon) {
	try {
		var raw = localStorage.getItem(GEOCODE_CACHE_KEY);
		if (!raw) return null;
		var cache = JSON.parse(raw);
		if (!cache) return null;
		var entry = cache[geocodeCacheKey(lat, lon)];
		if (!entry || !entry.city || entry.expiresAt < Date.now()) return null;
		return entry.city;
	} catch (e) {
		return null;
	}
}

/**
 * Persist a geocoded city name keyed by rounded lat/lon.
 * Expired entries are pruned on each write.
 *
 * @param {number} lat
 * @param {number} lon
 * @param {string} city
 */
function writeGeocodeCache(lat, lon, city) {
	try {
		var raw = localStorage.getItem(GEOCODE_CACHE_KEY);
		var cache = raw ? JSON.parse(raw) : {};
		var now = Date.now();
		var keys = Object.keys(cache);
		for (var i = 0; i < keys.length; i++) {
			if (cache[keys[i]].expiresAt < now) delete cache[keys[i]];
		}
		cache[geocodeCacheKey(lat, lon)] = {
			city: city,
			expiresAt: now + GEOCODE_CACHE_TTL_MS,
		};
		localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cache));
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
	var hourlyCount = 24;

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

	// Resolve the displayed location at send time so a settings change takes
	// effect immediately, even when serving a cached payload. Detection ON:
	// detected city; detection OFF: custom text (blank = no location).
	var loc = getLocationSettings();
	var cityName = loc.geocodeEnabled
		? (payload.city_name || '')
		: loc.override;

	var dict = {
		'WEATHER_PRECIP_PROB': packUint8Array(precipProb),
		'WEATHER_TEMP_HOURLY': packInt8Array(tempHourly),
		'WEATHER_APPARENT_TEMP_HOURLY': packInt8Array(apparentHourly),
		'WEATHER_CLOUD_COVER': packUint8Array(cloudCover),
		'WEATHER_HOURLY_CODE': packUint8Array(hourlyCode),
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

	Pebble.sendAppMessage(dict,
		function () { console.log('Carbon: weather sent to watch'); },
		function (e) { console.log('Carbon: sendAppMessage failed: ' + JSON.stringify(e)); }
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
	var cityDone = false;
	var weatherOk = false;
	var payload = {};

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
				sendToWatch(stale.payload);
			} else {
				console.log('Carbon: weather failed, no cache — not sending');
			}
			return;
		}

		writeCache(payload);
		sendToWatch(payload);
	}

	// Weather: check service status, then fetch from Open-Meteo
	checkServiceEnabled(OPENMETEO_SERVICE_KEY, function (enabled, disabledMsg) {
		if (!enabled) {
			console.log('Carbon: weather service disabled' + (disabledMsg ? ': ' + disabledMsg : ' (temporary)'));
			weatherDone = true;
			tryFinish();
			return;
		}

		// Open-Meteo weather — forecast_hours=24 returns exactly 24 hourly entries
		// starting from the current hour; timeformat=unixtime for sunrise/sunset
		var weatherUrl = WEATHER_BASE_URL +
			'?latitude=' + lat +
			'&longitude=' + lon +
			'&current=temperature_2m,weather_code' +
			'&hourly=precipitation_probability,temperature_2m,apparent_temperature,cloud_cover,weather_code' +
			'&forecast_hours=24' +
			'&daily=sunrise,sunset,temperature_2m_min,temperature_2m_max' +
			'&forecast_days=1' +
			'&temperature_unit=' + tempUnit +
			'&timeformat=unixtime' +
			'&timezone=auto';

		xhrGet(weatherUrl, function (err, responseText) {
			if (err) {
				console.log('Carbon: weather fetch error: ' + err);
				weatherDone = true;
				tryFinish();
				return;
			}
			try {
				var json = JSON.parse(responseText);
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

				// forecast_hours=24 returns exactly 24 entries starting from now
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
			} catch (e) {
				console.log('Carbon: weather parse error: ' + e);
			}
			weatherDone = true;
			tryFinish();
		});
	});

	// Geocode: skip entirely when the user disabled detection (the custom
	// text — even blank — is used instead); otherwise serve from local cache
	// if the location hasn't changed, then check service status and call
	// reverse geocoding API.
	var loc = getLocationSettings();
	var cachedCity = loc.geocodeEnabled ? readGeocodeCache(lat, lon) : null;
	if (!loc.geocodeEnabled) {
		payload.city_name = loc.override;
		cityDone = true;
		tryFinish();
	} else if (cachedCity) {
		console.log('Carbon: geocode cache hit: ' + cachedCity);
		payload.city_name = cachedCity;
		cityDone = true;
		tryFinish();
	} else {
		checkServiceEnabled(BIGDATACLOUD_SERVICE_KEY, function (enabled, disabledMsg) {
			if (!enabled) {
				console.log('Carbon: geocode service disabled' + (disabledMsg ? ': ' + disabledMsg : ' (temporary)'));
				payload.city_name = '';
				cityDone = true;
				tryFinish();
				return;
			}

			var geocodeUrl = GEOCODE_BASE_URL +
				'?latitude=' + lat + '&longitude=' + lon + '&localityLanguage=en';

			xhrGet(geocodeUrl, function (err, responseText) {
				if (err) {
					console.log('Carbon: geocode error: ' + err);
					payload.city_name = '';
					cityDone = true;
					tryFinish();
					return;
				}
				try {
					var json = JSON.parse(responseText);
					var city = json && (json.city || json.locality || json.principalSubdivision);
					if (city) {
						payload.city_name = city;
						writeGeocodeCache(lat, lon, city);
					} else {
						payload.city_name = '';
					}
				} catch (e) {
					payload.city_name = '';
				}
				cityDone = true;
				tryFinish();
			});
		});
	}
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
		function (pos) {
			fetchAndSend(pos.coords.latitude, pos.coords.longitude);
		},
		function (err) {
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
		if (DISABLE_REMOTE_SERVICES) {
			// Remote checks are compiled out — show the bundled snapshot that
			// is actually being consulted instead of the (unused) cache.
			result.services = {
				remote_disabled: true,
				snapshot: localServicesSnapshot,
			};
		} else {
			var rawServices = localStorage.getItem(SERVICE_CACHE_KEY);
			result.services = rawServices ? JSON.parse(rawServices) : null;
		}
	} catch (e) {
		result.services = null;
	}
	return result;
}

/**
 * Collect remotely-disabled services for display in the settings page
 * notice banner. Reads the unexpired service cache, or the bundled local
 * snapshot when remote checks are disabled at build time.
 *
 * @returns {Array<{service: string, label: string, message: string|null}>}
 */
function collectServiceNotices() {
	var labels = {};
	labels[BIGDATACLOUD_SERVICE_KEY] = 'Location lookup (BigDataCloud)';
	labels[OPENMETEO_SERVICE_KEY] = 'Weather (Open-Meteo)';

	var notices = [];

	if (DISABLE_REMOTE_SERVICES) {
		try {
			var snapKeys = Object.keys(localServicesSnapshot);
			for (var j = 0; j < snapKeys.length; j++) {
				var sk = snapKeys[j];
				if (sk === 'config') continue;
				var snap = localServicesSnapshot[sk];
				if (snap && snap.enabled === false) {
					notices.push({
						service: sk,
						label: labels[sk] || sk,
						message: snap.message || null,
					});
				}
			}
		} catch (e) { }
		return notices;
	}

	try {
		var raw = localStorage.getItem(SERVICE_CACHE_KEY);
		if (!raw) return notices;
		var cache = JSON.parse(raw);
		var now = Date.now();
		var keys = Object.keys(cache);
		for (var i = 0; i < keys.length; i++) {
			var entry = cache[keys[i]];
			if (entry && entry.enabled === false && entry.expiresAt > now) {
				notices.push({
					service: keys[i],
					label: labels[keys[i]] || keys[i],
					message: entry.message || null,
				});
			}
		}
	} catch (e) { }
	return notices;
}

//
// Event listeners
//

Pebble.addEventListener('ready', function () {
	console.log('Carbon: PebbleKit JS ready');
	getWeather();
});

Pebble.addEventListener('showConfiguration', function () {
	clay.meta.userData.debugInfo = formatDebugInfo();
	clay.meta.userData.serviceNotices = collectServiceNotices();
	clay.meta.userData.repoUrl = APP_REPO_URL;
	Pebble.openURL(clay.generateUrl());
});

Pebble.addEventListener('webviewclosed', function (e) {
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

	var showTimezone = extractBool(rawSettings['SETTING_SHOW_TIMEZONE']);
	if (showTimezone !== null) dict['SETTING_SHOW_TIMEZONE'] = showTimezone;

	var showAmpm = extractBool(rawSettings['SETTING_SHOW_AMPM']);
	if (showAmpm !== null) dict['SETTING_SHOW_AMPM'] = showAmpm;

	Pebble.sendAppMessage(dict,
		function () { console.log('Carbon: settings sent to watch'); },
		function (err) { console.log('Carbon: settings send failed: ' + JSON.stringify(err)); }
	);
	// Refresh weather in case the temperature unit changed
	getWeather();
});

Pebble.addEventListener('appmessage', function (e) {
	if (e.payload && e.payload['WEATHER_REQUEST']) {
		console.log('Carbon: weather refresh requested');
		getWeather();
	}
});
