/**
 * Precipitation graph — 24-hour probability bars
 *
 * Displays hourly precipitation probability as downward-extending bars
 * over the next 24 hours. "Now" is at the left edge. A white line marks
 * daylight hours (6 am – 6 pm, relative to current time).
 *
 * Uses Piu Port for custom Canvas-based rendering.
 * Subscribes to WeatherObserver for hourly precipitation data.
 *
 * @module modules/precip-graph
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

import { observeWeather, getWeatherSample } from "modules/weather-observer";
import assets, { graphSkin } from "assets";

//
// Behavior — coordinate rendering and data updates
//

class PrecipGraphBehavior extends Behavior {
	onCreate(port) {
		this.port = port;
		this.unsubscribe = null;
		this.data = null;
	}

	onDisplaying(port) {
		const self = this;
		this.unsubscribe = observeWeather((sample) => {
			self.data = sample;
			port.invalidate();
		});

		// Also grab initial data if available
		const initial = getWeatherSample();
		if (initial) {
			this.data = initial;
			port.invalidate();
		}
	}

	onUndisplaying(port) {
		if (this.unsubscribe) {
			this.unsubscribe();
			this.unsubscribe = null;
		}
		this.data = null;
	}

	onDraw(port, x, y, width, height) {
		const sample = this.data;
		const graphWidth = port.width;
		const graphHeight = port.height;

		// Clear background
		port.fillColor(assets.colors.graphBackground, 0, 0, graphWidth, graphHeight);

		if (!sample || !sample.hourly || sample.hourly.length === 0) {
			// No data yet — leave blank
			return;
		}

		const hourly = sample.hourly;
		const barCount = Math.min(24, hourly.length);
		const graphTop = 2; // reserve top rows for 2px daylight line
		const maxBarHeight = Math.max(1, graphHeight - graphTop);

		// Draw precipitation bars top-down, with a 1px gap between bars.
		for (let i = 0; i < barCount; i++) {
			const prob = hourly[i] || 0;
			if (prob <= 0) continue;
			const barHeight = Math.max(1, Math.round((prob / 100) * maxBarHeight));
			const cellLeft = Math.floor((i * graphWidth) / barCount);
			const cellRight = Math.floor(((i + 1) * graphWidth) / barCount);
			const barLeft = cellLeft;
			const barRight = Math.max(barLeft + 1, cellRight - 1); // 1px spacing
			const barWidth = Math.max(1, barRight - barLeft);

			port.fillColor(assets.colors.graphBar, barLeft, graphTop, barWidth, barHeight);
		}

		// Draw daylight line from API sunrise/sunset, relative to now at x=0.
		let dayStart = 0;
		let dayEnd = 0;
		if (sample.sunrise && sample.sunset) {
			const nowSec = Math.floor(Date.now() / 1000);
			dayStart = ((sample.sunrise - nowSec) / 3600) * (graphWidth / 24);
			dayEnd = ((sample.sunset - nowSec) / 3600) * (graphWidth / 24);
		}

		if (dayEnd > 0 && dayStart < graphWidth) {
			// Clamp to visible range
			const lineX = Math.max(0, dayStart);
			const lineW = Math.min(graphWidth, dayEnd) - lineX;
			if (lineW > 0) {
				port.fillColor(assets.colors.graphDaylight, lineX, 0, lineW, 2);
			}
		}
	}
}

//
// Template — Port container
//

const PrecipGraphTemplate = Port.template($ => ({
	height: 28,
	left: 0, right: 0,
	skin: graphSkin,
	Behavior: PrecipGraphBehavior,
}));

export default PrecipGraphTemplate;
