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

console.log("Battery widget loaded");

function batteryIcon(sample) {
	if (sample.charging)     return "battery-charging";
	if (sample.percent > 80) return "battery-full";
	if (sample.percent > 40) return "battery-medium";
	if (sample.percent > 20) return "battery-low";
	return "battery-warning";
}

class BatteryBehavior extends Behavior {
	onCreate(label, data) {
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

const BatteryWidget = IconLabel.template($ => ({
	Behavior: BatteryBehavior,
	string: "battery",
}));

export default BatteryWidget;
