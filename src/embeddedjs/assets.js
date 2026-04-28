/**
 * Shared assets
 *
 * Pure configuration used across the watchface.
 * Skin and Style instances are created at the point of use.
 *
 * @module assets
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

const fonts = {
	time:  "bold 42px Bitham",
	date:  "bold 18px Gothic",
	icons: "20px IcoMoon",
};

const assets = {
	fonts,
	skins: {
		black:   { fill: "black" },
		topBar:  { fill: "#1c1c1c" },
		graph:   { fill: "#080f18" },
		progress: { fill: "#2a2a2a" },
	},
	styles: {
		time:  { color: "white", font: fonts.time },
		date:  { color: "white", font: fonts.date },
		icons: { color: "white", font: fonts.icons },
	},
	// Color palette — used by Port drawing modules
	colors: {
		topBar:         "#1c1c1c",
		graphBackground:"#080f18",
		slotMarker:     "#333333",
		progressTrack:  "#2a2a2a",
		progressFill:   "white",
	},
};

export default Object.freeze(assets);
