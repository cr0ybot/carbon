/**
 * Icons
 *
 * Re-exports all icon codepoints as default and provides other icon-related
 * utilities.
 *
 * @module icons
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

import assets from "assets";

import codepoints from "./icons/codepoints";

const iconStyle = new Style(assets.styles.icons);

/**
 * Icon codepoints auto-generated from src/embeddedjs/assets/icons.icomoon.json
 * by scripts/gen-icons.js.
 *
 * Usage: import icons from "icons"; then icons.sun, icons.cloudRain, etc.
 */
export default codepoints;

/**
 * Label template with iconStyle baked in.
 *
 * Usage: IconLabel($, { string: icons.sun })
 */
export const IconLabel = Label.template($ => ({
	style: iconStyle,
}));
