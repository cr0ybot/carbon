/**
 * Bluetooth widget
 *
 * Displays a bluetooth connected/disconnected icon.
 * Listens for `onBluetoothChanged` events distributed from the app behavior.
 *
 * @todo Add option for "disconnected" icon to show only when disconnected, rather than always showing an icon with different states.
 *
 * @module widgets/bluetooth
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

import { iconStyle, dateStyle } from "assets";
import { observeBluetooth } from "modules/bluetooth-observer";
import Widget from "modules/widget";

function bluetoothString(sample, text, onlyDisconnected) {
	if (sample.connected && onlyDisconnected)
		return "";

	if (text)
		return sample.connected ? "" : "X";

	return sample.connected ? "\uF2FF" : "\uF582"; // bluetooth / bluetooth-off
}

class BluetoothBehavior extends Behavior {
	onCreate(label, data) {
		this.data = data;
		this.unobserve = observeBluetooth((sample) => {
			label.string = bluetoothString(sample, !!this.data?.text, !!this.data?.onlyDisconnected);
		});
	}

	onUndisplaying(label) {
		if (this.unobserve) {
			this.unobserve();
			this.unobserve = null;
		}
	}
}

const BluetoothTemplate = Label.template($ => ({
	Behavior: BluetoothBehavior,
	top: $.text ? -1 : 0,
	string: '',
	style: $.text ? dateStyle : iconStyle,
}));

export default class BluetoothWidget extends Widget {
	static get Behavior() { return BluetoothBehavior; }
	get Template() { return BluetoothTemplate; }
}

Object.freeze(BluetoothWidget);
