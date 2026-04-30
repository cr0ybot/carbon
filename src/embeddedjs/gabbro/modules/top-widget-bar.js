/**
 * Gabbro top widget bar
 *
 * Extends WidgetBar with a two-row layout that spans the full screen width.
 * The circular display clips bar corners naturally; no explicit inset needed.
 *
 * Row layout (5 slots total):
 *   Row 1 (2 slots, ~1/3 screen width, centered): slot 0 | slot 1
 *   Row 2 (3 slots, ~1/2 screen width, centered): slot 2 | slot 3 | slot 4
 *
 * The rows are horizontally centered with insets sized to keep content
 * within the visible circle at the top of the screen.
 *
 * @module modules/top-widget-bar
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

import WidgetBar from "modules/widget-bar";
import assets from "assets";
import layout from "layout";

const topBarSkin  = new Skin(assets.skins.topBar);
const topBarStyle = new Style(assets.styles.icons);

export default class TopWidgetBar extends WidgetBar {
	constructor() {
		super({
			...layout.topBar,
			slotHeight: Math.floor(layout.topBar.height / 2),
			skin:       topBarSkin,
			style:      topBarStyle,
		});
	}

	render(slots) {
		const rowH  = this._slotHeight;
		const slotW = Math.floor(screen.width / 4);
		const in2   = Math.floor((screen.width - slotW * 2) / 2); // inset for 2-slot row
		const in3   = Math.floor((screen.width - slotW * 3) / 2); // inset for 3-slot row
		const dict  = { left: 0, right: 0, height: this._height };
		if (this._skin)  dict.skin  = this._skin;
		if (this._style) dict.style = this._style;
		dict.contents = [
			Row(null, {
				top: 8, left: in2, right: in2, height: rowH,
				contents: (slots ?? []).slice(0, 2).map(s => this._makeSlot(s, slotW, rowH)),
			}),
			Row(null, {
				left: in3, right: in3, height: rowH,
				contents: (slots ?? []).slice(2, 5).map(s => this._makeSlot(s, slotW, rowH)),
			}),
		];
		return Column(null, dict);
	}
}
