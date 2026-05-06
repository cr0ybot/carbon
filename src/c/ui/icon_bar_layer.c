#include "icon_bar_layer.h"
#include "graph_common.h"
#include "../generated/icons.h"

struct IconBarLayer {
  Layer            *layer;
  GFont             icon_font;
  int               battery_percent;
  bool              battery_charging;
  bool              bt_connected;
  WeatherCondition  condition;
};

static const char *prv_battery_icon(int pct, bool charging) {
  if (charging)  return ICON_BATTERY_CHARGING;
  if (pct >= 70) return ICON_BATTERY_FULL;
  if (pct >= 35) return ICON_BATTERY_MEDIUM;
  if (pct >= 10) return ICON_BATTERY_LOW;
  return ICON_BATTERY_WARNING;
}

static const char *prv_condition_icon(WeatherCondition cond) {
  switch (cond) {
    case WEATHER_CONDITION_CLEAR:         return ICON_SUN;
    case WEATHER_CONDITION_PARTLY_CLOUDY: return ICON_CLOUD_SUN;
    case WEATHER_CONDITION_CLOUDY:        return ICON_CLOUDY;
    case WEATHER_CONDITION_FOG:           return ICON_CLOUD_FOG;
    case WEATHER_CONDITION_DRIZZLE:       return ICON_CLOUD_DRIZZLE;
    case WEATHER_CONDITION_RAIN:          return ICON_CLOUD_RAIN;
    case WEATHER_CONDITION_SNOW:          return ICON_CLOUD_SNOW;
    case WEATHER_CONDITION_STORM:         return ICON_CLOUD_LIGHTNING;
    default:                              return ICON_CLOUD;
  }
}

static void prv_update_proc(Layer *layer, GContext *ctx) {
  IconBarLayer *sl = *(IconBarLayer **)layer_get_data(layer);
  GRect bounds = layer_get_bounds(layer);
  int graph_x = GRAPH_OFFSET_X;
  int lh      = bounds.size.h;
  int zone_h  = lh / 3;

#if PBL_DISPLAY_HEIGHT <= 168
  int icon_size = 14;
#else
  int icon_size = 18;
#endif

  // Black column fill covers any graph bleed from underlying layers
  graphics_context_set_fill_color(ctx, GColorBlack);
  graphics_fill_rect(ctx, GRect(0, 0, graph_x - 1, lh), 0, GCornerNone);

  // Single separator spanning the full combined height
  graph_draw_separator(ctx, graph_x, lh);

  // Three equally-spaced icon slots: battery, bluetooth, weather condition
  graphics_context_set_text_color(ctx, GColorWhite);

  // Slot 0: battery (always shown)
  int y0 = (zone_h - icon_size) / 2;
  graphics_draw_text(ctx, prv_battery_icon(sl->battery_percent, sl->battery_charging),
                     sl->icon_font,
                     GRect(0, y0, graph_x, icon_size),
                     GTextOverflowModeTrailingEllipsis, GTextAlignmentCenter, NULL);

  // Slot 1: bluetooth (only when disconnected)
  if (!sl->bt_connected) {
    int y1 = zone_h + (zone_h - icon_size) / 2;
    graphics_draw_text(ctx, ICON_BLUETOOTH_OFF, sl->icon_font,
                       GRect(0, y1, graph_x, icon_size),
                       GTextOverflowModeTrailingEllipsis, GTextAlignmentCenter, NULL);
  }

  // Slot 2: current weather condition
  int y2 = 2 * zone_h + (zone_h - icon_size) / 2;
  graphics_draw_text(ctx, prv_condition_icon(sl->condition), sl->icon_font,
                     GRect(0, y2, graph_x, icon_size),
                     GTextOverflowModeTrailingEllipsis, GTextAlignmentCenter, NULL);
}

IconBarLayer *icon_bar_layer_create(GRect frame) {
  IconBarLayer *sl = malloc(sizeof(IconBarLayer));
  if (!sl) return NULL;

  BatteryChargeState batt = battery_state_service_peek();
  sl->battery_percent  = batt.charge_percent;
  sl->battery_charging = batt.is_charging;
  sl->bt_connected     = true;
  sl->condition        = WEATHER_CONDITION_UNKNOWN;

#if PBL_DISPLAY_HEIGHT <= 168
  sl->icon_font = fonts_load_custom_font(
    resource_get_handle(RESOURCE_ID_CARBON_ICONS_14));
#else
  sl->icon_font = fonts_load_custom_font(
    resource_get_handle(RESOURCE_ID_CARBON_ICONS_18));
#endif

  sl->layer = layer_create_with_data(frame, sizeof(IconBarLayer *));
  *(IconBarLayer **)layer_get_data(sl->layer) = sl;
  layer_set_update_proc(sl->layer, prv_update_proc);
  return sl;
}

void icon_bar_layer_destroy(IconBarLayer *layer) {
  if (!layer) return;
  fonts_unload_custom_font(layer->icon_font);
  layer_destroy(layer->layer);
  free(layer);
}

Layer *icon_bar_layer_get_layer(IconBarLayer *layer) {
  return layer ? layer->layer : NULL;
}

void icon_bar_layer_notify_battery(IconBarLayer *layer,
                                     BatteryChargeState state) {
  if (!layer) return;
  layer->battery_percent  = state.charge_percent;
  layer->battery_charging = state.is_charging;
  layer_mark_dirty(layer->layer);
}

void icon_bar_layer_notify_bt(IconBarLayer *layer, bool connected) {
  if (!layer) return;
  layer->bt_connected = connected;
  layer_mark_dirty(layer->layer);
}

void icon_bar_layer_set_condition(IconBarLayer *layer,
                                    WeatherCondition condition) {
  if (!layer) return;
  layer->condition = condition;
  layer_mark_dirty(layer->layer);
}
