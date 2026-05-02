/**
 * Weather observer
 *
 * Shared, lazy weather data manager for widgets and features that need current
 * temperature, conditions, and hourly precipitation data. Uses Location sensor
 * (one-shot GPS on phone) and Open-Meteo API (no key required).
 *
 * The underlying Location sensor is created only when the first observer
 * subscribes, and is closed as soon as the last observer unsubscribes.
 * This keeps the runtime cost at zero when no weather-driven feature is active.
 *
 * Automatically refreshes every hour via hourchange event.
 *
 * @module modules/weather-observer
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

import Message from "pebble/message";
import LazyObserver from "modules/lazy-observer";

const WEATHER_KEYS = Object.freeze([
	"WEATHER_REQUEST",
	"WEATHER_TEMP",
	"WEATHER_TEMP_LOW",
	"WEATHER_TEMP_HIGH",
	"WEATHER_CODE",
	"WEATHER_PRECIP_0",
	"WEATHER_PRECIP_1",
	"WEATHER_PRECIP_2",
	"WEATHER_SUNRISE",
	"WEATHER_SUNSET",
	"WEATHER_ERROR",
]);

//
// WMO weather code to human-readable description
//

function getWeatherDescription(code) {
	if (code === 0) return "Clear";
	if (code <= 3) return "Cloudy";
	if (code <= 48) return "Fog";
	if (code <= 55) return "Drizzle";
	if (code <= 57) return "Fz. Drizzle";
	if (code <= 65) return "Rain";
	if (code <= 67) return "Fz. Rain";
	if (code <= 75) return "Snow";
	if (code <= 77) return "Snow Grains";
	if (code <= 82) return "Showers";
	if (code <= 86) return "Snow Shwrs";
	if (code === 95) return "T-Storm";
	if (code <= 99) return "T-Storm";
	return "Unknown";
}

//
// WMO weather code to Lucide icon codepoint (from IcoMoon)
// Reference: Lucide icons mapped to Unicode codepoints
//

function getWeatherIcon(code) {
	// Clear
	if (code === 0) return "\uF1DC"; // sun
	// Partly cloudy / Cloudy
	if (code <= 3) return "\uF0D1"; // cloud
	// Fog / Mist
	if (code <= 48) return "\uF2CA"; // cloud-fog
	// Drizzle / Light rain
	if (code <= 55) return "\uF425"; // cloud-drizzle
	// Freezing drizzle
	if (code <= 57) return "\uF0B8"; // cloud-hail
	// Rain
	if (code <= 65) return "\uF18B"; // cloud-rain
	// Freezing rain
	if (code <= 67) return "\uF0B8"; // cloud-hail
	// Snow
	if (code <= 75) return "\uF3DB"; // cloud-snow
	// Snow grains
	if (code <= 77) return "\uF341"; // snowflake
	// Showers
	if (code <= 82) return "\uF460"; // cloud-rain-wind
	// Snow showers
	if (code <= 86) return "\uF3DB"; // cloud-snow
	// Thunderstorms
	if (code === 95 || code <= 99) return "\uF281"; // cloud-lightning
	// Unknown
	return "";
}

//
// WeatherObserver — lazy location + fetch coordination
//

class WeatherObserver extends LazyObserver {
	constructor() {
		super();
		this.cacheTime = 0;
		this.cacheTTL = 3600000; // 1 hour in ms
		this.lastRequestTime = 0;
		this.hourListenerAdded = false;
		this.message = null;
		this.messageWritable = false;
	}

	parseChunk(value) {
		if (typeof value !== "string" || !value.length)
			return [];

		const parts = value.split(",");
		const out = [];
		for (let i = 0; i < parts.length; i++) {
			const n = Math.round(Number(parts[i]));
			if (Number.isFinite(n))
				out.push(Math.max(0, Math.min(100, n)));
		}
		return out;
	}

	onReadableMessage() {
		if (!this.message)
			return;

		const data = this.message.read();
		if (!data)
			return;

		const errorCode = data.get("WEATHER_ERROR");
		if (errorCode && errorCode !== 0) {
			trace(`Weather PKJS error code: ${errorCode}\n`);
			return;
		}

		const temperature = data.get("WEATHER_TEMP");
		const temperatureLow = data.get("WEATHER_TEMP_LOW");
		const temperatureHigh = data.get("WEATHER_TEMP_HIGH");
		const weatherCode = data.get("WEATHER_CODE");
		const sunrise = data.get("WEATHER_SUNRISE");
		const sunset = data.get("WEATHER_SUNSET");
		if (temperature === undefined || weatherCode === undefined || sunrise === undefined || sunset === undefined)
			return;

		const hourly = [
			...this.parseChunk(data.get("WEATHER_PRECIP_0")),
			...this.parseChunk(data.get("WEATHER_PRECIP_1")),
			...this.parseChunk(data.get("WEATHER_PRECIP_2")),
		].slice(0, 24);

		while (hourly.length < 24)
			hourly.push(0);

		const weather = {
			timestamp: Date.now(),
			temperature,
			temperatureLow: temperatureLow === undefined ? temperature : temperatureLow,
			temperatureHigh: temperatureHigh === undefined ? temperature : temperatureHigh,
			weatherCode,
			description: getWeatherDescription(weatherCode),
			hourly,
			sunrise,
			sunset,
		};

		const maxPrecip = hourly.reduce((max, value) => (value > max ? value : max), 0);
		trace(`Hourly precip (next ${hourly.length}h): [${hourly.join(", ")}]\n`);
		trace(`Hourly precip max: ${maxPrecip}%\n`);
		trace(`Weather: ${weather.temperature}°F (${weather.temperatureLow}°/${weather.temperatureHigh}°), ${weather.description}\n`);

		this.cacheTime = Date.now();
		this.publish(weather);
	}

	requestWeather() {
		if (!this.message || !this.messageWritable)
			return;

		const now = Date.now();
		if (now - this.lastRequestTime < 5000)
			return;

		this.lastRequestTime = now;

		try {
			this.message.write(new Map([
				["WEATHER_REQUEST", now & 0x7fffffff],
			]));
			trace("Requested weather from PKJS\n");
		} catch (e) {
			trace(`Weather request write failed: ${e}\n`);
		}
	}

	ensureMessage() {
		if (this.message)
			return;

		const observer = this;
		this.message = new Message({
			keys: WEATHER_KEYS,
			onReadable() {
				observer.onReadableMessage();
			},
			onWritable() {
				observer.messageWritable = true;
				observer.requestWeather();
			},
			onSuspend() {
				observer.messageWritable = false;
			},
		});
	}

	onStart() {
		this.ensureMessage();
		this.requestWeather();

		// Auto-refresh weather every hour via hourchange event
		if (!this.hourListenerAdded) {
			watch.addEventListener("hourchange", () => {
				this.requestWeather();
			});
			this.hourListenerAdded = true;
		}
	}

	onStop() {
		this.messageWritable = false;
	}
}

//
// Singleton instance + public API
//

const weatherObserver = new WeatherObserver();

export function observeWeather(fn) {
	return weatherObserver.observe(fn);
}

export function getWeatherSample() {
	return weatherObserver.value;
}

export { getWeatherIcon, getWeatherDescription };

export default weatherObserver;
