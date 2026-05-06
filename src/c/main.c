#include <pebble.h>
#include "modules/weather.h"
#include "modules/settings.h"
#include "ui/daylight_layer.h"
#include "ui/cloud_layer.h"
#include "ui/precip_layer.h"
#include "ui/time_layer.h"
#include "ui/temp_layer.h"

// Storage key for persisting last-received weather across cold starts
#define STORAGE_KEY_WEATHER 1

// Emery layout constants (200x228)
// Round (gabbro, 260x260) values are provided via PBL_IF_RECT_ELSE
#define DAYLIGHT_H    18
#define CLOUD_H       22
#define PRECIP_H      23
#define TIME_BLOCK_H  PBL_IF_RECT_ELSE(102, 96)
#define TEMP_H        44

static Window         *s_main_window;
static DaylightLayer  *s_daylight_layer;
static CloudLayer     *s_cloud_layer;
static PrecipLayer    *s_precip_layer;
static TimeLayer      *s_time_layer;
static TempLayer      *s_temp_layer;

static WeatherData s_weather;

// Forward declarations
static void prv_request_weather(void);

// ==========================================================================
// Tick handler
// ==========================================================================

static void prv_tick_handler(struct tm *tick_time, TimeUnits units_changed) {
  time_layer_update(s_time_layer, tick_time, settings_get());

  // Request fresh weather every hour
  if (units_changed & HOUR_UNIT) {
    prv_request_weather();
  }
}

// ==========================================================================
// AppMessage — receive weather from pkjs
// ==========================================================================

static void prv_inbox_received(DictionaryIterator *iter, void *context) {
  // Check for settings changes first
  settings_apply_from_message(iter);
  temp_layer_set_unit(s_temp_layer, settings_get()->temp_unit_celsius);

  // Parse scalar weather fields
  Tuple *t;

  t = dict_find(iter, MESSAGE_KEY_WEATHER_TEMP);
  if (t) s_weather.current_temp = (int16_t)t->value->int32;

  t = dict_find(iter, MESSAGE_KEY_WEATHER_TEMP_HIGH);
  if (t) s_weather.high_temp = (int16_t)t->value->int32;

  t = dict_find(iter, MESSAGE_KEY_WEATHER_TEMP_LOW);
  if (t) s_weather.low_temp = (int16_t)t->value->int32;

  t = dict_find(iter, MESSAGE_KEY_WEATHER_CODE);
  if (t) s_weather.weather_code = (uint8_t)t->value->int32;

  t = dict_find(iter, MESSAGE_KEY_WEATHER_SUNRISE_HOUR);
  if (t) s_weather.sunrise_hour = (uint8_t)t->value->int32;

  t = dict_find(iter, MESSAGE_KEY_WEATHER_SUNSET_HOUR);
  if (t) s_weather.sunset_hour = (uint8_t)t->value->int32;

  // Hourly byte arrays
  t = dict_find(iter, MESSAGE_KEY_WEATHER_PRECIP_PROB);
  if (t && t->type == TUPLE_BYTE_ARRAY && t->length >= 24) {
    memcpy(s_weather.precip_prob, t->value->data, 24);
  }

  t = dict_find(iter, MESSAGE_KEY_WEATHER_TEMP_HOURLY);
  if (t && t->type == TUPLE_BYTE_ARRAY && t->length >= 24) {
    memcpy(s_weather.temp_hourly, t->value->data, 24);
  }

  t = dict_find(iter, MESSAGE_KEY_WEATHER_CLOUD_COVER);
  if (t && t->type == TUPLE_BYTE_ARRAY && t->length >= 24) {
    memcpy(s_weather.cloud_cover, t->value->data, 24);
  }

  t = dict_find(iter, MESSAGE_KEY_CITY_NAME);
  if (t && t->type == TUPLE_CSTRING) {
    strncpy(s_weather.city_name, t->value->cstring,
            sizeof(s_weather.city_name) - 1);
    s_weather.city_name[sizeof(s_weather.city_name) - 1] = '\0';
  }

  s_weather.is_valid = true;

  // Persist for cold-start restoration
  persist_write_data(STORAGE_KEY_WEATHER, &s_weather, sizeof(s_weather));

  // Push data to layers
  time_t now = time(NULL);
  struct tm *t_now = localtime(&now);
  uint8_t current_hour = t_now ? (uint8_t)t_now->tm_hour : 0;

  daylight_layer_set_data(s_daylight_layer,
                          s_weather.sunrise_hour,
                          s_weather.sunset_hour,
                          current_hour);
  cloud_layer_set_data(s_cloud_layer, s_weather.cloud_cover, current_hour);
  precip_layer_set_data(s_precip_layer, s_weather.precip_prob, current_hour);
  precip_layer_set_condition(s_precip_layer,
                             weather_code_to_condition(s_weather.weather_code));
  temp_layer_set_data(s_temp_layer,
                      s_weather.current_temp,
                      s_weather.high_temp,
                      s_weather.low_temp,
                      s_weather.temp_hourly,
                      current_hour);
  time_layer_set_city(s_time_layer, s_weather.city_name);
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
  daylight_layer_notify_battery(s_daylight_layer, state);
}

