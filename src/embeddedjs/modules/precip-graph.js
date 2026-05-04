/**
 * Precipitation graph — 24-hour probability bars
 *
 * Displays hourly precipitation probability as downward-extending bars
 * over the next 24 hours. "Now" is at the left edge. A white line marks
 * daylight hours from API sunrise/sunset values, relative to current time.
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
import { colors, skins } from "assets";

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

		port.fillColor(colors.graphBackground, 0, 0, graphWidth, graphHeight);

		if (!sample || !sample.hourly || sample.hourly.length === 0)
			return;

		const hourly = sample.hourly;
		const barCount = Math.min(24, hourly.length);
		const graphTop = 2;
		const maxBarHeight = Math.max(1, graphHeight - graphTop);

		for (let i = 0; i < barCount; i++) {
			const prob = hourly[i] || 0;
			if (prob <= 0) continue;
			const barHeight = Math.max(1, Math.round((prob / 100) * maxBarHeight));
			const cellLeft = Math.floor((i * graphWidth) / barCount);
			const cellRight = Math.floor(((i + 1) * graphWidth) / barCount);
			const barLeft = cellLeft;
			const barRight = Math.max(barLeft + 1, cellRight - 1);
			const barWidth = Math.max(1, barRight - barLeft);

			port.fillColor(colors.graphBar, barLeft, graphTop, barWidth, barHeight);
		}

		port.fillColor(colors.graphDaylightBg, 0, 0, graphWidth, 2);
		if (sample.sunrise && sample.sunset) {
			const nowSec = Math.floor(Date.now() / 1000);
			const dayStart = ((sample.sunrise - nowSec) / 3600) * (graphWidth / 24);
			const dayEnd = ((sample.sunset - nowSec) / 3600) * (graphWidth / 24);

			const wrap = (value, size) => {
				let out = value % size;
				if (out < 0) out += size;
				return out;
			};

			const start = wrap(dayStart, graphWidth);
			const end = wrap(dayEnd, graphWidth);

			if (start < end) {
				port.fillColor(colors.graphDaylight, start, 0, end - start, 2);
			} else if (start > end) {
				port.fillColor(colors.graphDaylight, 0, 0, end, 2);
				port.fillColor(colors.graphDaylight, start, 0, graphWidth - start, 2);
			}
		}
	}
}

const PrecipGraphTemplate = Port.template($ => ({
	height: 28,
	left: 0,
	right: 0,
	skin: skins.graph,
	Behavior: PrecipGraphBehavior,
}));

export default PrecipGraphTemplate;
