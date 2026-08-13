/**
 * Time layer
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

#include "time_layer.h"
#include <stddef.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

struct TimeLayer {
	Layer *container;
	TextLayer *city_label;
	TextLayer *time_label;
	TextLayer *tz_label;   // timezone abbreviation, left of time
	TextLayer *ampm_label; // AM/PM indicator, right of time (12h only)
	TextLayer *date_label;
	char city_buf[24];
	char time_buf[8];
	char tz_buf[8];
	char tz_override[8]; // set by time_layer_set_timezone; overrides strftime
	char ampm_buf[4];
	char date_buf[32];
	Layer *big_layer; // draws the big glyphs; shown in Big Time mode only
	bool big;         // Big Time mode: HH:MM alone, small labels hidden
};

// Strokes making up each digit, traced from the firmware's own LECO bitmaps.
// The skeleton is close to a seven-segment one but not identical: strokes butt
// together into a continuous outline, 2/5/7 carry a short stub on the side
// opposite their counter, and 3's middle bar is inset from the left.
#define SEG_TOP 0x001
#define SEG_UR 0x002
#define SEG_LR 0x004
#define SEG_BOT 0x008
#define SEG_LL 0x010
#define SEG_UL 0x020
#define SEG_MID 0x040
#define SEG_UL_STUB 0x080  // upper-left, top 3/5 of the counter (2 and 7)
#define SEG_LL_STUB 0x100  // lower-left, bottom half of the counter (5)
#define SEG_MID_INSET 0x200 // middle bar starts 1/10 in from the left (3)
static const uint16_t s_digit_strokes[10] = {
    SEG_TOP | SEG_UR | SEG_LR | SEG_BOT | SEG_LL | SEG_UL,           // 0
    0,                                                               // 1
    SEG_TOP | SEG_UR | SEG_MID | SEG_LL | SEG_BOT | SEG_UL_STUB,     // 2
    SEG_TOP | SEG_UR | SEG_MID | SEG_LR | SEG_BOT | SEG_MID_INSET,   // 3
    SEG_UL | SEG_UR | SEG_MID | SEG_LR,                              // 4
    SEG_TOP | SEG_UL | SEG_MID | SEG_LR | SEG_BOT | SEG_LL_STUB,     // 5
    SEG_TOP | SEG_UL | SEG_MID | SEG_LL | SEG_LR | SEG_BOT,          // 6
    SEG_TOP | SEG_UR | SEG_LR | SEG_UL_STUB,                         // 7
    SEG_TOP | SEG_UR | SEG_LR | SEG_BOT | SEG_LL | SEG_UL | SEG_MID, // 8
    SEG_TOP | SEG_UL | SEG_UR | SEG_MID | SEG_LR | SEG_BOT,          // 9
};

// Upper counter : lower counter, as measured off the original (5:6).
#define TL_BIG_UPPER_NUM 5
#define TL_BIG_COUNTER_DEN 11

/** Height of the upper counter; the lower one takes the remainder. */
static int prv_upper_counter(void) {
	return (TL_BIG_DIGIT_H - 3 * TL_BIG_STROKE) * TL_BIG_UPPER_NUM /
	       TL_BIG_COUNTER_DEN;
}

/**
 * Draw one LECO digit into its cell.
 *
 * Every stroke is TL_BIG_STROKE wide and every corner is square; the shapes
 * are unions of axis-aligned rectangles, exactly as the original is.
 */
