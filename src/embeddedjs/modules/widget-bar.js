/**
 * Widget bars — top (with background) and bottom (transparent)
 *
 * STUB: placeholder Content blocks sized to the correct heights.
 * Will be replaced with Port-based drawing (and arc-inset slot layout
 * for gabbro) once the individual widget modules exist.
 *
 * @module widget-bar
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

import assets from "assets";
import layout from "layout";

const topBarSkin = new Skin(assets.skins.topBar);

export const TopWidgetBar = Content.template($ => ({
	height: layout.topBar.height,
	left: 0, right: 0,
	skin: topBarSkin,
}));

export const BottomWidgetBar = Content.template($ => ({
	height: layout.bottomBar.height,
	left: 0, right: 0,
}));
