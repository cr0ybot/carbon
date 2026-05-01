/**
 * Emery top widget bar
 *
 * Extends WidgetBar with emery-specific height, background skin, and label
 * style.  Slot order (left → right): slot 0 | slot 1 | slot 2 | slot 3 | slot 4
 *
 * @module modules/top-widget-bar
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

import assets from "assets";
import WidgetBar, { WidgetBarTemplate } from "modules/widget-bar";

const topBarSkin  = new Skin(assets.skins.topBar);
const topBarStyle = new Style(assets.styles.icons);

const TopWidgetBarTemplate = WidgetBarTemplate.template($ => ({
	skin: topBarSkin,
	style: topBarStyle,
}));

class TopWidgetBar extends WidgetBar {
	get Template() { return TopWidgetBarTemplate; }
}

Object.freeze(TopWidgetBar);

export default TopWidgetBar;
