/**
 * Layout constants derived from screen dimensions.
 *
 * Heights are chosen so widget-bar slots sit in a chord wide enough to be
 * useful on gabbro's circular display.  Adjust the constants at the top of
 * this file to tune proportions.
 *
 * Arc-inset maths for round screens
 * ─────────────────────────────────
 * Gabbro is a circle of radius r = screen.width / 2 = 90 px.
 * For a horizontal bar whose vertical centre sits at yc from the top:
 *
 *   half-chord = sqrt(r² – |r – yc|²)
 *   inset      = r – half-chord          (pixels to trim from each side)
 *
 * This keeps content from being clipped by the circular mask.
 *
 * @module layout
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

const isRound = screen.width === screen.height;

/**
 * Returns the horizontal inset needed on each side of a bar so that its
 * contents stay within the circular clip mask.
 *
 * @param {number} barY  Top y-coordinate of the bar.
 * @param {number} barH  Height of the bar.
 * @returns {number} Pixel inset (0 on rectangular screens).
 */
export function arcInset(barY, barH) {
	if (!isRound) return 0;
	const r = screen.width / 2;
	const yCenter = barY + barH / 2;
	const yDist = Math.abs(r - yCenter);
	return Math.ceil(r - Math.sqrt(Math.max(0, r * r - yDist * yDist)));
}

// ─── Section heights ────────────────────────────────────────────────────────
//
// On gabbro, bars are taller (36 px) so their chord at mid-height is wider.
//   • r = 90, barCenter = 18 → inset ≈ 36 px → available ≈ 108 px for 4 slots
//
// On emery (144×168), bars are shorter.

const TOP_BAR_HEIGHT    = isRound ? 36 : 22;
const PRECIP_HEIGHT     = isRound ? 30 : 28;
const BOTTOM_BAR_HEIGHT = isRound ? 36 : 22;
const PROGRESS_HEIGHT   = 4;

const CENTER_HEIGHT = screen.height - TOP_BAR_HEIGHT - PRECIP_HEIGHT - BOTTOM_BAR_HEIGHT - PROGRESS_HEIGHT;

// Estimated combined height of ClockLabel + DateLabel for vertical centering.
const CLOCK_BLOCK_H = isRound ? 72 : 68;
const TIME_OFFSET   = Math.max(0, Math.floor((CENTER_HEIGHT - CLOCK_BLOCK_H) / 2));

const BOTTOM_BAR_Y = screen.height - PROGRESS_HEIGHT - BOTTOM_BAR_HEIGHT;

const layout = Object.freeze({
	isRound,
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
