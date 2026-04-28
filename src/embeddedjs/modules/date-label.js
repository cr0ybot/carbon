/**
 * Date label
 *
 * Displays the current date, updated on every `onClockChanged` event.
 * Default format: "Weekday, M/D"  e.g. "Tuesday, 4/28"
 *
 * @module date-label
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

import assets from "assets";

const dateStyle = new Style(assets.styles.date);

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatDate(date) {
	return `${DAYS[date.getDay()]}, ${date.getMonth() + 1}/${date.getDate()}`;
}

class DateBehavior extends Behavior {
	onClockChanged(label, date) {
		label.string = formatDate(date);
	}
}

const DateLabel = Label.template($ => ({
	anchor: "DATE",
	Behavior: DateBehavior,
	style: dateStyle,
	string: 'Day, 0/0',
}));

export default DateLabel;
