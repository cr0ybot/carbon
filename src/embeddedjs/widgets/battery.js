/**
 * Battery widget
 *
 * Displays battery state as either an icon or a short text string such as
 * `75%`, depending on widget configuration.
 *
 * Config:
 *   text    - if true, show percentage text; default is icon mode
 *   onlyWarningCharging - if true, hide unless charging or warning level
 *
 * Battery data comes from the shared battery observer module so multiple
 * battery-driven features can share a single sensor instance.
 *
 * @module widgets/battery
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

import { iconStyle, dateStyle } from "assets";
import { observeBattery } from "modules/battery-observer";
import Widget from "modules/widget";

function batteryIcon(sample) {
	if (sample.charging)     return "\uF38E"; // battery-charging
	if (sample.percent > 80) return "\uF318"; // battery-full
	if (sample.percent > 40) return "\uF390"; // battery-medium
	if (sample.percent > 20) return "\uF261"; // battery-low
	return "\uF431"; // battery-warning
}

function batteryText(sample) {
	return `${ Math.round(sample.percent) }%`;
}

function batteryShouldShow(sample, onlyWarningCharging) {
	if (!onlyWarningCharging)
		return true;

	return sample.charging || sample.percent <= 20;
}

function batteryString(sample, text, onlyWarningCharging) {
	if (!batteryShouldShow(sample, onlyWarningCharging))
		return "";

	return text ? batteryText(sample) : batteryIcon(sample);
}

class BatteryBehavior extends Behavior {
	onCreate(label, data) {
		this.data = data;
		this.unobserve = observeBattery((sample) => {
			label.string = batteryString(sample, !!this.data?.text, !!this.data?.onlyWarningCharging);
		});
	}

	onUndisplaying(label) {
		if (this.unobserve) {
			this.unobserve();
			this.unobserve = null;
		}
	}
}

const BatteryTemplate = Label.template($ => ({
	Behavior: BatteryBehavior,
	top: $.text ? -1 : 0,
	string: $.onlyWarningCharging ? "" : ($.text ? "--%" : "\uF346"),
	style: $.text ? dateStyle : iconStyle,
}));

export default class BatteryWidget extends Widget {
	static get Behavior() { return BatteryBehavior; }
	get Template() { return BatteryTemplate; }
}

Object.freeze(BatteryWidget);
