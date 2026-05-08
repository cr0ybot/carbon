/**
 * Time layer
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

#pragma once
#include "../modules/settings.h"
#include <pebble.h>

// Time block layout constants — all tweakable values live here.
// City and date always share the same font and height.
#if PBL_DISPLAY_HEIGHT <= 168
#define TL_SMALL_FONT_KEY FONT_KEY_GOTHIC_14
#define TL_SMALL_H 16
#else
#define TL_SMALL_FONT_KEY FONT_KEY_GOTHIC_18
#define TL_SMALL_H 22
#endif
// LECO_60 on emery (>=228px); LECO_36_BOLD everywhere else.
// TL_TIME_PAD is the internal top gap measured from each font's line metrics.
#if PBL_DISPLAY_HEIGHT >= 228
#define TL_TIME_FONT_KEY FONT_KEY_LECO_60_NUMBERS_AM_PM
#define TL_TIME_H 62
#define TL_TIME_PAD 14
#else
#define TL_TIME_FONT_KEY FONT_KEY_LECO_36_BOLD_NUMBERS
#define TL_TIME_H 40
#define TL_TIME_PAD 4
#endif
// Height of the TZ / AM-PM labels (GOTHIC_14, constant across platforms)
#define TL_TZ_H 18
// Total visible block height used by main.c to size the layer frame.
// Derived automatically so it can never fall out of sync with the values above.
#define TL_TIME_BLOCK_H ((TL_SMALL_H - TL_TIME_PAD) + TL_TIME_H + TL_SMALL_H)

typedef struct TimeLayer TimeLayer;

TimeLayer *time_layer_create(GRect frame);
void time_layer_destroy(TimeLayer *layer);
Layer *time_layer_get_layer(TimeLayer *layer);
void time_layer_set_city(TimeLayer *layer, const char *city);
// Override the timezone abbreviation shown left of the clock. Pass an empty
// string to revert to the system-derived value from strftime.
void time_layer_set_timezone(TimeLayer *layer, const char *tz);
// settings is used for date_format only; 24h is read from clock_is_24h_style()
void time_layer_update(TimeLayer *layer, struct tm *tick_time,
                       const Settings *settings);
