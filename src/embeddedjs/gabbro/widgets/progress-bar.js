/**
 * Gabbro arc progress bar
 *
 * A full-screen Port overlay drawn BEHIND other content (place first in
 * Application contents).  Renders a BAR_THICKNESS-pixel annular band along
 * the bottom semicircle of the circular screen — from the 9-o'clock midpoint
 * (left) clockwise through 6 o'clock (bottom) to the 3-o'clock midpoint
 * (right).
 *
 * Drawing model
 * ─────────────
 * Row-by-row scan instead of column-by-column.  For each row y in the bottom
 * half, we compute the x-spans of the outer ring minus the inner hole and
 * issue two fillColor calls (left segment, right segment).  This produces a
 * solid, gap-free band at all slopes.
 *
 * Progress colouring
 * ──────────────────
 * The cutoff y-row is where the arc angle equals π·(1 − progress):
 *
 *   yCutoff = cy + R · sin(π · (1 − progress))
 *
 * • Left segment  (angle π→π/2 as y increases):
 *   filled for y ≤ yCutoff when progress ≤ 0.5; always filled when > 0.5.
 *
 * • Right segment (angle 0→π/2 as y increases):
 *   never filled when progress < 0.5; filled for y ≥ yCutoff when ≥ 0.5.
 *
 * @module gabbro/widgets/progress-bar
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

import assets from "assets";

const BAR_THICKNESS = 4;

class ArcProgressBehavior extends Behavior {
	onCreate(port, data) {
		// TODO: drive from steps sensor or battery sensor
		this.progress = 0.4; // stub: 40%
	}

	/** Call with a value 0–1 to update the bar without a full redraw. */
	setProgress(port, value) {
		this.progress = Math.max(0, Math.min(1, value));
		port.invalidate();
	}

	onDraw(port, dirtyX, dirtyY, dirtyW, dirtyH) {
		const R  = screen.width / 2;   // outer radius = 90 on gabbro
		const iR = R - BAR_THICKNESS;  // inner radius = 86
		const cx = R;                  // center x = 90
		const cy = R;                  // center y = 90

		const progress   = this.progress;
		const trackColor = assets.colors.progressTrack;
		const fillColor  = assets.colors.progressFill;

		// y-row where the progress angle crosses the boundary between fill
		// and track.  Identical formula for both left and right segments.
		const yCutoff = cy + R * Math.sin(Math.PI * (1 - progress));

		// Bottom semicircle only, clamped to the dirty rect.
		const yStart = Math.max(cy, dirtyY);
		const yEnd   = Math.min(cy + R, dirtyY + dirtyH);

		for (let y = yStart; y <= yEnd; y++) {
			const dy      = y - cy;
			const outerDx = Math.sqrt(Math.max(0, R  * R  - dy * dy));
			const innerDx = Math.sqrt(Math.max(0, iR * iR - dy * dy));

			const lx0 = Math.round(cx - outerDx); // left  outer x
			const lx1 = Math.round(cx - innerDx); // left  inner x
			const rx0 = Math.round(cx + innerDx); // right inner x
			const rx1 = Math.round(cx + outerDx); // right outer x

			// Left: fill sweeps downward (top→bottom) as progress 0 → 0.5.
			const leftFilled  = progress > 0.5 || y <= yCutoff;
			// Right: fill sweeps upward (bottom→top) as progress 0.5 → 1.
			const rightFilled = progress >= 0.5 && y >= yCutoff;

			if (lx1 > lx0) port.fillColor(leftFilled  ? fillColor : trackColor, lx0, y, lx1 - lx0, 1);
			if (rx1 > rx0) port.fillColor(rightFilled ? fillColor : trackColor, rx0, y, rx1 - rx0, 1);
		}
	}
}

// Full-screen overlay — place FIRST in Application contents so subsequent
// siblings (Column with clock, widget bars, etc.) render on top of the arc.
const ProgressBar = Port.template($ => ({
	top: 0, bottom: 0, left: 0, right: 0,
	Behavior: ArcProgressBehavior,
}));

export default ProgressBar;
