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
 * Refreshes weather on a 15-minute cadence via minutechange events.
 * Durable caching across watchface relaunches is handled in PKJS.
 *
 * @module modules/weather-observer
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

import AppMessageObserver from "modules/app-message-observer";


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
// WMO weather code to Carbon icon codepoint (from IcoMoon)
// Reference: Carbon icons mapped to Unicode codepoints
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

class WeatherObserver extends AppMessageObserver {
	lastRequestTime = 0;
	minuteListenerAdded = false;

	parseChunk(value, min, max) {
		if (typeof value !== "string" || !value.length)
			return [];

		const parts = value.split(",");
		const out = [];
		for (let i = 0; i < parts.length; i++) {
			const n = Math.round(Number(parts[i]));
			if (Number.isFinite(n))
				out.push(Math.max(min, Math.min(max, n)));
		}
		return out;
	}

	onReadableMessage(data) {
		// console.log("Received weather message from PKJS");
		if (!data)
			return;

		const errorCode = data.get("WEATHER_ERROR");
		if (errorCode && errorCode !== 0) {
			console.error(`Weather PKJS error code: ${errorCode}`);
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
			...this.parseChunk(data.get("WEATHER_PRECIP_0"), 0, 100),
			...this.parseChunk(data.get("WEATHER_PRECIP_1"), 0, 100),
			...this.parseChunk(data.get("WEATHER_PRECIP_2"), 0, 100),
		].slice(0, 24);
		const temperatureHourly = [
			...this.parseChunk(data.get("WEATHER_TEMP_HOURLY_0"), -99, 199),
			...this.parseChunk(data.get("WEATHER_TEMP_HOURLY_1"), -99, 199),
			...this.parseChunk(data.get("WEATHER_TEMP_HOURLY_2"), -99, 199),
		].slice(0, 24);

		while (hourly.length < 24)
			hourly.push(0);
		while (temperatureHourly.length < 24)
			temperatureHourly.push(temperature);

		const weather = {
			timestamp: Date.now(),
			temperature,
			temperatureLow: temperatureLow === undefined ? temperature : temperatureLow,
			temperatureHigh: temperatureHigh === undefined ? temperature : temperatureHigh,
			weatherCode,
			description: getWeatherDescription(weatherCode),
			hourly,
			temperatureHourly,
			sunrise,
			sunset,
		};

		// console.log(`Hourly precip (next ${hourly.length}h): [${hourly.join(", ")}]`);
		// console.log(`Hourly precip max: ${hourly.reduce((max, value) => (value > max ? value : max), 0)}%`);
		// console.log(`Weather: ${weather.temperature}°F (${weather.temperatureLow}°/${weather.temperatureHigh}°), ${weather.description}`);

		this.publish(weather);
	}

	requestWeather() {
		// console.log("Maybe requesting weather from PKJS...");
		if (!this.messageWritable)
			return;

		const now = Date.now();
		if (now - this.lastRequestTime < 5000)
			return;

		this.lastRequestTime = now;

		try {
			this.writeMessage(new Map([
				["WEATHER_REQUEST", now & 0x7fffffff],
			]));
			// console.log("Requested weather from PKJS");
		} catch (e) {
			console.error(`Weather request write failed: ${e}`);
		}
	}

	onStart() {
		super.onStart();
		this.requestWeather();

		// Trigger a refresh at minute 00/15/30/45 while active.
		if (!this.minuteListenerAdded) {
			watch.addEventListener("minutechange", (e) => {
				const minute = e?.date?.getMinutes?.();
				if (minute === undefined)
					return;
				if ((minute % 15) === 0)
					this.requestWeather();
			});
			this.minuteListenerAdded = true;
		}
	}

	onStop() {
		super.onStop();
	}

	onWritableMessage() {
		this.requestWeather();
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

export { getWeatherIcon };

export default weatherObserver;