static void prv_draw_digit(GContext *ctx, int x, int y, int digit) {
	const int w = TL_BIG_DIGIT_W;
	const int h = TL_BIG_DIGIT_H;
	const int t = TL_BIG_STROKE;
	const int upper = prv_upper_counter();
	const int lower = (h - 3 * t) - upper;
	const int mid_y = y + t + upper; // top of the middle stroke

	// 1 is a nub over a centered stem on a full-width foot, all on the narrower
	// 3-stroke box the original gives it.
	if (digit == 1) {
		// The original's 1 sits on a 3-stroke box; clamp it to the cell so a
		// bolder-than-LECO stroke can't push it wider than the other digits.
		int box = (3 * t > w) ? w : 3 * t;
		int x1 = x + (w - box) / 2;
		graphics_fill_rect(ctx, GRect(x1, y, 2 * t, t), 0, GCornerNone);
		graphics_fill_rect(ctx, GRect(x1 + t, y, t, h - t), 0, GCornerNone);
		graphics_fill_rect(ctx, GRect(x1, y + h - t, box, t), 0, GCornerNone);
		return;
	}

	uint16_t segs = s_digit_strokes[digit];
	if (segs & SEG_TOP)
		graphics_fill_rect(ctx, GRect(x, y, w, t), 0, GCornerNone);
	if (segs & SEG_BOT)
		graphics_fill_rect(ctx, GRect(x, y + h - t, w, t), 0, GCornerNone);
	if (segs & SEG_MID) {
		int inset = (segs & SEG_MID_INSET) ? w / 10 : 0;
		graphics_fill_rect(ctx, GRect(x + inset, mid_y, w - inset, t), 0,
		                   GCornerNone);
	}
	if (segs & SEG_UL)
		graphics_fill_rect(ctx, GRect(x, y, t, mid_y + t - y), 0, GCornerNone);
	if (segs & SEG_UR)
		graphics_fill_rect(ctx, GRect(x + w - t, y, t, mid_y + t - y), 0,
		                   GCornerNone);
	if (segs & SEG_LL)
		graphics_fill_rect(ctx, GRect(x, mid_y, t, y + h - mid_y), 0,
		                   GCornerNone);
	if (segs & SEG_LR)
		graphics_fill_rect(ctx, GRect(x + w - t, mid_y, t, y + h - mid_y), 0,
		                   GCornerNone);
	if (segs & SEG_UL_STUB)
		graphics_fill_rect(ctx, GRect(x, y + t, t, upper * 3 / 5), 0,
		                   GCornerNone);
	if (segs & SEG_LL_STUB)
		graphics_fill_rect(ctx, GRect(x, y + h - t - lower / 2, t, lower / 2), 0,
		                   GCornerNone);
}

/**
 * Render the current time, centered in the layer.
 */
static void prv_big_update_proc(Layer *layer, GContext *ctx) {
	TimeLayer *tl = *(TimeLayer **)layer_get_data(layer);
	GRect bounds = layer_get_bounds(layer);

	// Width of the actual string — 12h hours lose their leading digit
	int total = 0;
	for (const char *p = tl->time_buf; *p; p++) {
		if (p != tl->time_buf)
			total += TL_BIG_GAP;
		total += (*p == ':') ? TL_BIG_COLON_W : TL_BIG_DIGIT_W;
	}

	const int t = TL_BIG_STROKE;
	const int upper = prv_upper_counter();
	const int lower = (TL_BIG_DIGIT_H - 3 * t) - upper;
	int x = (bounds.size.w - total) / 2;
	int y = (bounds.size.h - TL_BIG_DIGIT_H) / 2;
	graphics_context_set_fill_color(ctx, GColorWhite);
	for (const char *p = tl->time_buf; *p; p++) {
		if (*p == ':') {
			// Dots centered on each counter, square and stroke-sized
			int dot_x = x + (TL_BIG_COLON_W - t) / 2;
			graphics_fill_rect(
			    ctx, GRect(dot_x, y + t + (upper - t) / 2, t, t), 0,
			    GCornerNone);
			graphics_fill_rect(ctx,
			                   GRect(dot_x,
			                         y + TL_BIG_DIGIT_H - t - lower +
			                             (lower - t) / 2,
			                         t, t),
			                   0, GCornerNone);
			x += TL_BIG_COLON_W + TL_BIG_GAP;
		} else if (*p >= '0' && *p <= '9') {
			prv_draw_digit(ctx, x, y, *p - '0');
			x += TL_BIG_DIGIT_W + TL_BIG_GAP;
		}
	}
}

/**
 * Position the child labels for the active mode, centered in the container.
 *
 * Normal mode reproduces the city / time / date stack; Big Time mode hands the
 * block to big_layer. Visibility of the TZ and AM/PM labels stays with
 * time_layer_update, which knows the settings.
 */
static void prv_layout(TimeLayer *tl) {
	GRect bounds = layer_get_bounds(tl->container);
	int w = bounds.size.w;

	if (!tl->big) {
		int top = (bounds.size.h - TL_TIME_BLOCK_H) / 2;
		// Shift the time label up by TL_TIME_PAD so visible digits start flush
		// with city text
		int time_y = top + TL_SMALL_H - TL_TIME_PAD;
		// Center TZ/AMPM label within the visible digit area, skipping internal
		// font padding
		int tz_ampm_y =
		    time_y + TL_TIME_PAD + (TL_TIME_H - TL_TIME_PAD - TL_TZ_H) / 2;
		layer_set_frame(text_layer_get_layer(tl->city_label),
		                GRect(0, top, w, TL_SMALL_H));
		layer_set_frame(text_layer_get_layer(tl->time_label),
		                GRect(0, time_y, w, TL_TIME_H));
		layer_set_frame(text_layer_get_layer(tl->tz_label),
		                GRect(2, tz_ampm_y, 32, TL_TZ_H));
		layer_set_frame(text_layer_get_layer(tl->ampm_label),
		                GRect(w - 34, tz_ampm_y, 32, TL_TZ_H));
		layer_set_frame(text_layer_get_layer(tl->date_label),
		                GRect(0, time_y + TL_TIME_H, w, TL_SMALL_H));
	}

	layer_set_hidden(text_layer_get_layer(tl->city_label), tl->big);
	layer_set_hidden(text_layer_get_layer(tl->date_label), tl->big);
	layer_set_hidden(text_layer_get_layer(tl->time_label), tl->big);
	layer_set_hidden(tl->big_layer, !tl->big);
}

