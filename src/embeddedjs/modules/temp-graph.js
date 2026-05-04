/**
 * Temperature graph — 25-point comfort-colored trend line
 *
 * Draws current temperature plus 24 hourly forecast points as a single
 * left-to-right line.
 *
 * @module modules/temp-graph
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

import { observeWeather, getWeatherSample } from "modules/weather-observer";
import { colors, skins } from "assets";

const TEMP_EXTREME_COLD_MAX = 10;
const TEMP_FREEZE_MAX = 32;
const TEMP_COLD_MAX = 45;
const TEMP_CHILLY_MAX = 59;
const TEMP_MILD_MAX = 76;
const TEMP_WARM_MAX = 84;
const TEMP_HOT_MAX = 96;

class TempGraphBehavior extends Behavior {
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

	drawLine(port, color, x0, y0, x1, y1) {
		if (!Number.isFinite(x0) || !Number.isFinite(y0) || !Number.isFinite(x1) || !Number.isFinite(y1))
			return;

		const startX = Math.round(x0);
		const startY = Math.round(y0);
		const endX = Math.round(x1);
		const endY = Math.round(y1);
		const dx = endX - startX;
		const dy = endY - startY;
		const steps = Math.max(Math.abs(dx), Math.abs(dy));

		if (steps === 0) {
			port.fillColor(color, startX, startY, 1, 1);
			return;
		}

		for (let i = 0; i <= steps; i++) {
			const px = Math.round(startX + ((dx * i) / steps));
			const py = Math.round(startY + ((dy * i) / steps));
			port.fillColor(color, px, py, 1, 1);
		}
	}

	getTempColor(tempF) {
		if (tempF <= TEMP_EXTREME_COLD_MAX)
			return colors.graphTempExtremeCold;
		if (tempF <= TEMP_FREEZE_MAX)
			return colors.graphTempFreeze;
		if (tempF <= TEMP_COLD_MAX)
			return colors.graphTempColdA;
		if (tempF <= TEMP_CHILLY_MAX)
			return colors.graphTempColdB;
		if (tempF <= TEMP_MILD_MAX)
			return colors.graphTempMild;
		if (tempF <= TEMP_WARM_MAX)
			return colors.graphTempWarm;
		if (tempF <= TEMP_HOT_MAX)
			return colors.graphTempHot;
		return colors.graphTempExtremeHot;
	}

	onDraw(port, x, y, width, height) {
		const sample = this.data;
		const graphWidth = port.width;
		const graphHeight = port.height;

		port.fillColor(colors.graphBackground, 0, 0, graphWidth, graphHeight);

		if (!sample || !sample.temperatureHourly || sample.temperatureHourly.length === 0)
			return;

		const temps = sample.temperatureHourly;
		const lineTemps = [sample.temperature];
		for (let i = 0; i < 24; i++)
			lineTemps.push(i < temps.length ? temps[i] : sample.temperature);

		const fallbackTemp = Number.isFinite(sample.temperature) ? sample.temperature : 0;
		const low = Number.isFinite(sample.temperatureLow) ? sample.temperatureLow : fallbackTemp;
		const high = Number.isFinite(sample.temperatureHigh) ? sample.temperatureHigh : fallbackTemp;
		const tempMin = Math.min(low, high);
		const tempMax = Math.max(low, high);
		const denom = tempMax - tempMin;
		const lineTop = 0;
		const lineBottom = Math.max(lineTop, graphHeight - 1);
		const lineRange = Math.max(1, lineBottom - lineTop);
		let lastX = -1;
		let lastY = -1;
		let lastTemp = fallbackTemp;

		for (let i = 0; i < 25; i++) {
			const temp = lineTemps[i];
			const value = Number.isFinite(temp) ? temp : fallbackTemp;
			const clamped = Math.max(tempMin, Math.min(tempMax, value));
			const normalized = denom === 0 ? 0.5 : (clamped - tempMin) / denom;
			const xPos = Math.floor((i * graphWidth) / 24);
			const xSafe = Math.max(0, Math.min(graphWidth - 1, xPos));
			const yPos = lineBottom - Math.round(normalized * lineRange);
			const ySafe = Math.max(lineTop, Math.min(lineBottom, yPos));

			if (lastX >= 0) {
				const segmentColor = this.getTempColor((lastTemp + clamped) / 2);
				this.drawLine(port, segmentColor, lastX, lastY, xSafe, ySafe);
			}
			port.fillColor(this.getTempColor(clamped), xSafe, ySafe, 1, 1);
			lastX = xSafe;
			lastY = ySafe;
			lastTemp = clamped;
		}
	}
}

const TempGraphTemplate = Port.template($ => ({
	height: 28,
	left: 0,
	right: 0,
	skin: skins.graph,
	Behavior: TempGraphBehavior,
}));

export default TempGraphTemplate;
