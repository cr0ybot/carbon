/**
 * Gabbro arc progress bar
 *
 * A Port overlay covering the full screen.  Draws a BAR_THICKNESS-pixel band
 * along the bottom semicircle — from the left midpoint (x=0, y=r) clockwise
 * around the bottom to the right midpoint (x=w, y=r).
 *
 * Arc maths
 * ─────────
 * For gabbro (180×180, r = 90), the bottom arc at column px is:
 *   arcY = r + √(r² − (px − r)²)
 *
 * Progress fraction at column px (0 = left edge, 1 = right edge):
 *   fraction = 1 − acos((px − r) / r) / π
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
		const r = screen.width / 2; // 90 on gabbro
		const progress = this.progress;

		// Iterate over every column in the dirty rect.
		const startX = Math.max(0, dirtyX);
		const endX   = Math.min(screen.width - BAR_THICKNESS, dirtyX + dirtyW);

		// Seed prevArcY from the column just before startX so the first
		// strip connects seamlessly when drawing a partial dirty rect.
		const prevDx0 = (startX - 1) - r;
		let prevArcY = startX > 0
			? Math.round(r + Math.sqrt(Math.max(0, r * r - prevDx0 * prevDx0)))
			: null;

		for (let px = startX; px < endX; px++) {
			const dx   = px - r;
			const arcY = Math.round(r + Math.sqrt(Math.max(0, r * r - dx * dx)));

			// Bridge the vertical gap to the previous column:
			//   topY    = top of the bar at whichever column is higher on screen
			//   bottomY = arc position of whichever column is lower on screen
			// This ensures a 1-pixel-wide strip with no gaps, regardless of slope.
			const topY    = (prevArcY !== null ? Math.min(arcY, prevArcY) : arcY) - BAR_THICKNESS;
			const bottomY =  prevArcY !== null ? Math.max(arcY, prevArcY) : arcY;
			const h = bottomY - topY;

			// Skip strips fully outside the dirty rect.
			if (topY < dirtyY + dirtyH && bottomY > dirtyY) {
				// Progress fraction: 0 at left midpoint (x=0), 1 at right midpoint (x=width).
				const fraction = 1 - Math.acos(dx / r) / Math.PI;
				const color = fraction <= progress
					? assets.colors.progressFill
					: assets.colors.progressTrack;

				port.fillColor(color, px, topY, BAR_THICKNESS, h);
			}

			prevArcY = arcY;
		}
	}
}

// Full-screen overlay — circular clip naturally confines drawing to the screen shape.
const ProgressBar = Port.template($ => ({
	top: 0, bottom: 0, left: 0, right: 0,
	Behavior: ArcProgressBehavior,
}));

export default ProgressBar;
