/**
 * Shared assets
 *
 * Exports both raw config (default) and pre-built Skin/Style instances
 * (named exports).  Import the named instances rather than calling
 * `new Style(...)` or `new Skin(...)` in individual modules — XS modules
 * are singletons, but each module that runs `new Style(assets.styles.xxx)`
 * still allocates its own Style object in the chunk pool at startup.
 * Centralising them here means each is allocated exactly once.
 *
 * @module assets
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

const fonts = Object.freeze({
	time:  "bold 72px Oswald",
	date:  "bold 24px Gothic",
	icons: "20px IcoMoon",
});

const palette = Object.freeze({
	BLACK:         "#000000",
	DARK_GREY:     "#555555",
	LIGHT_GRAY:    "#AAAAAA",
	WHITE:         "#FFFFFF",
	BLUE:          "#00AAFF",
	TRANSPARENT: "transparent",
});

const colors = Object.freeze({
	background:      palette.BLACK,
	topBar:          palette.DARK_GREY,
	graphBackground: palette.BLACK,
	graphBar:        palette.BLUE,
	graphDaylight:   palette.WHITE,
	slotMarker:      palette.LIGHT_GREY,
	progressTrack:   palette.DARK_GREY,
	progressFill:    palette.WHITE,
});

const assets = Object.freeze({
	fonts,
	palette,
	colors,
	skins: {
		background: { fill: colors.background },
		topBar:     { fill: colors.topBar },
		graph:      { fill: colors.graphBackground },
		progress:   { fill: colors.progressTrack },
	},
	styles: {
		time:  { color: palette.WHITE, font: fonts.time },
		date:  { color: palette.WHITE, font: fonts.date },
		icons: { color: palette.WHITE, font: fonts.icons },
	},
});

export default assets;

// Pre-built Style/Skin instances.
export const iconStyle      = new Style(assets.styles.icons);
export const dateStyle      = new Style(assets.styles.date);
export const timeStyle      = new Style(assets.styles.time);
export const backgroundSkin = new Skin(assets.skins.background);
export const topBarSkin     = new Skin(assets.skins.topBar);
export const graphSkin      = new Skin(assets.skins.graph);
export const progressSkin   = new Skin(assets.skins.progress);
