/**
 * Settings module
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

#include "settings.h"

#define STORAGE_KEY_SETTINGS 0

static Settings s_settings;

static const Settings s_defaults = {
    .temp_unit_celsius = true,
    .date_format = "%A, %m/%d",
    .accent_color = {.argb = 0b11111111}, // GColorWhite
    .battery_display = BATTERY_DISPLAY_ICON,
};

void settings_init(void) {
	s_settings = s_defaults;
	if (persist_exists(STORAGE_KEY_SETTINGS) &&
	    persist_get_size(STORAGE_KEY_SETTINGS) == (int)sizeof(s_settings)) {
		persist_read_data(STORAGE_KEY_SETTINGS, &s_settings,
		                  sizeof(s_settings));
	}
}

Settings *settings_get(void) { return &s_settings; }

void settings_save(void) {
	persist_write_data(STORAGE_KEY_SETTINGS, &s_settings, sizeof(s_settings));
}

void settings_apply_from_message(DictionaryIterator *iter) {
	Tuple *t;

	t = dict_find(iter, MESSAGE_KEY_SETTING_TEMP_UNIT);
	if (t)
		s_settings.temp_unit_celsius = (t->value->int8 == 0);

	t = dict_find(iter, MESSAGE_KEY_SETTING_DATE_FORMAT);
	if (t && t->type == TUPLE_CSTRING && t->length > 0) {
		strncpy(s_settings.date_format, t->value->cstring,
		        sizeof(s_settings.date_format) - 1);
		s_settings.date_format[sizeof(s_settings.date_format) - 1] = '\0';
	}

	t = dict_find(iter, MESSAGE_KEY_SETTING_ACCENT_COLOR);
	if (t) {
		s_settings.accent_color = GColorFromHEX(t->value->int32);
	}

	t = dict_find(iter, MESSAGE_KEY_SETTING_BATTERY_DISPLAY);
	if (t) {
		int bd = (int)t->value->int8;
		if (bd >= 0 && bd < 2) {
			s_settings.battery_display = (BatteryDisplay)bd;
		}
	}

	settings_save();
}
