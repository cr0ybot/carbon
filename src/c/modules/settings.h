/**
 * Settings module
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

#pragma once
#include <pebble.h>

typedef enum {
	BATTERY_DISPLAY_ICON = 0,
	BATTERY_DISPLAY_PERCENT,
} BatteryDisplay;

typedef struct {
	bool temp_unit_celsius;
	char date_format[32];
	GColor accent_color;
	BatteryDisplay battery_display;
} Settings;

void settings_init(void);
Settings *settings_get(void);
void settings_save(void);
void settings_apply_from_message(DictionaryIterator *iter);
