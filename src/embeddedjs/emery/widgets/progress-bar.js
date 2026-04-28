/**
 * Progress bar stub
 *
 * A thin bar spanning the full width at the very bottom edge of the screen.
 * Filled proportion is driven by steps-toward-goal or battery percentage.
 *
 * Stub implementation shows a static 40 % fill.
 *
 * @module progress-bar
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

import assets from "assets";
import layout from "layout";

class ProgressBarBehavior extends Behavior {
	onCreate(port, data) {
		// TODO: drive from steps sensor or battery sensor
		this.progress = 0.4; // stub: 40 %
	}

	/** Call with a value 0–1 to update the bar without a full redraw. */
	setProgress(port, value) {
		this.progress = Math.max(0, Math.min(1, value));
		port.invalidate();
	}

	onDraw(port, x, y, w, h) {
		// Track
		port.fillColor(assets.colors.progressTrack, 0, 0, w, h);
		// Fill
		const fillW = Math.round(w * this.progress);
		if (fillW > 0) {
			port.fillColor(assets.colors.progressFill, 0, 0, fillW, h);
		}
	}
}

// Absolute overlay anchored to the bottom of the screen.
const ProgressBar = Port.template($ => ({
	bottom: 0, left: 0, right: 0,
	height: layout.progressBar.height,
	Behavior: ProgressBarBehavior,
}));

export default ProgressBar;
