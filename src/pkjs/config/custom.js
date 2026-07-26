/**
 * Clay custom function
 *
 * Runs inside the config page after the form is built.
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 */

module.exports = function (minified) {
	var clayConfig = this;

	clayConfig.on(clayConfig.EVENTS.AFTER_BUILD, function () {
		var detectLocationToggle = clayConfig.getItemByMessageKey('SETTING_GEOCODE_ENABLED');
		var overrideLocationInput = clayConfig.getItemByMessageKey('SETTING_LOCATION_OVERRIDE');
		if (!detectLocationToggle || !overrideLocationInput) return;

		/**
		 * Tie the "Custom Location Text" input to the "Detect Location Name"
		 * toggle--the custom text is only editable while detection is off.
		 */
		function updateOverrideState() {
			if (detectLocationToggle.get()) {
				overrideLocationInput.hide();
			} else {
				overrideLocationInput.show();
			}
		}

		detectLocationToggle.on('change', updateOverrideState);
		updateOverrideState();
	});
};
