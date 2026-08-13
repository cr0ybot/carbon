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
// Total visible block height of the normal city/time/date stack.
// Derived automatically so it can never fall out of sync with the values above.
#define TL_TIME_BLOCK_H ((TL_SMALL_H - TL_TIME_PAD) + TL_TIME_H + TL_SMALL_H)
// Big Time mode: HH:MM drawn as LECO digits, with the city / date / TZ / AM-PM
// labels hidden. No system font goes above LECO_60 and none of it can be
// scaled, so the glyphs are constructed here instead — unions of axis-aligned
// rectangles on a stroke skeleton traced from the firmware's own LECO bitmaps.
// Corners are square: LECO has no chamfers.
//
// The counter split of 5:6 is measured off those bitmaps. Stroke runs a little
// heavier than the original's 3/10 of the digit width. Digit height is the one
// liberty taken: true LECO proportions would make an 80px digit 55px wide, and
// four of those plus a colon do not fit 200px, so the glyphs are stretched
// vertically instead. Set TL_BIG_DIGIT_H to 55 (emery) for exact LECO
// proportions at a smaller size.
//
// TL_BIG_DIGIT_W/H  digit cell
// TL_BIG_STROKE     stroke width, held constant across every glyph
// TL_BIG_GAP        space between glyph cells
// TL_BIG_COLON_W    width of the colon cell
#if PBL_DISPLAY_HEIGHT >= 228
#define TL_BIG_DIGIT_W 38
#define TL_BIG_DIGIT_H 80
#define TL_BIG_STROKE 13
#define TL_BIG_GAP 6
#define TL_BIG_COLON_W 13
#else
#define TL_BIG_DIGIT_W 27
#define TL_BIG_DIGIT_H 56
#define TL_BIG_STROKE 10
#define TL_BIG_GAP 4
#define TL_BIG_COLON_W 10
#endif

typedef struct TimeLayer TimeLayer;

// frame is the whole band available between the graph group and the temp
// block; contents are centered within it for whichever mode is active.
TimeLayer *time_layer_create(GRect frame);
void time_layer_destroy(TimeLayer *layer);
Layer *time_layer_get_layer(TimeLayer *layer);
void time_layer_set_city(TimeLayer *layer, const char *city);
// Override the timezone abbreviation shown left of the clock. Pass an empty
// string to revert to the system-derived value from strftime.
void time_layer_set_timezone(TimeLayer *layer, const char *tz);
// settings is used for date_format, label visibility and big_time; 24h is read
// from clock_is_24h_style(). Toggling big_time re-lays out the block here.
void time_layer_update(TimeLayer *layer, struct tm *tick_time,
                       const Settings *settings);
