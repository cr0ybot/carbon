/**
 * Carbon — PebbleKit JS phone-side script
 *
 * 1. Gets device GPS location
 * 2. In parallel: fetches Open-Meteo weather + ArcGIS reverse geocode
 * 3. Sends all data to the watch via AppMessage
 *
 * Uses XMLHttpRequest (fetch() is not available in PebbleKit JS).
 * Uses localStorage to cache weather between refreshes.
 */

var WEATHER_BASE_URL = 'https://api.open-meteo.com/v1/forecast';
var GEOCODE_BASE_URL = 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode';
var CACHE_KEY = 'carbon.weather.v2';
var CACHE_TTL_MS = 15 * 60 * 1000;  // 15 minutes

// ---------------------------------------------------------------------------
// XHR helper
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// WMO weather code → short condition string
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Byte-array helpers for hourly data
// ---------------------------------------------------------------------------

function packUint8Array(values) {
  var arr = [];
  for (var i = 0; i < 24; i++) {
    arr.push(Math.min(255, Math.max(0, Math.round(values[i] || 0))));
  }
  return arr;
}

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

// ---------------------------------------------------------------------------
// Sunrise/sunset hour extraction from ISO datetime string "2026-05-05T06:23"
// ---------------------------------------------------------------------------

function extractHour(isoStr) {
  if (!isoStr) return 6;
  var tIndex = isoStr.indexOf('T');
  if (tIndex < 0) return 6;
  return parseInt(isoStr.substring(tIndex + 1, tIndex + 3), 10) || 6;
}

// ---------------------------------------------------------------------------
// Cache helpers
// ---------------------------------------------------------------------------

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

function writeCache(payload) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      expiresAt: Date.now() + CACHE_TTL_MS,
      payload: payload
    }));
  } catch (e) {}
}

// ---------------------------------------------------------------------------
// Send payload to watch
// ---------------------------------------------------------------------------

function sendToWatch(payload) {
  var hourlyCount = 24;

  // Clamp hourly arrays to 24 entries
  var precipProb   = (payload.precip_prob   || []).slice(0, hourlyCount);
  var tempHourly   = (payload.temp_hourly   || []).slice(0, hourlyCount);
  var cloudCover   = (payload.cloud_cover   || []).slice(0, hourlyCount);

  while (precipProb.length < hourlyCount) precipProb.push(0);
  while (tempHourly.length < hourlyCount) tempHourly.push(0);
  while (cloudCover.length < hourlyCount) cloudCover.push(0);

  var dict = {
    'WEATHER_TEMP':         Math.round(payload.current_temp || 0),
    'WEATHER_TEMP_HIGH':    Math.round(payload.high_temp    || 0),
    'WEATHER_TEMP_LOW':     Math.round(payload.low_temp     || 0),
    'WEATHER_CODE':         payload.weather_code            || 0,
    'WEATHER_SUNRISE_HOUR': payload.sunrise_hour            || 6,
    'WEATHER_SUNSET_HOUR':  payload.sunset_hour             || 20,
    'WEATHER_PRECIP_PROB':  packUint8Array(precipProb),
    'WEATHER_TEMP_HOURLY':  packInt8Array(tempHourly),
    'WEATHER_CLOUD_COVER':  packUint8Array(cloudCover),
    'CITY_NAME':            (payload.city_name || 'Unknown').substring(0, 23),
  };

  Pebble.sendAppMessage(dict,
    function() { console.log('Carbon: weather sent to watch'); },
    function(e) { console.log('Carbon: sendAppMessage failed: ' + JSON.stringify(e)); }
  );
}

// ---------------------------------------------------------------------------
// Fetch weather + city, then send
// ---------------------------------------------------------------------------

function fetchAndSend(lat, lon) {
  var weatherDone = false;
  var cityDone    = false;
  var payload     = {};

  function tryFinish() {
    if (weatherDone && cityDone) {
      writeCache(payload);
      sendToWatch(payload);
    }
  }

  // Open-Meteo weather
  var weatherUrl = WEATHER_BASE_URL +
    '?latitude='  + lat +
    '&longitude=' + lon +
    '&current=temperature_2m,weather_code,cloud_cover' +
    '&hourly=temperature_2m,precipitation_probability,cloud_cover' +
    '&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset' +
    '&temperature_unit=celsius' +
    '&timezone=auto' +
    '&forecast_days=2';

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

      // Find the index in hourly that matches the current hour
      var nowIso = cur.time;  // e.g. "2026-05-05T14:00"
      var startIdx = 0;
      if (hrly && hrly.time) {
        for (var i = 0; i < hrly.time.length; i++) {
          if (hrly.time[i] === nowIso) { startIdx = i; break; }
        }
      }

      payload.current_temp  = cur.temperature_2m;
      payload.weather_code  = cur.weather_code;
      payload.high_temp     = dly && dly.temperature_2m_max ? dly.temperature_2m_max[0] : cur.temperature_2m;
      payload.low_temp      = dly && dly.temperature_2m_min ? dly.temperature_2m_min[0] : cur.temperature_2m;
      payload.sunrise_hour  = dly && dly.sunrise  ? extractHour(dly.sunrise[0])  : 6;
      payload.sunset_hour   = dly && dly.sunset   ? extractHour(dly.sunset[0])   : 20;

      // Slice 24 hours starting from current hour
      if (hrly) {
        payload.precip_prob  = (hrly.precipitation_probability || []).slice(startIdx, startIdx + 24);
        payload.temp_hourly  = (hrly.temperature_2m            || []).slice(startIdx, startIdx + 24);
        payload.cloud_cover  = (hrly.cloud_cover               || []).slice(startIdx, startIdx + 24);
      }
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

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

function getWeather() {
  // Check cache first
  var cache = readCache();
  if (cache && cache.expiresAt > Date.now()) {
    console.log('Carbon: using cached weather');
    sendToWatch(cache.payload);
    return;
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

Pebble.addEventListener('ready', function() {
  console.log('Carbon: PebbleKit JS ready');
  getWeather();
});

Pebble.addEventListener('appmessage', function(e) {
  if (e.payload && e.payload['WEATHER_REQUEST']) {
    console.log('Carbon: weather refresh requested');
    getWeather();
  }
});

