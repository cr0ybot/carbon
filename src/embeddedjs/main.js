/**
 * Main Carbon watchface entry point.
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

import Layout from "layout";
import { backgroundSkin } from "assets";

//
// Widget configuration (temporarily hardcoded until settings are implemented)
//

const widgetConfig = {
	progressBar: {
		source: "battery",
	},

	// 5 slots per bar.
	// Emery:         single row, left-to-right, slots 0-4
	// Gabbro top:    row 1 = slots 0-1 (2 wide), row 2 = slots 2-4 (3 wide)
	// Gabbro bottom: row 1 = slots 0-2 (3 wide), row 2 = slots 3-4 (2 wide)
	topWidgets: [
		{ name: "bluetooth", config: { onlyDisconnected: true } },
		null,
		{ name: "weather", config: {} },
		null,
		{ name: "battery", config: {} },
	],
	bottomWidgets: [
		{ name: "temperature", config: { mode: "low" } },
		null,
		{ name: "temperature", config: { mode: "current" } },
		null,
		{ name: "temperature", config: { mode: "high" } },
	],
};

//
// Application behavior
//

class CarbonBehavior extends Behavior {
	onCreate(app) {
		// Fire an initial clock event so all labels show the current time/date
		// immediately rather than waiting for the first minutechange.
		app.distribute("onClockChanged", new Date());

		watch.addEventListener("minutechange", (e) => {
			app.distribute("onClockChanged", e.date);
		});
	}
}

const CarbonApplication = Application.template($ => ({
	skin: backgroundSkin,
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
