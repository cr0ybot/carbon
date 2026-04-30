/**
 * Gabbro bottom widget bar
 *
 * Extends WidgetBar with a two-row layout that spans the full screen width.
 * The circular display clips bar corners naturally; no explicit inset needed.
 * No background skin (transparent).
 *
 * Row layout (5 slots total):
 *   Row 1 (3 slots, ~1/2 screen width, centered): slot 0 | slot 1 | slot 2
 *   Row 2 (2 slots, ~1/3 screen width, centered): slot 3 | slot 4
 *
 * The rows are horizontally centered with insets sized to keep content
 * within the visible circle at the bottom of the screen.
 *
 * @module modules/bottom-widget-bar
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

import WidgetBar from "modules/widget-bar";
import assets from "assets";
import layout from "layout";

const bottomBarStyle = new Style(assets.styles.icons);

export default class BottomWidgetBar extends WidgetBar {
	constructor() {
		super({
			...layout.bottomBar,
			slotHeight: Math.floor(layout.bottomBar.height / 2) - 4,
			offset:	    layout.bottomBar.offset,
			style:      bottomBarStyle,
		});
	}

	render(slots) {
		const rowH  = this._slotHeight;
		const slotW = Math.floor(screen.width / 4);
		const in3   = Math.floor((screen.width - slotW * 3) / 2); // inset for 3-slot row
		const in2   = Math.floor((screen.width - slotW * 2) / 2); // inset for 2-slot row
		const dict  = {
			top: this._offset,
			left: this._inset,
			right: this._inset,
			height: this._height,
		};
		if (this._style) dict.style = this._style;
		dict.contents = [
			Row(null, {
				left: in3, right: in3, height: rowH,
				contents: (slots ?? []).slice(0, 3).map(s => this._makeSlot(s, slotW, rowH)),
			}),
			Row(null, {
				left: in2, right: in2, height: rowH,
				contents: (slots ?? []).slice(3, 5).map(s => this._makeSlot(s, slotW, rowH)),
			}),
		];
		return Column(null, dict);
	}
}