static void prv_remove_leading_zero(char *buf, size_t len) {
	bool prev_nondigit = true;
	size_t i = 0;
	while (buf[i]) {
		if (buf[i] == '0' && prev_nondigit) {
			memmove(&buf[i], &buf[i + 1], len - i - 1);
		} else {
			prev_nondigit = !(buf[i] >= '0' && buf[i] <= '9');
			i++;
		}
	}
}

TimeLayer *time_layer_create(GRect frame) {
	TimeLayer *tl = malloc(sizeof(TimeLayer));
	if (!tl)
		return NULL;

	tl->city_buf[0] = '\0';
	tl->time_buf[0] = '\0';
	tl->big = false;
	tl->tz_buf[0] = '\0';
	tl->tz_override[0] = '\0';
	tl->ampm_buf[0] = '\0';
	tl->date_buf[0] = '\0';

	tl->container = layer_create(frame);
	int w = frame.size.w;

	// All child frames are assigned by prv_layout() at the end of create and
	// again whenever Big Time mode is toggled.

	// City name — top, small font, full width centered
	GFont city_font = fonts_get_system_font(TL_SMALL_FONT_KEY);
	tl->city_label = text_layer_create(GRect(0, 0, w, TL_SMALL_H));
	text_layer_set_background_color(tl->city_label, GColorClear);
	text_layer_set_text_color(tl->city_label, GColorWhite);
	text_layer_set_font(tl->city_label, city_font);
	text_layer_set_text_alignment(tl->city_label, GTextAlignmentCenter);
	text_layer_set_text(tl->city_label, tl->city_buf);
	layer_add_child(tl->container, text_layer_get_layer(tl->city_label));

	// Time — large centered. LECO_60 on emery (>=228px); LECO_36_BOLD
	// everywhere else. TL_TIME_PAD is the internal top gap measured from each
	// font's line metrics.
	GFont time_font = fonts_get_system_font(TL_TIME_FONT_KEY);
	tl->time_label = text_layer_create(GRect(0, 0, w, TL_TIME_H));
	text_layer_set_background_color(tl->time_label, GColorClear);
	text_layer_set_text_color(tl->time_label, GColorWhite);
	text_layer_set_font(tl->time_label, time_font);
	text_layer_set_text_alignment(tl->time_label, GTextAlignmentCenter);
	text_layer_set_text(tl->time_label, tl->time_buf);
	layer_add_child(tl->container, text_layer_get_layer(tl->time_label));

	// Timezone — small font, left side of time row
	GFont small_font = fonts_get_system_font(FONT_KEY_GOTHIC_14);
	tl->tz_label = text_layer_create(GRect(2, 0, 32, TL_TZ_H));
	text_layer_set_background_color(tl->tz_label, GColorClear);
	text_layer_set_text_color(tl->tz_label, GColorLightGray);
	text_layer_set_font(tl->tz_label, small_font);
	text_layer_set_text_alignment(tl->tz_label, GTextAlignmentLeft);
	text_layer_set_text(tl->tz_label, tl->tz_buf);
	layer_add_child(tl->container, text_layer_get_layer(tl->tz_label));

	// AM/PM — small font, right side of time row
	tl->ampm_label = text_layer_create(GRect(w - 34, 0, 32, TL_TZ_H));
	text_layer_set_background_color(tl->ampm_label, GColorClear);
	text_layer_set_text_color(tl->ampm_label, GColorLightGray);
	text_layer_set_font(tl->ampm_label, small_font);
	text_layer_set_text_alignment(tl->ampm_label, GTextAlignmentRight);
	text_layer_set_text(tl->ampm_label, tl->ampm_buf);
	layer_add_child(tl->container, text_layer_get_layer(tl->ampm_label));

	// Date — below time
	GFont date_font = fonts_get_system_font(TL_SMALL_FONT_KEY);
	tl->date_label = text_layer_create(GRect(0, 0, w, TL_SMALL_H));
	text_layer_set_background_color(tl->date_label, GColorClear);
	text_layer_set_text_color(tl->date_label, GColorWhite);
	text_layer_set_font(tl->date_label, date_font);
	text_layer_set_text_alignment(tl->date_label, GTextAlignmentCenter);
	text_layer_set_text(tl->date_label, tl->date_buf);
	layer_add_child(tl->container, text_layer_get_layer(tl->date_label));

	// Segment digits — Big Time mode only, owns the whole block
	tl->big_layer = layer_create_with_data(GRect(0, 0, w, frame.size.h),
	                                       sizeof(TimeLayer *));
	*(TimeLayer **)layer_get_data(tl->big_layer) = tl;
	layer_set_update_proc(tl->big_layer, prv_big_update_proc);
	layer_add_child(tl->container, tl->big_layer);

	prv_layout(tl);

	return tl;
}

