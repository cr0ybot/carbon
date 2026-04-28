/**
 * Gabbro (Pebble Round 2) layout — circular screen (180×180).
 *
 * ProgressBar is a full-screen Port overlay rendered behind the Column,
 * so it does NOT live in the Column and CENTER_HEIGHT does not subtract
 * PROGRESS_HEIGHT.  The Column fills the full screen height.
 *
 * Exports
 * ───────
 * getContents($)  — returns the Application contents array for gabbro.
 * default         — frozen layout constants used by widget modules.
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
import { TopWidgetBar, BottomWidgetBar } from "modules/widget-bar";
import PrecipGraph from "modules/precip-graph";
import ProgressBar from "modules/progress-bar";

// ─── Arc-inset helper ─────────────────────────────────────────────────────────
//
// For a horizontal bar centred at yc, the usable half-chord is:
//   half-chord = sqrt(r² – |r – yc|²)
//   inset      = r – half-chord   (pixels trimmed from each side)

const r = screen.width / 2; // 130 on gabbro (260×260)

function arcInset(barY, barH) {
	const yCenter = barY + barH / 2;
	const yDist   = Math.abs(r - yCenter);
	return Math.ceil(r - Math.sqrt(Math.max(0, r * r - yDist * yDist)));
}

// ─── Section heights ──────────────────────────────────────────────────────────
//
// On gabbro (260×260), bars are 36 px tall.
//   r = 130, barCenter = 18 → yDist = 112 → half-chord ≈ 66 → inset ≈ 64 px
//   usable width per bar ≈ 132 px (enough for 4 widget slots)

const TOP_BAR_HEIGHT    = 36;
const PRECIP_HEIGHT     = 30;
const BOTTOM_BAR_HEIGHT = 36;
const PROGRESS_HEIGHT   = 4; // kept for layout.progressBar consumers; not used in column height

// ProgressBar is an overlay, not a Column child — no PROGRESS_HEIGHT deducted.
const CENTER_HEIGHT = screen.height - TOP_BAR_HEIGHT - PRECIP_HEIGHT - BOTTOM_BAR_HEIGHT;

const CLOCK_BLOCK_H = 72; // estimated ClockLabel + DateLabel combined height
const TIME_OFFSET   = Math.max(0, Math.floor((CENTER_HEIGHT - CLOCK_BLOCK_H) / 2));

const BOTTOM_BAR_Y = screen.height - BOTTOM_BAR_HEIGHT;

// ─── Application contents ─────────────────────────────────────────────────────

/**
 * Returns the Application contents array for the gabbro platform.
 * ProgressBar is placed FIRST so it renders behind the Column.
 *
 * @param {object} $ - Piu template data object passed down from Application.
 * @returns {Array} Piu content array.
 */
export function getContents($) {
	return [
		// Arc progress bar: full-screen Port overlay, drawn behind everything.
		ProgressBar($, {}),
		Column($, {
			top: 0, bottom: 0, left: 0, right: 0,
			contents: [
				TopWidgetBar($, {}),
				PrecipGraph($, {}),
				Column($, {
					height: CENTER_HEIGHT, left: 0, right: 0,
					contents: [
						Column(null, {
							top: TIME_OFFSET, left: 0, right: 0,
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
	];
}

// ─── Layout constants (used by widget modules via `import layout`) ────────────

const layout = Object.freeze({
	isRound: true,
	topBar: Object.freeze({
		height: TOP_BAR_HEIGHT,
		inset:  arcInset(0, TOP_BAR_HEIGHT),
	}),
	precipGraph: Object.freeze({
		height: PRECIP_HEIGHT,
	}),
	center: Object.freeze({
		height:     CENTER_HEIGHT,
		timeOffset: TIME_OFFSET,
	}),
	bottomBar: Object.freeze({
		height: BOTTOM_BAR_HEIGHT,
		inset:  arcInset(BOTTOM_BAR_Y, BOTTOM_BAR_HEIGHT),
	}),
	progressBar: Object.freeze({
		height: PROGRESS_HEIGHT,
	}),
});

export default layout;
