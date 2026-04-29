/**
 * WidgetBar base class
 *
 * JavaScript class that builds an ordered list of widget slots for a bar
 * section of the watchface.  Each entry in the slots array passed to
 * `render()` is either a slot descriptor `{ name, config }` or `null`
 * (spacer).
 *
 *   name   — widget module name without path prefix (e.g. `"battery"`).
 *             The `"widgets/"` prefix is prepended here so callers cannot
 *             inject an arbitrary module path.
 *   config — passed as instance data to the widget template constructor.
 *
 * Widget modules are loaded on demand via `importNow()` so unused widgets
 * never occupy memory.
 *
 * Subclasses supply bar-specific constructor parameters (height, slotWidth,
 * skin, style, inset) and may override `render()` for platform-specific
 * layout (e.g. gabbro arc-chord clipping).
 *
 * Note: `Column` is used as the slot wrapper rather than `Container` because
 * `Container` requires a native host binding that is not registered on all
 * Pebble platforms. For a single-child slot, `Column` is equivalent.
 *
 * @module widget-bar
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

export default class WidgetBar {
	/**
	 * @param {object} options
	 * @param {number} options.height        - Bar height in pixels.
	 * @param {number} options.slotWidth     - Width of each slot in pixels.
	 * @param {Skin}   [options.skin=null]   - Background skin for the bar Row.
	 * @param {Style}  [options.style=null]  - Label style inherited by slot contents.
	 * @param {number} [options.inset=0]     - Horizontal inset (px) for circular screens.
	 */
	constructor({ height, slotWidth, skin = null, style = null, inset = 0 }) {
		this._height    = height;
		this._slotWidth = slotWidth;
		this._skin      = skin;
		this._style     = style;
		this._inset     = inset;
	}

	_makeSlot(spec) {
		if (!spec) {
			return Content(null, { width: this._slotWidth, height: this._height });
		}
		const Widget = importNow("widgets/" + spec.name).default;
		const dict = {
			width:    this._slotWidth,
			height:   this._height,
			contents: [ Widget(spec.config ?? null, {}) ],
		};
		if (this._style) dict.style = this._style;
		return Column(null, dict);
	}

	/**
	 * Builds the bar Row from an array of slot descriptors.
	 *
	 * Override in subclasses to apply platform-specific geometry
	 * (e.g. arc-chord slot layout on gabbro).
	 *
	 * @param   {Array} slots  Array of `{ name, config } | null` descriptors.
	 * @returns {Row}   Piu Row content.
	 */
	render(slots) {
		const dict = {
			height: this._height,
			left:   this._inset,
			right:  this._inset,
			contents: (slots ?? []).map(spec => this._makeSlot(spec)),
		};
		if (this._skin) dict.skin = this._skin;
		return Row(null, dict);
	}
}
