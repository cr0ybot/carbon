/**
 * Open-Meteo weather source (https://open-meteo.com) — the default,
 * worldwide-coverage weather provider. Free, keyless, and returns WMO
 * weather codes directly, so no condition-mapping layer is needed (compare
 * to dwd-weather.js's fetchDwdWeather, which has to translate Bright Sky's
 * icon/condition strings to a representative WMO code).
 *
 * @author    Kai Timmer
 * @copyright 2026 Kai Timmer
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://github.com/kaitimmer/dwd-carbon
 */

var {
	WEATHER_BASE_URL,
	FORECAST_HOURS,
	WEATHER_RETRY_ATTEMPTS,
	WEATHER_RETRY_BASE_DELAY_MS,
} = require('./constants');

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
 * Fetch current + hourly forecast weather from Open-Meteo and hand back
 * fields matching the shared weather-payload contract (see
 * dwd-weather.js's fetchDwdWeather for the counterpart).
 *
 * forecast_hours=FORECAST_HOURS returns hourly entries starting from the
 * current hour; timeformat=unixtime for sunrise/sunset.
 *
 * @param {number}   lat         Device latitude in decimal degrees.
 * @param {number}   lon         Device longitude in decimal degrees.
 * @param {'celsius'|'fahrenheit'} tempUnit
 * @param {Function} retryXhrFn  index.js's retryXhr(url, maxAttempts, baseDelayMs, label, callback, events, validate).
 * @param {Function} callback    Called with (err) or (null, fields).
 */
function fetchOpenMeteoWeather(lat, lon, tempUnit, retryXhrFn, callback) {
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

	retryXhrFn(weatherUrl, WEATHER_RETRY_ATTEMPTS,
		WEATHER_RETRY_BASE_DELAY_MS, 'weather fetch',
		function (err, responseText, weatherJson) {
			if (err) {
				callback(err);
				return;
			}
			try {
				var json = weatherJson || JSON.parse(responseText);
				var cur = json.current;
				var hrly = json.hourly;
				var dly = json.daily;
				var fields = {};

				fields.current_temp = cur.temperature_2m;
				fields.weather_code = cur.weather_code;
				fields.high_temp = dly && dly.temperature_2m_max ? dly.temperature_2m_max[0] : cur.temperature_2m;
				fields.low_temp = dly && dly.temperature_2m_min ? dly.temperature_2m_min[0] : cur.temperature_2m;

				// Sunrise/sunset are Unix timestamps with timeformat=unixtime
				fields.sunrise_hour = dly && dly.sunrise ? extractHourFromUnix(dly.sunrise[0]) : 6;
				fields.sunset_hour = dly && dly.sunset ? extractHourFromUnix(dly.sunset[0]) : 20;

				// forecast_hours=FORECAST_HOURS returns entries starting from now
				if (hrly) {
					fields.precip_prob = hrly.precipitation_probability || [];
					fields.temp_hourly = hrly.temperature_2m || [];
					fields.apparent_temp_hourly = hrly.apparent_temperature || [];
					fields.cloud_cover = hrly.cloud_cover || [];
					fields.hourly_weather_code = hrly.weather_code || [];
				}

				// Record the real origin time so the watch can compute how many
				// hourly slots are already in the past when serving from cache.
				fields.fetch_time = Math.floor(Date.now() / 1000);
				callback(null, fields);
			} catch (e) {
				callback('parse err=' + e);
			}
		}, {
		retry: 'wx_retry',
	}, function validateWeatherResponse(responseText) {
		var parsed = JSON.parse(responseText);
		if (!parsed || !parsed.current || !parsed.hourly) {
			return 'invalid weather payload';
		}
		return parsed;
	});
}

module.exports = {
	fetchOpenMeteoWeather: fetchOpenMeteoWeather,
};
