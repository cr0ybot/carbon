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
};
