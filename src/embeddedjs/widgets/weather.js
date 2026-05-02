/**
 * Weather widget — weather conditions icon display
 *
 * Displays only a weather icon based on the current conditions.
 * Subscribes to WeatherObserver and updates on weather change.
 * Shows an ellipsis placeholder while data is unavailable.
 *
 * @module widgets/weather
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

import { observeWeather, getWeatherIcon } from "modules/weather-observer";
import { iconStyle } from "assets";
import Widget from "modules/widget";

//
// Behavior — subscribe/unsubscribe to weather updates
//

class WeatherBehavior extends Behavior {
	onCreate(label) {
		this.unsubscribe = observeWeather((sample) => {
			label.string = sample ? getWeatherIcon(sample.weatherCode) : "\uF0F0";
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

const WeatherTemplate = Label.template($ => ({
	style: iconStyle,
	string: "",
	Behavior: WeatherBehavior,
}));

//
// Widget — constructor returns configured template
//

class WeatherWidget extends Widget {
	constructor(data, coordinates) {
		return new WeatherTemplate(data, coordinates);
	}
}

export default WeatherWidget;
