/**
 * Temperature widget — current, daily low, or daily high display
 *
 * Displays a configurable temperature metric as a number.
 * Subscribes to WeatherObserver and updates on weather change.
 * Shows "—" while loading.
 *
 * Config:
 *   mode - "current" (default), "low", or "high"
 *
 * @module widgets/temperature
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

import { observeWeather } from "modules/weather-observer";
import { dateStyle } from "assets";
import Widget from "modules/widget";

function temperatureString(sample, mode) {
	if (!sample)
		return "—";

	if (mode === "low")
		return `${sample.temperatureLow}°`;

	if (mode === "high")
		return `${sample.temperatureHigh}°`;

	return `${sample.temperature}°`;
}

//
// Behavior — subscribe/unsubscribe to weather updates
//

class TemperatureBehavior extends Behavior {
	onCreate(label, data) {
		this.data = data || {};
		this.unsubscribe = observeWeather((sample) => {
			label.string = temperatureString(sample, this.data.mode);
		});
	}

	onUndisplaying(label) {
		if (this.unsubscribe) {
			this.unsubscribe();
			this.unsubscribe = null;
		}
	}
}

//
// Template
//

const TemperatureTemplate = Label.template($ => ({
	style: dateStyle,
	string: "",
	Behavior: TemperatureBehavior,
}));

//
// Widget — constructor returns configured template
//

class TemperatureWidget extends Widget {
	constructor(data, coordinates) {
		return new TemperatureTemplate(data, coordinates);
	}
}

export default TemperatureWidget;