static void prv_bt_handler(bool connected) {
  cloud_layer_notify_bt(s_cloud_layer, connected);
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

  // Precip graph + weather icon
  s_precip_layer = precip_layer_create(GRect(0, y, w, PRECIP_H));
  layer_add_child(root, precip_layer_get_layer(s_precip_layer));
  y += PRECIP_H + 4;  // small gap before time block

  // Time block (city + time + date)
  s_time_layer = time_layer_create(GRect(0, y, w, TIME_BLOCK_H));
  layer_add_child(root, time_layer_get_layer(s_time_layer));
  y += TIME_BLOCK_H + 4;

  // Temp info + sparkline
  int temp_y = bounds.size.h - TEMP_H - 2;  // pin to bottom with 2px margin
  s_temp_layer = temp_layer_create(GRect(0, temp_y, w, TEMP_H));
  layer_add_child(root, temp_layer_get_layer(s_temp_layer));

  // Seed time display immediately
  time_t now_t = time(NULL);
  struct tm *now = localtime(&now_t);
  if (now) time_layer_update(s_time_layer, now, settings_get());

  // Restore cached weather if available
  if (s_weather.is_valid) {
    uint8_t current_hour = now ? (uint8_t)now->tm_hour : 0;
    daylight_layer_set_data(s_daylight_layer,
                            s_weather.sunrise_hour,
                            s_weather.sunset_hour,
                            current_hour);
    cloud_layer_set_data(s_cloud_layer, s_weather.cloud_cover, current_hour);
    precip_layer_set_data(s_precip_layer, s_weather.precip_prob, current_hour);
    precip_layer_set_condition(s_precip_layer,
                               weather_code_to_condition(s_weather.weather_code));
    temp_layer_set_data(s_temp_layer,
                        s_weather.current_temp,
                        s_weather.high_temp,
                        s_weather.low_temp,
                        s_weather.temp_hourly,
                        current_hour);
    time_layer_set_city(s_time_layer, s_weather.city_name);
  }
}

static void prv_window_unload(Window *window) {
  daylight_layer_destroy(s_daylight_layer);
  cloud_layer_destroy(s_cloud_layer);
  precip_layer_destroy(s_precip_layer);
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
  if (persist_exists(STORAGE_KEY_WEATHER)) {
    persist_read_data(STORAGE_KEY_WEATHER, &s_weather, sizeof(s_weather));
  }

  s_main_window = window_create();
  window_set_background_color(s_main_window, GColorBlack);
  window_set_window_handlers(s_main_window, (WindowHandlers){
    .load   = prv_window_load,
    .unload = prv_window_unload,
  });
  window_stack_push(s_main_window, true);

  tick_timer_service_subscribe(MINUTE_UNIT, prv_tick_handler);
  battery_state_service_subscribe(prv_battery_handler);
  connection_service_subscribe((ConnectionHandlers){
    .pebble_app_connection_handler = prv_bt_handler,
  });

  // AppMessage: register callbacks BEFORE opening
  app_message_register_inbox_received(prv_inbox_received);
  app_message_register_inbox_dropped(prv_inbox_dropped);
  app_message_open(512, 64);

  // Trigger initial weather fetch
  prv_request_weather();
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
