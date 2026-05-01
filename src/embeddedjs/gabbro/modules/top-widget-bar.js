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
