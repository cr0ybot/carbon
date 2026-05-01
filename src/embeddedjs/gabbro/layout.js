/**
 * Gabbro (Pebble Round 2) layout.
 *
 * @module layout
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

import ClockLabel from "modules/clock";
import DateLabel from "modules/date-label";
import TopWidgetBar from "modules/top-widget-bar";
import BottomWidgetBar from "modules/bottom-widget-bar";
import PrecipGraph from "modules/precip-graph";
import ProgressBar from "modules/progress-bar";

/**
 * Returns the Application contents array for the gabbro platform.
 * Arc ProgressBar overlay is placed before the Column so it draws behind.
 */
const Layout = Container.template($ => ({
	contents: [
		// Arc progress bar: full-screen Port overlay, drawn behind everything.
		ProgressBar($, {}),
		Column($, {
			top: 0, bottom: 0, left: 0, right: 0,
			contents: [
				// Top widget bar
				new TopWidgetBar($.topWidgets, { height: 64 }),
				// Precipitation graph
				PrecipGraph($, { height: 30 }),
				// Clock + date
				Column($, {
					height: 100, left: 0, right: 0,
					contents: [
						Column(null, {
							top: -20, left: 0, right: 0,
							contents: [
								ClockLabel(null, { left: 0, right: 0 }),
								DateLabel(null,  { top: -16, left: 0, right: 0 }),
							],
						}),
					],
				}),
				// Bottom widget bar
				new BottomWidgetBar($.bottomWidgets, { height: 60 }),
			],
		}),
	],
}));

Object.freeze(Layout);

export default Layout;
