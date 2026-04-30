/**
 * Gabbro (Pebble Round 2) layout constants.
 *
 * Pure data — no Piu imports.  Other modules import this for section
 * heights.  Piu construction lives in render.js.
 *
 * @module layout
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

// Section heights
//
// On gabbro (260×260), bars are 60 px tall (2 × 30 px icon rows).
// Row widths are constrained to safe chord widths (see widget-bar modules).
const TOP_BAR_HEIGHT    = 64;
const PRECIP_HEIGHT     = 30;
const BOTTOM_BAR_HEIGHT = 60;
const PROGRESS_HEIGHT   = 4; // kept for layout.progressBar consumers; not used in column height

// ProgressBar is an overlay, not a Column child — no PROGRESS_HEIGHT deducted.
const CENTER_HEIGHT = screen.height - TOP_BAR_HEIGHT - PRECIP_HEIGHT - BOTTOM_BAR_HEIGHT;

// Clock centering
const CLOCK_BLOCK_H = 150;

// Frozen layout constants
const layout = Object.freeze({
	isRound: true,
	topBar: Object.freeze({
		height: TOP_BAR_HEIGHT,
	}),
	precipGraph: Object.freeze({
		height: PRECIP_HEIGHT,
	}),
	center: Object.freeze({
		height: CENTER_HEIGHT,
	}),
	bottomBar: Object.freeze({
		height: BOTTOM_BAR_HEIGHT,
		offset: -2, // prevent overlap with progress bar
	}),
	progressBar: Object.freeze({
		height: PROGRESS_HEIGHT,
	}),
	clock: Object.freeze({
		blockHeight: CLOCK_BLOCK_H,
		// Block overflows CENTER_HEIGHT; offset positions its visual center near
		// the watch face center.  Adjust to taste.
		timeOffset:  -20,
		dateOffset:  -16,
	}),
});

export default layout;
