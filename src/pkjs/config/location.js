/**
 * Clay custom function: location settings behavior.
 *
 * Controls visibility of static coordinate inputs and pre-fills them from
 * userData when static mode is enabled and fields are blank.
 */

module.exports = function() {
	var clayConfig = this;

	function normalizeBool(value) {
		if (value === 'false' || value === '0' || value === 0) return false;
		if (value === 'true' || value === '1' || value === 1) return true;
		return !!value;
	}

	function isBlank(value) {
		return value === null || value === undefined || String(value).trim() === '';
	}

	function applyStaticLocationVisibility() {
		var useStaticItem = clayConfig.getItemByMessageKey('SETTING_USE_STATIC_LOCATION');
		var latItem = clayConfig.getItemByMessageKey('SETTING_STATIC_LAT');
		var lonItem = clayConfig.getItemByMessageKey('SETTING_STATIC_LON');
		if (!useStaticItem || !latItem || !lonItem) return;

		var useStatic = normalizeBool(useStaticItem.get());
		if (!useStatic) {
			latItem.hide();
			lonItem.hide();
			return;
		}

		latItem.show();
		lonItem.show();

		var userData = clayConfig.meta.userData || {};
		if (isBlank(latItem.get()) && userData.lastKnownLat !== undefined && userData.lastKnownLat !== null) {
			latItem.set(String(userData.lastKnownLat));
		}
		if (isBlank(lonItem.get()) && userData.lastKnownLon !== undefined && userData.lastKnownLon !== null) {
			lonItem.set(String(userData.lastKnownLon));
		}
	}

	clayConfig.on(clayConfig.EVENTS.AFTER_BUILD, function() {
		var useStaticItem = clayConfig.getItemByMessageKey('SETTING_USE_STATIC_LOCATION');
		if (!useStaticItem) return;

		applyStaticLocationVisibility();
		useStaticItem.on('change', applyStaticLocationVisibility);
	});
};
