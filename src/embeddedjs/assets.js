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

const palette = {
	BLACK: "#000000",
	DARK_GREY: "#555555",
	LIGHT_GRAY: "#AAAAAA",
	WHITE: "#FFFFFF",
	TRANSPARENT: "transparent",
};

const colors = {
	background:     palette.BLACK,
	topBar:         palette.DARK_GREY,
	graphBackground:palette.BLACK,
	slotMarker:     palette.LIGHT_GREY,
	progressTrack:  palette.DARK_GREY,
	progressFill:   palette.WHITE,
};

const assets = {
	fonts,
	palette,
	colors,
	skins: {
		background:   { fill: colors.background },
		topBar:  { fill: colors.topBar },
		graph:   { fill: colors.graphBackground },
		progress: { fill: colors.progressTrack },
	},
	styles: {
		time:  { color: palette.WHITE, font: fonts.time },
		date:  { color: palette.WHITE, font: fonts.date },
		icons: { color: palette.WHITE, font: fonts.icons },
	},
};

export default Object.freeze(assets);
