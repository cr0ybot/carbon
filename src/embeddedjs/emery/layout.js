/**
 * Emery (Pebble Time 2) layout constants.
 *
 * Pure data — no Piu imports.  Other modules import this for section
 * heights and inset values.  Piu construction lives in render.js.
 *
 * @module layout
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

// Section heights
// const TOP_BAR_HEIGHT    = 24;
// const PRECIP_HEIGHT     = 28;
// const BOTTOM_BAR_HEIGHT = 24;
// const PROGRESS_HEIGHT   = 4;

// // ProgressBar is the last Column child, so subtract its height here.
// const CENTER_HEIGHT = screen.height - TOP_BAR_HEIGHT - PRECIP_HEIGHT - BOTTOM_BAR_HEIGHT - PROGRESS_HEIGHT;

// // Clock centering
// const CLOCK_BLOCK_H = 140;

// // Frozen layout constants
// const layout = Object.freeze({
// 	isRound: false,
// 	topBar: Object.freeze({
// 		height: TOP_BAR_HEIGHT,
// 		padding: 2,
// 	}),
// 	precipGraph: Object.freeze({
// 		height: PRECIP_HEIGHT,
// 	}),
// 	center: Object.freeze({
// 		height: CENTER_HEIGHT,
// 	}),
// 	bottomBar: Object.freeze({
// 		height: BOTTOM_BAR_HEIGHT,
// 	}),
// 	progressBar: Object.freeze({
// 		height: PROGRESS_HEIGHT,
// 	}),
// 	clock: Object.freeze({
// 		blockHeight: CLOCK_BLOCK_H,
// 		timeOffset:  Math.max(0, Math.floor((CENTER_HEIGHT - CLOCK_BLOCK_H) / 2)),
// 		dateOffset:  -16,
// 	}),
// });

// export default layout;

import ClockLabel from "modules/clock";
import DateLabel from "modules/date-label";
import TopWidgetBar from "modules/top-widget-bar";
import BottomWidgetBar from "modules/bottom-widget-bar";
import PrecipGraph from "modules/precip-graph";
import ProgressBar from "modules/progress-bar";

/**
 * Returns the Application contents array for the emery platform.
 * Single full-height Column; ProgressBar is the last child.
 *
 * @param {object} $ - Piu template data (widgetConfig) passed from Application.
 * @returns {Array} Piu content array.
 */
const Layout = Container.template($ => ({
	contents: [
		Column($, {
			top: 0, bottom: 0, left: 0, right: 0,
			contents: [
				// Top widget bar
				new TopWidgetBar($.topWidgets, {}),
				// Precipitation graph
				PrecipGraph($, {}),
				// Clock + date
				Column($, {
					height: 148, left: 0, right: 0,
					contents: [
						Column(null, {
							top: 0, left: 0, right: 0,
							contents: [
								ClockLabel(null, { left: 0, right: 0 }),
								DateLabel(null,  { top: -16, left: 0, right: 0 }),
							],
						}),
					],
				}),
				// Bottom widget bar
				new BottomWidgetBar($.bottomWidgets, {}),
				// Progress bar
				ProgressBar($, {}),
			],
		}),
	],
}));

Object.freeze(Layout);

export default Layout;
