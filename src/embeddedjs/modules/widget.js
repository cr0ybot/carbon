/**
 * Widget base class
 *
 * Provides the base API for all widget modules.  Subclasses override
 * `get Behavior()` and `get Template()` to supply a Piu Behavior class and
 * a Piu template constructor respectively.
 *
 * Modelled after the piuView.js pattern from the Moddable Pebble examples:
 * https://github.com/Moddable-OpenSource/pebble-examples/blob/4473374b41209ac4544449385b72383f01108ac4/piu/apps/words/src/embeddedjs/modules/piuView.js
 *
 * Usage:
 *   const MyTemplate = Label.template($ => ({
 *     Behavior: $.controller.constructor.Behavior,
 *     string:   "\uF000",
 *   }));
 *
 *   class MyWidget extends Widget {
 *     static get Behavior() { return MyBehavior; }
 *     get Template() { return MyTemplate; }
 *   }
 *   Object.freeze(MyWidget);
 *   export default MyWidget;
 *
 * WidgetBar.makeSlot() instantiates the widget class directly:
 *   new WidgetSubclass(config, coordinates)
 *
 * IMPORTANT: `get Template()` must return a pre-created template, never call
 * `.template()` inside the getter — that would invoke template creation at
 * render time, which crashes the Piu runtime on XS.
 *
 * @module modules/widget
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

/**
 * Base widget behavior class.
 */
class WidgetBehavior extends Behavior {
	onCreate(container, data) {
		this.data = data;
	}

	onDisplaying(container) {
		console.log(`${this.constructor.name} onDisplaying with data:`, JSON.stringify(this.data));
	}
}

const WidgetTemplate = Content.template($ => ({
	Behavior: $.controller.constructor.Behavior,
}));

class Widget {
	static get Behavior() { return WidgetBehavior; }

	constructor(data = {}, coordinates = {}) {
		this.data = data ?? {};
		return new this.Template({
			controller: this,
			...this.data,
		}, coordinates);
	}

	get Template() { return WidgetTemplate; }
}

Object.freeze(Widget);

export default Widget;
