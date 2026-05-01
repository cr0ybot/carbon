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

const bottomBarStyle = new Style(assets.styles.icons);

const BottomWidgetBarTemplate = Column.template($ => ({
	Behavior: $.controller.constructor.Behavior,
	style: bottomBarStyle,
	contents: [
		Row($, {
			anchor: "TOP_ROW",
			height: Math.floor($.height / 2),
			// inset for 3-slot row
			left: Math.floor((screen.width - (screen.width / 4) * 3) / 2),
			right: Math.floor((screen.width - (screen.width / 4) * 3) / 2),
		}),
		Row($, {
			anchor: "BOTTOM_ROW",
			height: Math.floor($.height / 2),
			// inset for 2-slot row
			left: Math.floor((screen.width - (screen.width / 4) * 2) / 2),
			right: Math.floor((screen.width - (screen.width / 4) * 2) / 2),
		}),
	]
}));

class BottomWidgetBar extends WidgetBar {
	get Template() { return BottomWidgetBarTemplate; }

	renderSlots( container, slots ) {
		const slotW = Math.floor(screen.width / 4);
		const slotH = container.height / 2;
		// slots.forEach(spec => this.makeSlot(spec, container, slotW, slotH));
		// Row 1: slots 0-2
		const topRow = container.TOP_ROW;
		(slots ?? []).slice(0, 3).forEach(spec => this.makeSlot(spec, topRow, slotW, slotH));
		// Row 2: slots 3-4
		const bottomRow = container.BOTTOM_ROW;
		(slots ?? []).slice(3, 5).forEach(spec => this.makeSlot(spec, bottomRow, slotW, slotH));
	}
}

Object.freeze(BottomWidgetBar);

export default BottomWidgetBar;
