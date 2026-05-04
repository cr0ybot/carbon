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
import {
	skins,
	styles,
} from "assets";

const BottomWidgetBarTemplate = Column.template($ => ({
	Behavior: $.controller.constructor.Behavior,
	skin: skins.bottomBar,
	style: styles.bottomBarIcons,
	contents: [
		Row($, {
			anchor: "TOP_ROW",
			height: Math.floor($.height / 2),
			left: Math.floor(screen.width / 6),
			right: Math.floor(screen.width / 6),
		}),
		Row($, {
			anchor: "BOTTOM_ROW",
			height: Math.floor($.height / 2),
			left: Math.floor(screen.width / 3),
			right: Math.floor(screen.width / 3),
		}),
	]
}));

class BottomWidgetBar extends WidgetBar {
	getIconStyle(slotAlign = "center") {
		return styles.bottomBarIcons;
	}

	getTextStyle(slotAlign = "center") {
		return styles.bottomBarText;
	}
	get Template() { return BottomWidgetBarTemplate; }

	renderSlots( container, slots ) {
		const slotW = Math.floor(screen.width / 3);
		const slotH = Math.floor(container.height / 2);
		const list = slots ?? [];

		// Mirrored arrangement: left/right on top, center below.
		this.makeSlot(list[0], container.TOP_ROW, slotW, slotH, "left", 0);
		this.makeSlot(list[2], container.TOP_ROW, slotW, slotH, "right", 2);
		this.makeSlot(list[1], container.BOTTOM_ROW, slotW, slotH, "center", 1);
	}
}

Object.freeze(BottomWidgetBar);

export default BottomWidgetBar;
