/**
 * Shared constants for Carbon PebbleKit JS scripts.
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 */

module.exports = {
	WEATHER_BASE_URL: 'https://api.open-meteo.com/v1/forecast',
	GEOCODE_BASE_URL: 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode',
	CACHE_KEY:        'carbon.weather.v3',
	CACHE_TTL_MS:     15 * 60 * 1000,  // 15 minutes
	XHR_TIMEOUT_MS:   10 * 1000,
	FORECAST_HOURS:   36,
	WEATHER_RETRY_ATTEMPTS: 3,
	WEATHER_RETRY_BASE_DELAY_MS: 2 * 1000,
	GEOCODE_RETRY_ATTEMPTS: 2,
	GEOCODE_RETRY_BASE_DELAY_MS: 2 * 1000,
	SEND_RETRY_ATTEMPTS: 3,
	SEND_RETRY_BASE_DELAY_MS: 1000,
	LOG_KEY_CUR: 'carbon.fetchlog.cur',
	LOG_KEY_PREV: 'carbon.fetchlog.prev',
	MAX_LOG_ENTRIES: 60,
};
