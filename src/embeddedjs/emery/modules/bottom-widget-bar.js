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

import assets from "assets";
import WidgetBar, { WidgetBarTemplate } from "modules/widget-bar";

const bottomBarStyle = new Style(assets.styles.icons);

const BottomWidgetBarTemplate = WidgetBarTemplate.template($ => ({
	style: bottomBarStyle,
}));

class BottomWidgetBar extends WidgetBar {
	get Template() { return BottomWidgetBarTemplate; }
}

Object.freeze(BottomWidgetBar);

export default BottomWidgetBar;
