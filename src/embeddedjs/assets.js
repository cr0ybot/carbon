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
	time: "bold 42px Bitham",
	icons: "20px IcoMoon",
};

const assets = {
	fonts,
	skins: {
		black: { fill: "black" },
	},
	styles: {
		time: { color: "white", font: fonts.time },
		icons: { color: "white", font: fonts.icons },
	},
};

export default Object.freeze(assets);
