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

import Widget from "modules/widget";
import assets from "assets";

const iconStyle = new Style(assets.styles.icons);
const dateStyle = new Style(assets.styles.date);

// Template created once at module init — never inside a getter or template body.
const PlaceholderTemplate = Label.template($ => ({
	top:    $.text ? -1 : 0, // nudge up to better align with icons
	string: $.string ?? "\uF350", // thermometer by default
	style:  $.text ? dateStyle : iconStyle,
}));

class PlaceholderWidget extends Widget {
	get Template() { return PlaceholderTemplate; }
}

Object.freeze(PlaceholderWidget);
export default PlaceholderWidget;
