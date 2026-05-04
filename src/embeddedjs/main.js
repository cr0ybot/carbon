/**
 * Main Carbon watchface entry point.
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

import Layout from "layout";
import { skins } from "assets";

//
// Widget configuration (temporarily hardcoded until settings are implemented)
//

const widgetConfig = {
	progressBar: {
		source: "battery",
	},

	// 3 slots per bar.
	// Emery: left, center, right.
	// Gabbro top: #1 bottom-left, #2 top-center, #3 bottom-right.
	// Gabbro bottom: #1 top-left, #2 bottom-center, #3 top-right.
	topWidgets: [
		{ name: "battery", config: { onlyWarningCharging: true } },
		// { name: "placeholder", config: { icon: "\uF110", text: "Hi" } },
		null,
		{ name: "bluetooth", config: { onlyDisconnected: true } },
	],
	bottomWidgets: [
		{ name: "weather", config: { mode: "low", showIcon: true, showText: true } },
		{ name: "weather", config: { mode: "current", showIcon: true, showText: true } },
		{ name: "weather", config: { mode: "high", showIcon: true, showText: true } },
	],
};

//
// Application behavior
//

class CarbonBehavior extends Behavior {
	onCreate(app) {
		// Callback is called immediately upon registration and once per minute.
		watch.addEventListener("minutechange", (e) => {
			app.distribute("onClockChanged", e.date);
		});
	}
}

const CarbonApplication = Application.template($ => ({
	skin: skins.background,
	Behavior: CarbonBehavior,
	contents: [
		Layout($, {
			top: 0, left: 0, right: 0, bottom: 0,
		}),
	],
}));

export default new CarbonApplication(widgetConfig, {
	commandListLength: 1024,
	// displayListLength: 4096,
	touchCount: 0,
	pixels: screen.width * 4,
});
