/**
 * Shared constants for Carbon PebbleKit JS scripts.
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 */

// env.auto is generated from .env at build time (see .env.example).
// All values are strings; we coerce types here and apply defaults.
var env = {};
try { env = require('env.auto'); } catch (e) { }

function envStr(key, fallback) {
	var v = env[key];
	return (typeof v === 'string' && v.trim()) ? v.trim() : fallback;
}

function envBool(key) {
	var v = env[key];
	return typeof v === 'string' && ['1', 'true', 'yes', 'on'].indexOf(v.toLowerCase()) !== -1;
}

module.exports = {
	WEATHER_BASE_URL: 'https://api.open-meteo.com/v1/forecast',
	GEOCODE_BASE_URL: 'https://api.bigdatacloud.net/data/reverse-geocode-client',
	APP_REPO_URL: 'https://github.com/cr0ybot/carbon',

	CACHE_KEY: 'carbon.weather.v3',
	CACHE_TTL_MS: 15 * 60 * 1000,  // 15 minutes

	GEOCODE_CACHE_KEY: 'carbon.geocode.v1',
	GEOCODE_CACHE_TTL_MS: 24 * 60 * 60 * 1000, // 24 hours
	GEOCODE_PRECISION: 2,                    // decimal places (~1.1 km)

	SERVICE_CACHE_KEY: 'carbon.service.v1',
	SERVICE_ENABLED_TTL_MS: 6 * 60 * 60 * 1000, // 6 hours when enabled
	SERVICE_DISABLED_TTL_MS: 6 * 60 * 60 * 1000, // 6 hours when deliberately disabled
	SERVICE_FAIL_TTL_MS: 5 * 60 * 1000,       // 5 minutes on request/parse failure

	// Raw GitHub URL for the live services.json killswitch file. Forks: update
	// APP_REPO_URL and SERVICE_STATUS_URL, or set CARBON_SERVICE_STATUS_URL in .env.
	SERVICE_STATUS_URL: envStr('CARBON_SERVICE_STATUS_URL', 'https://raw.githubusercontent.com/cr0ybot/carbon/main/services.json'),
	DISABLE_REMOTE_SERVICES: envBool('CARBON_DISABLE_REMOTE_SERVICES'),

	BIGDATACLOUD_SERVICE_KEY: 'bigdatacloud',
	OPENMETEO_SERVICE_KEY: 'open-meteo',
};
