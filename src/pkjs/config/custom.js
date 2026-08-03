/**
 * Clay custom function.
 */

module.exports = function () {
	var clayConfig = this;

	function normalizeBool(value) {
		if (value === 'false' || value === '0' || value === 0) return false;
		if (value === 'true' || value === '1' || value === 1) return true;
		return !!value;
	}

	function isBlank(value) {
		return value === null || value === undefined || String(value).trim() === '';
	}

	/**
	 * Controls visibility of static coordinate inputs and pre-fills them from
	 * userData when static mode is enabled and fields are blank.
	 */
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

	/**
	 * Controls visibility of location name override.
	 */
	function applyGeocodeVisibility() {
		var geocodeEnabledItem = clayConfig.getItemByMessageKey('SETTING_GEOCODE_ENABLED');
		var locationOverrideItem = clayConfig.getItemByMessageKey('SETTING_LOCATION_OVERRIDE');
		if (!geocodeEnabledItem || !locationOverrideItem) return;

		var geocodeEnabled = normalizeBool(geocodeEnabledItem.get());
		if (geocodeEnabled) {
			locationOverrideItem.hide();
			return;
		}

		locationOverrideItem.show();
	}

	/**
	 * Controls visibility of developer-oriented advanced options.
	 */
	function applyAdvancedVisibility() {
		var showAdvancedItem = clayConfig.getItemByMessageKey('SETTING_SHOW_ADVANCED_OPTIONS');
		var clearCacheItem = clayConfig.getItemByMessageKey('SETTING_CLEAR_CACHE');
		if (!showAdvancedItem || !clearCacheItem) return;

		if (normalizeBool(showAdvancedItem.get())) {
			clearCacheItem.show();
			return;
		}

		clearCacheItem.hide();
	}

	clayConfig.on(clayConfig.EVENTS.AFTER_BUILD, function () {
		var geocodeEnabledItem = clayConfig.getItemByMessageKey('SETTING_GEOCODE_ENABLED');
		var useStaticItem = clayConfig.getItemByMessageKey('SETTING_USE_STATIC_LOCATION');
		var showAdvancedItem = clayConfig.getItemByMessageKey('SETTING_SHOW_ADVANCED_OPTIONS');
		if (!geocodeEnabledItem || !useStaticItem || !showAdvancedItem) return;

		applyGeocodeVisibility();
		geocodeEnabledItem.on('change', applyGeocodeVisibility);

		applyStaticLocationVisibility();
		useStaticItem.on('change', applyStaticLocationVisibility);

		applyAdvancedVisibility();
		showAdvancedItem.on('change', applyAdvancedVisibility);
	});
};
