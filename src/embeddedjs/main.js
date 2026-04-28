/**
 * Main Carbon watchface entry point.
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

import assets from "assets";
import layout from "layout";
import ClockLabel from "modules/clock";
import DateLabel from "modules/date-label";
import { TopWidgetBar, BottomWidgetBar } from "modules/widget-bar";
import PrecipGraph from "modules/precip-graph";
import ProgressBar from "modules/progress-bar";

const backgroundSkin = new Skin(assets.skins.background);

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

//
// Layout
//
// 5-section column (top → bottom):
//   TopWidgetBar  — fixed height, colored background
//   PrecipGraph   — fixed height, custom-drawn 24 h precipitation bars
//   Center        — flexible height, large time + date labels
//   BottomWidgetBar — fixed height, no background
//   ProgressBar   — fixed height, thin filled bar
//

const CarbonApplication = Application.template($ => ({
	skin: backgroundSkin,
	Behavior: CarbonBehavior,
	contents: [
		// Progress bar: absolute overlay drawn FIRST so all other content
		// renders on top.  On emery: 4 px strip at the bottom edge.
		// On gabbro: annular arc along the circular screen edge.
		ProgressBar($, {}),
		// Main layout column — stops above the progress bar height so the
		// absolute ProgressBar overlay doesn't overlap BottomWidgetBar.
		Column($, {
			top: 0, bottom: layout.progressBar.height, left: 0, right: 0,
			contents: [
				TopWidgetBar($, {}),
				PrecipGraph($, {}),
				// Center: time + date block vertically centred within its allotted height
				Column($, {
					height: layout.center.height, left: 0, right: 0,
					contents: [
						Column(null, {
							top: layout.center.timeOffset, left: 0, right: 0,
							contents: [
								ClockLabel(null, { left: 0, right: 0 }),
								DateLabel(null,  { left: 0, right: 0 }),
							],
						}),
					],
				}),
				BottomWidgetBar($, {}),
			],
		}),
	],
}));

export default new CarbonApplication(null, {
	commandListLength: 4096,
	touchCount: 0,
	pixels: screen.width * 4,
});
