/**
 * Main Carbon watchface entry point.
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

import icons, { IconLabel } from "icons";
import assets from "assets";

const blackSkin = new Skin(assets.skins.black);
const timeStyle = new Style(assets.styles.time);

const TEST_ICONS = [
	icons.sun,
	icons.cloudRain,
	icons.bluetooth,
	icons.heartPulse,
	icons.battery,
];

//
// Behaviors
//

class CarbonBehavior {
	onDisplaying(application) {
		const now = new Date();
		application.distribute("onClockChanged", { date: now });
		watch.addEventListener("minutechange", (e) => {
			application.distribute("onClockChanged", e);
		});
	}
	onClockChanged(application, clock) {
		const date = clock.date;
		const h = String(date.getHours()).padStart(2, "0");
		const m = String(date.getMinutes()).padStart(2, "0");
		application.first.first.string = `${h}:${m}`;
	}
}

//
// Application
//

const CarbonApplication = Application.template($ => ({
	skin: blackSkin,
	Behavior: CarbonBehavior,
	contents: [
		Column($, {
			top: 0, bottom: 0, left: 0, right: 0,
			contents: [
				Label($, {
					left: 0, right: 0,
					style: timeStyle,
					string: "00:00",
				}),
				Row($, {
					left: 0, right: 0,
					contents: TEST_ICONS.map(char =>
						IconLabel($, { string: char })
					),
				}),
			],
		}),
	],
}));

export default new CarbonApplication(null, {
	displayListLength: 2048,
	touchCount: 0,
	pixels: screen.width * 4,
});
