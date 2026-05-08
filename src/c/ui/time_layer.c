/**
 * Time layer
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

#include "time_layer.h"
#include <stdio.h>

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
};

static const char *prv_date_format(DateFormat fmt) {
	switch (fmt) {
	case DATE_FORMAT_WEEKDAY_MON_D:
		return "%A, %b"; // day appended manually
	case DATE_FORMAT_M_D_YYYY:
		return NULL; // built manually
	case DATE_FORMAT_D_MON_YYYY:
		return NULL; // built manually
	case DATE_FORMAT_ISO:
		return "%Y-%m-%d";
	case DATE_FORMAT_WEEKDAY_M_D:
	default:
		return NULL; // built manually
	}
}

TimeLayer *time_layer_create(GRect frame) {
	TimeLayer *tl = malloc(sizeof(TimeLayer));
	if (!tl)
		return NULL;

	tl->city_buf[0] = '\0';
	tl->time_buf[0] = '\0';
	tl->tz_buf[0] = '\0';
	tl->tz_override[0] = '\0';
	tl->ampm_buf[0] = '\0';
	tl->date_buf[0] = '\0';

	tl->container = layer_create(frame);
	int w = frame.size.w;

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
	// Shift the time label up by TL_TIME_PAD so visible digits start flush with
	// city text
	int time_y = TL_SMALL_H - TL_TIME_PAD;
	tl->time_label = text_layer_create(GRect(0, time_y, w, TL_TIME_H));
	text_layer_set_background_color(tl->time_label, GColorClear);
	text_layer_set_text_color(tl->time_label, GColorWhite);
	text_layer_set_font(tl->time_label, time_font);
	text_layer_set_text_alignment(tl->time_label, GTextAlignmentCenter);
	text_layer_set_text(tl->time_label, tl->time_buf);
	layer_add_child(tl->container, text_layer_get_layer(tl->time_label));

	// Timezone — small font, left side of time row
	GFont small_font = fonts_get_system_font(FONT_KEY_GOTHIC_14);
	// Center TZ/AMPM label within the visible digit area, skipping internal
	// font padding
	int tz_ampm_y =
	    time_y + TL_TIME_PAD + (TL_TIME_H - TL_TIME_PAD - TL_TZ_H) / 2;
	tl->tz_label = text_layer_create(GRect(2, tz_ampm_y, 32, TL_TZ_H));
	text_layer_set_background_color(tl->tz_label, GColorClear);
	text_layer_set_text_color(tl->tz_label, GColorLightGray);
	text_layer_set_font(tl->tz_label, small_font);
	text_layer_set_text_alignment(tl->tz_label, GTextAlignmentLeft);
	text_layer_set_text(tl->tz_label, tl->tz_buf);
	layer_add_child(tl->container, text_layer_get_layer(tl->tz_label));

	// AM/PM — small font, right side of time row
	tl->ampm_label = text_layer_create(GRect(w - 34, tz_ampm_y, 32, TL_TZ_H));
	text_layer_set_background_color(tl->ampm_label, GColorClear);
	text_layer_set_text_color(tl->ampm_label, GColorLightGray);
	text_layer_set_font(tl->ampm_label, small_font);
	text_layer_set_text_alignment(tl->ampm_label, GTextAlignmentRight);
	text_layer_set_text(tl->ampm_label, tl->ampm_buf);
	layer_add_child(tl->container, text_layer_get_layer(tl->ampm_label));

	// Date — below time
	int date_y = time_y + TL_TIME_H;
	GFont date_font = fonts_get_system_font(TL_SMALL_FONT_KEY);
	tl->date_label = text_layer_create(GRect(0, date_y, w, TL_SMALL_H));
	text_layer_set_background_color(tl->date_label, GColorClear);
	text_layer_set_text_color(tl->date_label, GColorWhite);
	text_layer_set_font(tl->date_label, date_font);
	text_layer_set_text_alignment(tl->date_label, GTextAlignmentCenter);
	text_layer_set_text(tl->date_label, tl->date_buf);
	layer_add_child(tl->container, text_layer_get_layer(tl->date_label));

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

	// Time string
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
	text_layer_set_text(layer->ampm_label, layer->ampm_buf);

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

	// Date — build without strftime's unreliable %-m/%-d flags
	const char *iso_fmt = prv_date_format(settings->date_format);
	if (iso_fmt) {
		// Pure strftime format (ISO, or "Weekday, Mon")
		strftime(layer->date_buf, sizeof(layer->date_buf), iso_fmt, tick_time);
		if (settings->date_format == DATE_FORMAT_WEEKDAY_MON_D) {
			// Append day number without leading zero
			char day_buf[4];
			snprintf(day_buf, sizeof(day_buf), " %d", tick_time->tm_mday);
			strncat(layer->date_buf, day_buf,
			        sizeof(layer->date_buf) - strlen(layer->date_buf) - 1);
		}
	} else {
		// Manual construction to avoid %-m/%-d portability issues
		int mon = tick_time->tm_mon + 1;
		int day = tick_time->tm_mday;
		int yr = tick_time->tm_year + 1900;
		char wday[12];
		strftime(wday, sizeof(wday), "%A", tick_time);
		char mon_abbr[6];
		strftime(mon_abbr, sizeof(mon_abbr), "%b", tick_time);

		switch (settings->date_format) {
		case DATE_FORMAT_WEEKDAY_M_D:
			snprintf(layer->date_buf, sizeof(layer->date_buf), "%s, %d/%d",
			         wday, mon, day);
			break;
		case DATE_FORMAT_M_D_YYYY:
			snprintf(layer->date_buf, sizeof(layer->date_buf), "%d/%d/%d", mon,
			         day, yr);
			break;
		case DATE_FORMAT_D_MON_YYYY:
			snprintf(layer->date_buf, sizeof(layer->date_buf), "%d %s %d", day,
			         mon_abbr, yr);
			break;
		default:
			snprintf(layer->date_buf, sizeof(layer->date_buf), "%s, %d/%d",
			         wday, mon, day);
			break;
		}
	}
	text_layer_set_text(layer->date_label, layer->date_buf);
}
