/**
 * Emery bottom widget bar
 *
 * Extends WidgetBar with emery-specific height.  No background skin
 * (transparent).  Slots are ordered left-to-right: slot 0 | slot 1 | slot 2 | slot 3 | slot 4
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
			slotWidth: Math.floor(screen.width / 5),
			style:     bottomBarStyle,
		});
	}
}
