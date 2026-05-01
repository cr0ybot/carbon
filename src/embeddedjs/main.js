/**
 * Main Carbon watchface entry point.
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

import assets from "assets";
import Layout from "layout";

const backgroundSkin = new Skin(assets.skins.background);

//
// Widget configuration (temporarily hardcoded until settings are implemented)
//

const widgetConfig = {
	// 5 slots per bar.
	// Emery:         single row, left-to-right, slots 0-4
	// Gabbro top:    row 1 = slots 0-1 (2 wide), row 2 = slots 2-4 (3 wide)
	// Gabbro bottom: row 1 = slots 0-2 (3 wide), row 2 = slots 3-4 (2 wide)
	topWidgets: [
		{ name: "placeholder", config: { string: "\uF2FF" } }, // bluetooth
		{ name: "placeholder", config: { string: "22", text: true } },
		{ name: "placeholder", config: { string: "\uF1DC" } },  // sun
		{ name: "placeholder", config: { string: "\uF0D1" } },  // cloud
		{ name: "placeholder", config: { string: "\uF346" } },  // battery
	],
	bottomWidgets: [
		{ name: "placeholder", config: { string: "\uF114" } },  // activity
		{ name: "placeholder", config: { string: "72", text: true } },
		{ name: "placeholder", config: { string: "\uF02E" } },  // heart-pulse
		{ name: "placeholder", config: { string: "\uF08C" } },  // flame
		{ name: "placeholder", config: { string: "32", text: true } },
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
