/**
 * WidgetBar base class
 *
 * JavaScript controller class for a widget bar section of the watchface.
 *
 * The constructor directly returns a Piu Content instance (`new this.Template`)
 * so call sites can use natural component-style syntax:
 *
 *   new TopWidgetBar(slots, coordinates)
 *
 * The controller instance is passed to template data as `controller`, then
 * recovered in Behavior via `data.controller`.  This keeps rendering logic on
 * the class instance (`renderSlots`, `makeSlot`) while preserving the normal
 * Piu template/behavior separation.
 *
 * Each entry in the `slots` array is either a descriptor `{ name, config }`
 * or `null` (spacer).
 *
 *   name   — widget module name without path prefix (e.g. `"battery"`).
 *             The `"widgets/"` prefix is prepended here so callers cannot
 *             inject an arbitrary module path.
 *   config — passed as instance data to the widget template constructor.
 *
 * Widget modules are loaded on demand via `importNow()` so unused widgets
 * never occupy memory.
 *
 * Subclasses override `get Template()` to return a Piu template constructor
 * appropriate for the platform (e.g. a single Row for emery, a two-row
 * Column for gabbro).  Layout props such as height, skin, and style belong
 * in the subclass template rather than the constructor.
 *
 * The `makeSlot()` helper imports the widget module by name, instantiates its
 * exported widget class, then adds the widget template to the row.
 *
 * @module widget-bar
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

class WidgetBarBehavior extends Behavior {
	onCreate(container, data) {
		this.controller = data?.controller;
		this.slots = data?.slots ?? [];
	}

	onDisplaying(container) {
		// Add widget slots to the container based on the provided data.
		if (this.controller)
			this.controller.renderSlots(container, this.slots);
	}
}

// Default container template for a widget bar (overridden by subclasses)
export const WidgetBarTemplate = Row.template($ => ({
	Behavior: $.controller.constructor.Behavior,
	left: 0, right: 0, height: 24,
}));

class WidgetBar {

	static get Behavior() { return WidgetBarBehavior; }

	/**
	 * Creates a concrete Piu bar container and returns it.
	 *
	 * Constructor return semantics are intentional: callers treat subclasses
	 * like Piu components (`new TopWidgetBar(slots, coords)`), while this class
	 * still serves as the controller for behavior-driven slot rendering.
	 *
	 * @param   {Array}  [slots=[]]       Array of `{ name, config } | null`.
	 * @param   {object} [coordinates={}] Standard Piu coordinates/properties.
	 * @returns {Content}                 Instantiated Piu container.
	 */
	constructor(slots = [], coordinates = {}) {
		return new this.Template({
			controller: this,
			slots,
		}, coordinates);
	}

	/**
	 * Returns the Piu template constructor for this bar.
	 * Subclasses override to provide their platform-specific layout.
	 * Called internally by the constructor.
	 */
	get Template() { return WidgetBarTemplate; }

	renderSlots( container, slots ) {
		const slotW = Math.floor(container.width / 5); // Assuming 5 slots max
		const slotH = container.height;
		slots.forEach(spec => this.makeSlot(spec, container, slotW, slotH));
	}

	/**
	 * Builds a single slot from a descriptor, sizing it to slotW × slotH.
	 *
	 * @param   {object|null} spec    `{ name, config }` descriptor or null (spacer).
	 * @param   {Content}     container The parent container to add the slot to.
	 * @param   {number}      slotW   Slot width in pixels.
	 * @param   {number}      slotH   Slot height in pixels.
	 * @returns {Content}     Piu content for the slot.
	 */
	makeSlot(spec, container, slotW, slotH) {
		if (spec) {
			const Widget = importNow("widgets/" + spec.name).default;
			container.add(new Widget(spec?.config, { width: slotW, height: slotH }));
			return;
		}

		// Spacer slot (empty content)
		container.add(new Content(null, { width: slotW, height: slotH }));
	}
}

Object.freeze(WidgetBar);

export default WidgetBar;
