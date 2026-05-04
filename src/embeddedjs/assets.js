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
	LIGHT_GREY:    "#AAAAAA",
	WHITE:         "#FFFFFF",
	BLUE:          "#00AAFF",
	PINK:          "#FFAAFF",
	PURPLE:        "#AAAAFF",
	CYAN:          "#AAFFFF",
	TEAL:          "#00FFAA",
	GREEN:         "#AAFF00",
	YELLOW:        "#FFFF55",
	ORANGE:        "#FFAA00",
	RED:           "#FF0000",
	TRANSPARENT:   "transparent",
});

const colors = Object.freeze({
	background:           palette.BLACK,
	topBar:               palette.BLUE,
	graphBackground:      palette.BLACK,
	graphBar:             palette.BLUE,
	graphTempLine:        palette.RED,
	graphTempExtremeCold: palette.PINK,
	graphTempFreeze:      palette.PURPLE,
	graphTempColdA:       palette.CYAN,
	graphTempColdB:       palette.TEAL,
	graphTempMild:        palette.GREEN,
	graphTempWarm:        palette.YELLOW,
	graphTempHot:         palette.ORANGE,
	graphTempExtremeHot:  palette.RED,
	graphDaylightBg:      palette.DARK_GREY,
	graphDaylight:        palette.WHITE,
	slotMarker:           palette.LIGHT_GREY,
	progressTrack:        palette.DARK_GREY,
	progressFill:         palette.WHITE,
});

// Skins and styles are frozen with `deep: true` to prevent accidental mutation of nested objects.

const skins = Object.freeze({
	background: new Skin({ fill: colors.background }),
	topBar:     new Skin({ fill: colors.topBar }),
	graph:      new Skin({ fill: colors.graphBackground }),
	progress:   new Skin({ fill: colors.progressTrack }),
}, true);

const styles = Object.freeze({
	time:           new Style({ color: palette.WHITE, font: fonts.time }),
	date:           new Style({ color: palette.LIGHT_GREY, font: fonts.date }),
	topBarIcons:    new Style({ color: palette.BLACK, font: fonts.icons, horizontal: "center" }),
	topBarText:     new Style({ color: palette.BLACK, font: fonts.date, horizontal: "center" }),
	bottomBarIcons: new Style({ color: palette.WHITE, font: fonts.icons, horizontal: "center" }),
	bottomBarText:  new Style({ color: palette.WHITE, font: fonts.date, horizontal: "center" }),
}, true);

export { colors, skins, styles };
