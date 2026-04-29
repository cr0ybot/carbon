/**
 * Icons
 *
 * Provides the `IconLabel` template — a Label with the IcoMoon icon font
 * style pre-applied.  Use kebab-case ligature strings as the `string` value.
 *
 * Usage:
 *   import { IconLabel } from "modules/icons";
 *   IconLabel.template($ => ({ string: "battery" }))
 *   label.string = "battery-charging";
 *
 * @module icons
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

import assets from "assets";

const iconStyle = new Style(assets.styles.icons);

/**
 * Label template with the icon font style baked in.
 *
 * Usage: IconLabel($, { string: battery })
 */
export const IconLabel = Label.template($ => ({
	style: iconStyle,
}));