void time_layer_destroy(TimeLayer *layer) {
	if (!layer)
		return;
	text_layer_destroy(layer->date_label);
	text_layer_destroy(layer->ampm_label);
	text_layer_destroy(layer->tz_label);
	text_layer_destroy(layer->time_label);
	text_layer_destroy(layer->city_label);
	layer_destroy(layer->big_layer);
	layer_destroy(layer->container);
	free(layer);
}

Layer *time_layer_get_layer(TimeLayer *layer) {
	return layer ? layer->container : NULL;
}

void time_layer_set_timezone(TimeLayer *layer, const char *tz) {
	if (!layer || !tz)
		return;
	strncpy(layer->tz_override, tz, sizeof(layer->tz_override) - 1);
	layer->tz_override[sizeof(layer->tz_override) - 1] = '\0';
	// Immediately update the label so it shows even before the next tick
	text_layer_set_text(layer->tz_label, layer->tz_override[0]
	                                         ? layer->tz_override
	                                         : layer->tz_buf);
}

void time_layer_set_city(TimeLayer *layer, const char *city) {
	if (!layer || !city)
		return;
	strncpy(layer->city_buf, city, sizeof(layer->city_buf) - 1);
	layer->city_buf[sizeof(layer->city_buf) - 1] = '\0';
	text_layer_set_text(layer->city_label, layer->city_buf);
}

void time_layer_update(TimeLayer *layer, struct tm *tick_time,
                       const Settings *settings) {
	if (!layer || !tick_time || !settings)
		return;

	bool is_24h = clock_is_24h_style();

	if (settings->big_time != layer->big) {
		layer->big = settings->big_time;
		prv_layout(layer);
	}

	// Time string — same HH:MM in both modes; Big Time only changes the font.
	if (is_24h) {
		strftime(layer->time_buf, sizeof(layer->time_buf), "%H:%M", tick_time);
		strncpy(layer->ampm_buf, "24h", sizeof(layer->ampm_buf) - 1);
		layer->ampm_buf[sizeof(layer->ampm_buf) - 1] = '\0';
	} else {
		// 12h: format and strip leading zero
		char tmp[8];
		strftime(tmp, sizeof(tmp), "%I:%M", tick_time);
		const char *src = (tmp[0] == '0') ? tmp + 1 : tmp;
		strncpy(layer->time_buf, src, sizeof(layer->time_buf) - 1);
		layer->time_buf[sizeof(layer->time_buf) - 1] = '\0';
		// AM/PM
		strftime(layer->ampm_buf, sizeof(layer->ampm_buf), "%p", tick_time);
	}
	text_layer_set_text(layer->time_label, layer->time_buf);
	if (layer->big)
		layer_mark_dirty(layer->big_layer);
	text_layer_set_text(layer->ampm_label, layer->ampm_buf);
	layer_set_hidden(text_layer_get_layer(layer->ampm_label),
	                 !settings->show_ampm || layer->big);

	// Timezone abbreviation — use manual override if set (e.g. demo mode),
	// otherwise derive from strftime and hide numeric offsets or empty values.
	if (layer->tz_override[0]) {
		text_layer_set_text(layer->tz_label, layer->tz_override);
	} else {
		strftime(layer->tz_buf, sizeof(layer->tz_buf), "%Z", tick_time);
		bool tz_valid = (layer->tz_buf[0] >= 'A' && layer->tz_buf[0] <= 'Z') &&
		                (layer->tz_buf[1] >= 'A' && layer->tz_buf[1] <= 'Z');
		text_layer_set_text(layer->tz_label, tz_valid ? layer->tz_buf : "");
	}
	layer_set_hidden(text_layer_get_layer(layer->tz_label),
	                 !settings->show_timezone || layer->big);

	// Date — format string stored in settings; leading zeros stripped
	// automatically.
	strftime(layer->date_buf, sizeof(layer->date_buf), settings->date_format,
	         tick_time);
	prv_remove_leading_zero(layer->date_buf, sizeof(layer->date_buf));
	text_layer_set_text(layer->date_label, layer->date_buf);
}
