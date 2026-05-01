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

import { IconLabel } from "modules/icons";
import Widget from "modules/widget";

console.log("Bluetooth widget loaded");

function btIcon() {
	return watch.connected.app ? "\uF2FF" : "\uF582"; // bluetooth / bluetooth-off
}

class BluetoothBehavior extends Behavior {
	onCreate(label, data) {
		this.data = data;
		console.log('BluetoothBehavior onCreate');
		label.string = btIcon();
		watch.addEventListener("connected", () => {
			console.log('Bluetooth connected state changed');
			label.string = btIcon();
		});
	}
}

const BluetoothTemplate = IconLabel.template($ => ({
	Behavior: $.controller.constructor.Behavior,
	string: "\uF2FF", // bluetooth
}));

export default class BluetoothWidget extends Widget {
	static get Behavior() { console.log('BluetoothWidget Behavior getter'); return BluetoothBehavior; }
	get Template() { console.log('BluetoothWidget Template getter'); return BluetoothTemplate; }
}
