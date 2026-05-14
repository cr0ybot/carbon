/**
 * Main watchface entry point
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

#include "modules/demo.h"
#include "modules/settings.h"
#include "modules/weather.h"
#include "ui/cloud_layer.h"
#include "ui/daylight_layer.h"
#include "ui/event_layer.h"
#include "ui/graph_common.h"
#include "ui/icon_bar_layer.h"
#include "ui/precip_layer.h"
#include "ui/temp_layer.h"
#include "ui/time_layer.h"
#include <pebble.h>

// Storage key for persisting last-received weather across cold starts
#define STORAGE_KEY_WEATHER 2

// GRAPH_LAYERS_H is the combined height of daylight+cloud+precip+event — also
// used for the icon bar overlay and the temp layer so all three match. Must be
// tall enough to fit the icon slots: >= 228 uses 22px icons (need 66px+),
// middle tier uses 18px icons (56px gives zone_h=18), small uses 14px icons.
#if PBL_DISPLAY_HEIGHT >= 228
#define DAYLIGHT_H 11
#define CLOUD_H 17
#define PRECIP_H 26
#define EVENT_H 12
// Sums to 66
#elif PBL_DISPLAY_HEIGHT <= 168
#define DAYLIGHT_H 9
#define CLOUD_H 13
#define PRECIP_H 11
#define EVENT_H 12
// Sums to 45
#else
#define DAYLIGHT_H 11
#define CLOUD_H 16
#define PRECIP_H 17
#define EVENT_H 12
// Sums to 56
#endif
#define GRAPH_LAYERS_H (DAYLIGHT_H + CLOUD_H + PRECIP_H + EVENT_H)

static Window *s_main_window;
static DaylightLayer *s_daylight_layer;
static CloudLayer *s_cloud_layer;
static PrecipLayer *s_precip_layer;
static EventLayer *s_event_layer;
static TimeLayer *s_time_layer;
static TempLayer *s_temp_layer;
static IconBarLayer *s_icon_bar_layer;

static WeatherData s_weather;

// Forward declarations
static void prv_request_weather(void);
static void prv_push_weather_to_layers(struct tm *now);

// ==========================================================================
// Tick handler
// ==========================================================================

static void prv_tick_handler(struct tm *tick_time, TimeUnits units_changed) {
#if defined(DEMO_SCENARIO)
	// Demo mode: time display is frozen at the scenario's hour and date.
	(void)tick_time;
	(void)units_changed;
#else
	time_layer_update(s_time_layer, tick_time, settings_get());

	// Request fresh weather every hour and re-push cached data so that
	// current_hour advances in all graph layers regardless of whether a new
	// fetch succeeds.
	if (units_changed & HOUR_UNIT) {
		prv_push_weather_to_layers(tick_time);
		prv_request_weather();
	}
#endif
}

// ==========================================================================
// Layer data push
//
// Builds offset-shifted views of the hourly arrays so that column 0 always
// represents the current hour, regardless of when the data was fetched.
// ==========================================================================

static void prv_push_weather_to_layers(struct tm *now) {
	uint8_t current_hour = now ? (uint8_t)now->tm_hour : 0;

	if (!s_weather.is_valid) {
		daylight_layer_set_data(s_daylight_layer, 6, 18, current_hour, true,
		                        true);
		temp_layer_set_current_hour(s_temp_layer, current_hour, 0);
		icon_bar_layer_set_condition(s_icon_bar_layer,
		                             WEATHER_CONDITION_UNKNOWN);
		icon_bar_layer_set_disconnected(s_icon_bar_layer, true);
		return;
	}

	// How many array slots separate the fetch hour from the current hour
	int data_offset = 0;
	if (s_weather.fetch_time > 0) {
		time_t now_t = time(NULL);
		long elapsed = (long)(now_t - s_weather.fetch_time);
		if (elapsed > 0)
			data_offset = (int)(elapsed / 3600);
	}

	// If the entire cached window is in the past, nothing useful to show
	if (data_offset >= (int)s_weather.valid_hours ||
	    data_offset >= WEATHER_HOURLY_COUNT) {
		daylight_layer_set_data(s_daylight_layer, 6, 18, current_hour, true,
		                        true);
		temp_layer_set_current_hour(s_temp_layer, current_hour, 0);
		icon_bar_layer_set_condition(s_icon_bar_layer,
		                             WEATHER_CONDITION_UNKNOWN);
		icon_bar_layer_set_disconnected(s_icon_bar_layer, true);
		return;
	}

	uint8_t hours_remaining = (uint8_t)(s_weather.valid_hours - data_offset);
	if (hours_remaining > WEATHER_HOURLY_COUNT)
		hours_remaining = WEATHER_HOURLY_COUNT;

	// Shifted views: index 0 == current hour's forecast
	uint8_t precip_view[WEATHER_HOURLY_COUNT];
	int8_t temp_view[WEATHER_HOURLY_COUNT];
	int8_t appar_view[WEATHER_HOURLY_COUNT];
	uint8_t cloud_view[WEATHER_HOURLY_COUNT];
	uint8_t code_view[WEATHER_HOURLY_COUNT];
	memset(precip_view, 0, sizeof(precip_view));
	memset(temp_view, 0, sizeof(temp_view));
	memset(appar_view, 0, sizeof(appar_view));
	memset(cloud_view, 0, sizeof(cloud_view));
	memset(code_view, 0, sizeof(code_view));

	int copy_len = (int)hours_remaining;
	if (data_offset + copy_len > WEATHER_HOURLY_COUNT)
		copy_len = WEATHER_HOURLY_COUNT - data_offset;

	memcpy(precip_view, &s_weather.precip_prob[data_offset], copy_len);
	memcpy(temp_view, &s_weather.temp_hourly[data_offset], copy_len);
	memcpy(appar_view, &s_weather.apparent_temp_hourly[data_offset], copy_len);
	memcpy(cloud_view, &s_weather.cloud_cover[data_offset], copy_len);
	memcpy(code_view, &s_weather.hourly_weather_code[data_offset], copy_len);

	// When stale, use hourly forecast for current hour instead of scalar fields
	int16_t display_temp = (data_offset > 0)
	                           ? (int16_t)s_weather.temp_hourly[data_offset]
	                           : s_weather.current_temp;
	uint8_t display_code = (data_offset > 0)
	                           ? s_weather.hourly_weather_code[data_offset]
	                           : s_weather.weather_code;

	bool is_day = (current_hour >= s_weather.sunrise_hour &&
	               current_hour < s_weather.sunset_hour);
	daylight_layer_set_data(s_daylight_layer, s_weather.sunrise_hour,
	                        s_weather.sunset_hour, current_hour, false, false);
	cloud_layer_set_data(s_cloud_layer, cloud_view, code_view, current_hour);
	precip_layer_set_data(s_precip_layer, precip_view, code_view, current_hour);
	event_layer_set_data(s_event_layer, code_view, hours_remaining);
	icon_bar_layer_set_condition(s_icon_bar_layer,
	                             weather_code_to_condition(display_code));
	icon_bar_layer_set_daytime(s_icon_bar_layer, is_day);
	icon_bar_layer_set_disconnected(s_icon_bar_layer,
	                                hours_remaining < GRAPH_HOURS);
	temp_layer_set_unit(s_temp_layer, settings_get()->temp_unit_celsius);
	temp_layer_set_data(s_temp_layer, display_temp, s_weather.high_temp,
	                    s_weather.low_temp, temp_view, appar_view, current_hour,
	                    hours_remaining);
	time_layer_set_city(s_time_layer, s_weather.city_name);
}

// ==========================================================================
// AppMessage — receive weather from pkjs
// ==========================================================================

static void prv_inbox_received(DictionaryIterator *iter, void *context) {
	// Check for settings changes first
	settings_apply_from_message(iter);
	temp_layer_set_unit(s_temp_layer, settings_get()->temp_unit_celsius);

	// Parse scalar weather fields — track whether any weather key was present
	// so a settings-only message can't corrupt the weather state.
	Tuple *t;
	bool got_weather = false;

	t = dict_find(iter, MESSAGE_KEY_WEATHER_TEMP);
	if (t) {
		s_weather.current_temp = (int16_t)t->value->int32;
		got_weather = true;
	}

	t = dict_find(iter, MESSAGE_KEY_WEATHER_TEMP_HIGH);
	if (t)
		s_weather.high_temp = (int16_t)t->value->int32;

	t = dict_find(iter, MESSAGE_KEY_WEATHER_TEMP_LOW);
	if (t)
		s_weather.low_temp = (int16_t)t->value->int32;

	t = dict_find(iter, MESSAGE_KEY_WEATHER_CODE);
	if (t)
		s_weather.weather_code = (uint8_t)t->value->int32;

	t = dict_find(iter, MESSAGE_KEY_WEATHER_SUNRISE_HOUR);
	if (t)
		s_weather.sunrise_hour = (uint8_t)t->value->int32;

	t = dict_find(iter, MESSAGE_KEY_WEATHER_SUNSET_HOUR);
	if (t)
		s_weather.sunset_hour = (uint8_t)t->value->int32;

	// Hourly byte arrays
	t = dict_find(iter, MESSAGE_KEY_WEATHER_PRECIP_PROB);
	if (t && t->type == TUPLE_BYTE_ARRAY && t->length >= 24) {
		memcpy(s_weather.precip_prob, t->value->data, 24);
	}

	t = dict_find(iter, MESSAGE_KEY_WEATHER_TEMP_HOURLY);
	if (t && t->type == TUPLE_BYTE_ARRAY && t->length >= 24) {
		memcpy(s_weather.temp_hourly, t->value->data, 24);
	}

	t = dict_find(iter, MESSAGE_KEY_WEATHER_APPARENT_TEMP_HOURLY);
	if (t && t->type == TUPLE_BYTE_ARRAY && t->length >= 24) {
		memcpy(s_weather.apparent_temp_hourly, t->value->data, 24);
	}

	t = dict_find(iter, MESSAGE_KEY_WEATHER_CLOUD_COVER);
	if (t && t->type == TUPLE_BYTE_ARRAY && t->length >= 24) {
		memcpy(s_weather.cloud_cover, t->value->data, 24);
	}

	t = dict_find(iter, MESSAGE_KEY_WEATHER_HOURLY_CODE);
	if (t && t->type == TUPLE_BYTE_ARRAY && t->length >= 24) {
		memcpy(s_weather.hourly_weather_code, t->value->data, 24);
	}

	t = dict_find(iter, MESSAGE_KEY_CITY_NAME);
	if (t && t->type == TUPLE_CSTRING) {
		strncpy(s_weather.city_name, t->value->cstring,
		        sizeof(s_weather.city_name) - 1);
		s_weather.city_name[sizeof(s_weather.city_name) - 1] = '\0';
	}

	// Only update weather state if this message actually contained weather
	// data. A settings-only message must not mark the weather as valid with
	// zeroed arrays, which would render a false "clear sky" state.
	if (!got_weather)
		return;

	// Require a fetch timestamp — without it we cannot compute data_offset and
	// would wrongly treat data of unknown age as current.
	t = dict_find(iter, MESSAGE_KEY_WEATHER_FETCH_TIME);
	if (!t)
		return;

	s_weather.is_valid = true;
	s_weather.fetch_time = (time_t)t->value->int32;
	s_weather.valid_hours = 24;

	// Persist for cold-start restoration
	persist_write_data(STORAGE_KEY_WEATHER, &s_weather, sizeof(s_weather));

	// Push data to layers
	time_t now_push = time(NULL);
	prv_push_weather_to_layers(localtime(&now_push));
}

static void prv_inbox_dropped(AppMessageResult reason, void *context) {
	APP_LOG(APP_LOG_LEVEL_WARNING, "Inbox dropped: %d", (int)reason);
}

static void prv_request_weather(void) {
	DictionaryIterator *iter;
	AppMessageResult result = app_message_outbox_begin(&iter);
	if (result == APP_MSG_OK) {
		dict_write_uint8(iter, MESSAGE_KEY_WEATHER_REQUEST, 1);
		app_message_outbox_send();
	}
}

// ==========================================================================
// Battery / Bluetooth callbacks
// ==========================================================================

static void prv_battery_handler(BatteryChargeState state) {
	icon_bar_layer_notify_battery(s_icon_bar_layer, state);
}

static void prv_bt_handler(bool connected) {
	icon_bar_layer_notify_bt(s_icon_bar_layer, connected);
}

// ==========================================================================
// Window lifecycle
// ==========================================================================

static void prv_window_load(Window *window) {
	Layer *root = window_get_root_layer(window);
	GRect bounds = layer_get_bounds(root);
	int w = bounds.size.w;

	// Calculate vertical positions — daylight layer is flush to the top
	int y = 0;

	// Daylight line with battery and sun/moon hour markers
	s_daylight_layer = daylight_layer_create(GRect(0, y, w, DAYLIGHT_H));
	layer_add_child(root, daylight_layer_get_layer(s_daylight_layer));
	y += DAYLIGHT_H;

	// Cloud cover layer
	s_cloud_layer = cloud_layer_create(GRect(0, y, w, CLOUD_H));
	layer_add_child(root, cloud_layer_get_layer(s_cloud_layer));
	y += CLOUD_H;

	// Precip graph
	s_precip_layer = precip_layer_create(GRect(0, y, w, PRECIP_H));
	layer_add_child(root, precip_layer_get_layer(s_precip_layer));
	y += PRECIP_H;

	// Event layer — positioned below precip, includes grouping visualization
	s_event_layer = event_layer_create(GRect(0, y, w, EVENT_H));
	layer_add_child(root, event_layer_get_layer(s_event_layer));
	y += EVENT_H;

	// Icon bar — overlaid on top of daylight/cloud/precip, owns the left column
	s_icon_bar_layer = icon_bar_layer_create(GRect(0, 0, w, GRAPH_LAYERS_H));
	layer_add_child(root, icon_bar_layer_get_layer(s_icon_bar_layer));

	// Time block (city + time + date) — vertically centered on the screen
	int time_y = (bounds.size.h - TL_TIME_BLOCK_H) / 2;
	s_time_layer = time_layer_create(GRect(0, time_y, w, TL_TIME_BLOCK_H));
	layer_add_child(root, time_layer_get_layer(s_time_layer));

	// Temp info + sparkline — same height as the top graph group, pinned to
	// bottom
	int temp_y = bounds.size.h - GRAPH_LAYERS_H;
	s_temp_layer = temp_layer_create(GRect(0, temp_y, w, GRAPH_LAYERS_H));
	layer_add_child(root, temp_layer_get_layer(s_temp_layer));

	// Seed time display immediately
#if defined(DEMO_SCENARIO)
	struct tm demo_now;
	demo_get_tm(&demo_now);
	struct tm *now = &demo_now;
#else
	time_t now_t = time(NULL);
	struct tm *now = localtime(&now_t);
#endif
	if (now)
		time_layer_update(s_time_layer, now, settings_get());

	// Restore cached weather if available
	prv_push_weather_to_layers(now);
#if defined(DEMO_SCENARIO)
	time_layer_set_timezone(s_time_layer, demo_get_timezone());
#endif
}

static void prv_window_unload(Window *window) {
	daylight_layer_destroy(s_daylight_layer);
	cloud_layer_destroy(s_cloud_layer);
	precip_layer_destroy(s_precip_layer);
	event_layer_destroy(s_event_layer);
	icon_bar_layer_destroy(s_icon_bar_layer);
	time_layer_destroy(s_time_layer);
	temp_layer_destroy(s_temp_layer);
}

// ==========================================================================
// App lifecycle
// ==========================================================================

static void init(void) {
	settings_init();

	// Restore persisted weather before anything renders
	memset(&s_weather, 0, sizeof(s_weather));
#if defined(DEMO_SCENARIO)
	demo_data_load(&s_weather, settings_get());
#else
	if (persist_exists(STORAGE_KEY_WEATHER)) {
		persist_read_data(STORAGE_KEY_WEATHER, &s_weather, sizeof(s_weather));
	}
#endif

	s_main_window = window_create();
	window_set_background_color(s_main_window, GColorBlack);
	window_set_window_handlers(s_main_window, (WindowHandlers){
	                                              .load = prv_window_load,
	                                              .unload = prv_window_unload,
	                                          });
	window_stack_push(s_main_window, true);

	tick_timer_service_subscribe(MINUTE_UNIT, prv_tick_handler);
	battery_state_service_subscribe(prv_battery_handler);
	connection_service_subscribe((ConnectionHandlers){
	    .pebble_app_connection_handler = prv_bt_handler,
	});

	// AppMessage: register callbacks BEFORE opening
#if !defined(DEMO_SCENARIO)
	app_message_register_inbox_received(prv_inbox_received);
	app_message_register_inbox_dropped(prv_inbox_dropped);
	app_message_open(512, 64);
#endif

	// Trigger initial weather fetch
#if !defined(DEMO_SCENARIO)
	prv_request_weather();
#endif
}

static void deinit(void) {
	tick_timer_service_unsubscribe();
	battery_state_service_unsubscribe();
	connection_service_unsubscribe();
	window_destroy(s_main_window);
}

int main(void) {
	init();
	app_event_loop();
	deinit();
	return 0;
}
