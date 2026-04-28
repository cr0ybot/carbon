/**
 * Precipitation graph — 24-hour bar chart stub
 *
 * STUB: placeholder Content block sized to the correct height.
 * Will be replaced with a Port that draws precipitation bars (top-down),
 * a daytime line (6 am – 6 pm relative to now), and a "now" left edge marker.
 *
 * @module precip-graph
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

import assets from "assets";
import layout from "layout";

const graphSkin = new Skin(assets.skins.graph);

const PrecipGraph = Content.template($ => ({
	height: layout.precipGraph.height,
	left: 0, right: 0,
	skin: graphSkin,
}));

export default PrecipGraph;
