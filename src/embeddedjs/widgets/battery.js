/**
 * Battery widget
 *
 * Displays a battery icon reflecting the current charge level and charging
 * state.  Listens for `watch.battery` updates via `onBatteryChanged`.
 *
 * @todo Implement battery percentage text option (requires font with % glyph, or custom text layout).
 *
 * @module widgets/battery
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

import Battery from "embedded:sensor/Battery";

import { IconLabel } from "modules/icons";
import Widget from "modules/widget";

console.log("Battery widget loaded");

function batteryIcon(sample) {
	if (sample.charging)     return "\uF38E"; // battery-charging
	if (sample.percent > 80) return "\uF318"; // battery-full
	if (sample.percent > 40) return "\uF390"; // battery-medium
	if (sample.percent > 20) return "\uF261"; // battery-low
	return "\uF431"; // battery-warning
}

class BatteryBehavior extends Behavior {
	onCreate(label, data) {
		this.data = data;
		this.sensor = new Battery({
			onSample() {
				label.string = batteryIcon(this.sample());
			},
		});
		const initial = this.sensor.sample();
		console.log("battery sample:", initial.percent, initial.charging);
		label.string = batteryIcon(initial);
	}
}

const BatteryTemplate = IconLabel.template($ => ({
	Behavior: $.controller.constructor.Behavior,
	string: "\uF346", // battery
}));

export default class BatteryWidget extends Widget {
	static get Behavior() { return BatteryBehavior; }
	get Template() { return BatteryTemplate; }
}
