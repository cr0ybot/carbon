/**
 * Weather widget — icon, text, or icon+text display
 *
 * Config:
 *   mode      - "current" (default), "low", or "high"
 *   showIcon  - true by default
 *   showText  - false by default
 *
 * If both showIcon and showText are true, icon and text are rendered together.
 * Subscribes to WeatherObserver and updates on weather change.
 *
 * @module widgets/weather
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

import { observeWeather, getWeatherIcon } from "modules/weather-observer";
import { styles } from "assets";
import Widget from "modules/widget";

function weatherText(sample, mode) {
	if (!sample)
		return "";

	if (mode === "low")
		return `${sample.temperatureLow}°`;

	if (mode === "high")
		return `${sample.temperatureHigh}°`;

	return `${sample.temperature}°`;
}

function weatherIcon(sample, mode) {
	if (!sample)
		return "\uF0F0"; // ellipsis

	if (mode === "low")
		return "\uF0BB"; // arrow-big-up-dash

	if (mode === "high")
		return "\uF576"; // arrow-big-down-dash

	return getWeatherIcon(sample.weatherCode);
}

class WeatherBehavior extends Behavior {
	onCreate(container, data) {
		this.data = data || {};
		const iconLabel = container.first;
		const textLabel = iconLabel.next;
		const showIcon = this.data.showIcon !== false;
		const showText = !!this.data.showText;
		const mode = this.data.mode || "current";

		this.unsubscribe = observeWeather((sample) => {
			iconLabel.string = showIcon ? weatherIcon(sample, mode) : "";
			textLabel.string = showText ? weatherText(sample, mode) : "";
		});
	}

	onUndisplaying(container) {
		if (this.unsubscribe) {
			this.unsubscribe();
			this.unsubscribe = null;
		}
	}
}

const WeatherTemplate = Row.template($ => {
	const showIcon = $.showIcon !== false;
	const showText = !!$.showText;
	const slotW = $.slotWidth ?? 48;
	const pad = $.slotPadding ?? 3;
	const iconW = showIcon ? 20 : 0;
	const gap = (showIcon && showText) ? 2 : 0;
	const textW = showText ? Math.max(18, slotW - iconW - gap - (pad * 2)) : 0;
	const contentW = iconW + gap + textW;

	let left = pad;
	if ($.slotAlign === "center")
		left = Math.max(0, Math.floor((slotW - contentW) / 2));
	else if ($.slotAlign === "right")
		left = Math.max(0, slotW - pad - contentW);

	return {
		Behavior: WeatherBehavior,
		left, width: contentW,
		contents: [
			Label($, {
				width: iconW,
				style: $.iconStyle ?? styles.topBarIcons,
				string: "",
			}),
			Label($, {
				width: textW,
				style: $.textStyle ?? styles.topBarText,
				string: "",
			}),
		],
	};
});

class WeatherWidget extends Widget {
	constructor(data, coordinates) {
		const config = {
			...(data || {}),
			slotWidth: coordinates?.width ?? data?.slotWidth,
		};
		return new WeatherTemplate(config, coordinates);
	}
}

export default WeatherWidget;
