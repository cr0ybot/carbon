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

console.log("Bluetooth widget loaded");

function btIcon() {
	return watch.connected.app ? "bluetooth" : "bluetooth-off";
}

class BluetoothBehavior extends Behavior {
	onCreate(label, data) {
		label.string = btIcon();
		watch.addEventListener("connected", () => {
			label.string = btIcon();
		});
	}
}

const BluetoothWidget = IconLabel.template($ => ({
	Behavior: BluetoothBehavior,
	string: "bluetooth",
}));

export default BluetoothWidget;
