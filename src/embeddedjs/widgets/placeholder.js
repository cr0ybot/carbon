/**
 * Placeholder widget
 *
 * Debug stand-in for empty widget slots.  Renders either an icon codepoint
 * (default) or a short text string using the date style, depending on config.
 *
 * Config:
 *   string  — string to display (icon codepoint or short text)
 *   text    — if true, use the date style (for numbers/text); default is icon style
 *
 * @module widgets/placeholder
 * @todo Remove before release.
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

import assets from "assets";

const iconStyle = new Style(assets.styles.icons);
const dateStyle = new Style(assets.styles.date);

const Placeholder = Label.template($ => ({
	top:    $.text ? -3 : 0, // nudge up to better align with icons
	string: $.string ?? "\uF350", // thermometer by default
	style:  $.text ? dateStyle : iconStyle,
}));

export default Placeholder;
