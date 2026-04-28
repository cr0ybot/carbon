/**
 * Gabbro arc progress bar
 *
 * A full-screen Port overlay drawn BEHIND other content (place first in
 * Application contents).  Uses a standalone Poco renderer to draw two
 * concentric arcs — track (full bottom semicircle) then fill on top.
 *
 * Drawing model
 * ─────────────
 * `drawCircle` draws a filled sector/disk, so the ring is rendered in 3 steps:
 *   1. Track  — filled half-disk at radii R-4…R-1 (track color)
 *   2. Fill   — filled arc sector at same radii (fill color, overwrites track)
 *   3. Hollow — filled half-disk at radius R-BAR_THICKNESS-1 (background color)
 *              This punches out the inner hole to create the annular ring.
 *
 * Rendering note
 * ──────────────
 * Poco is called INSIDE Port's onDraw (which is itself inside Piu's render
 * pass).  Our render.begin()/end() flushes the arc to the frame buffer first;
 * Piu then draws the Column (clock, widget bars) on top.  ProgressBar must
 * remain the FIRST item in Application.contents so it is the lowest z-layer.
 *
 * @module gabbro/widgets/progress-bar
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

import Poco from "commodetto/Poco";
import assets from "assets";

const BAR_THICKNESS = 4;

// Parse a "#rrggbb" hex string to an array [r, g, b].
function parseHex(hex) {
	const h = hex.replace('#', '');
	return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

class ArcProgressBehavior extends Behavior {
	onCreate(content, data) {
		// TODO: drive from steps sensor or battery sensor
		this.progress = 0.4; // stub: 40%

		// Pre-encode colors using a Poco instance created once at startup.
		// makeColor() is a pure encoding call — no rendering occurs here.
		const poco = new Poco(screen);
		this.trackColor = poco.makeColor(...parseHex(assets.colors.progressTrack));
		this.fillColor  = poco.makeColor(...parseHex(assets.colors.progressFill));
		this.bgColor    = poco.makeColor(...parseHex(assets.colors.background));
		this.render     = poco;
	}

	/** Call with a value 0–1 to update the bar without a full redraw. */
	setProgress(content, value) {
		this.progress = Math.max(0, Math.min(1, value));
		content.invalidate();
	}

	onDraw(port, dirtyX, dirtyY, dirtyW, dirtyH) {
		const R  = screen.width / 2;  // outer radius — 130 on gabbro (260×260)
		const cx = R, cy = R;
		const { render, trackColor, fillColor, bgColor, progress } = this;

		render.begin(dirtyX, dirtyY, dirtyW, dirtyH);

		// 1. Full bottom semicircle in track color (solid half-disk, outer radius).
		render.drawCircle(trackColor, cx, cy, R, 90, 270);

		// 2. Fill arc on top (overwrites the portion that is "done").
		if (progress > 0) {
			const startAngle = 270 - 180 * progress;
			render.drawCircle(fillColor, cx, cy, R, startAngle, 270);
		}

		// 3. Hollow out the center: punch through with background color.
		render.drawCircle(bgColor, cx, cy, R - BAR_THICKNESS, 90, 270);

		render.end();
	}
}

// Full-screen overlay — placed FIRST in Application.contents so the Column
// (clock, widget bars, etc.) renders on top of the arc.
const ProgressBar = Port.template($ => ({
	top: 0, bottom: 0, left: 0, right: 0,
	Behavior: ArcProgressBehavior,
}));

export default ProgressBar;
