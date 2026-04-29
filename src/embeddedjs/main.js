/**
 * Main Carbon watchface entry point.
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

import assets from "assets";
import { getContents } from "layout";

const backgroundSkin = new Skin(assets.skins.background);

//
// Widget configuration (temporarily hardcoded until settings are implemented)
//

const widgetConfig = {
	topWidgets: [
		{ name: "battery",   config: {} },
		{ name: "bluetooth", config: {} },
		null,
		null,
	],
	bottomWidgets: [
		null,
		null,
		null,
		null,
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
	contents: getContents($),
}));

export default new CarbonApplication(widgetConfig, {
	commandListLength: 1024,
	touchCount: 0,
	pixels: screen.width * 4,
});
