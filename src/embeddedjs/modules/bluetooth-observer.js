/**
 * Bluetooth observer
 *
 * Shared, lazy bluetooth-status observer for widgets and features that need
 * the current connection state. Starts listening only while at least one
 * observer is subscribed.
 *
 * Published sample shape:
 *   { connected: boolean }
 *
 * @module modules/bluetooth-observer
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

import LazyObserver from "modules/lazy-observer";

function bluetoothSample() {
	return {
		connected: !!watch.connected.app,
	};
}

class BluetoothObserver extends LazyObserver {
	onStart() {
		const observer = this;
		this.onConnectedChanged = () => {
			observer.publish(bluetoothSample());
		};

		if (typeof watch.addEventListener === "function")
			watch.addEventListener("connected", this.onConnectedChanged);

		this.publish(bluetoothSample());
	}

	onStop() {
		if (this.onConnectedChanged && typeof watch.removeEventListener === "function") {
			watch.removeEventListener("connected", this.onConnectedChanged);
		}

		this.onConnectedChanged = null;
	}
}

const bluetoothObserver = new BluetoothObserver();

Object.freeze(BluetoothObserver);

export function observeBluetooth(observer) {
	return bluetoothObserver.observe(observer);
}

export function getBluetoothSample() {
	return bluetoothObserver.value;
}
