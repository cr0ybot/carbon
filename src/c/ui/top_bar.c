#include "top_bar.h"
#include "../generated/icons.h"

struct TopBarLayer {
  Layer  *layer;
  GFont   icon_font;
  int     battery_percent;
  bool    battery_charging;
  bool    bt_connected;
};

// Select battery icon based on charge level and charging state
static const char *prv_battery_icon(int pct, bool charging) {
  if (charging)  return ICON_BATTERY_CHARGING;
  if (pct >= 70) return ICON_BATTERY_FULL;
  if (pct >= 35) return ICON_BATTERY_MEDIUM;
  if (pct >= 10) return ICON_BATTERY_LOW;
  return ICON_BATTERY_WARNING;
}

static void prv_update_proc(Layer *layer, GContext *ctx) {
  TopBarLayer *tbl = *(TopBarLayer **)layer_get_data(layer);
  GRect bounds = layer_get_bounds(layer);
  GFont font = tbl->icon_font;

  graphics_context_set_text_color(ctx, GColorWhite);

  // Battery icon — right-aligned
  const char *batt_icon = prv_battery_icon(tbl->battery_percent,
                                           tbl->battery_charging);
  graphics_draw_text(ctx, batt_icon, font,
                     GRect(bounds.size.w - 18, 0, 16, bounds.size.h),
                     GTextOverflowModeTrailingEllipsis,
                     GTextAlignmentRight, NULL);

  // Bluetooth icon — only shown when disconnected
  if (!tbl->bt_connected) {
    graphics_context_set_text_color(ctx, GColorWhite);
    graphics_draw_text(ctx, ICON_BLUETOOTH_OFF, font,
                       GRect(2, 0, 16, bounds.size.h),
                       GTextOverflowModeTrailingEllipsis,
                       GTextAlignmentLeft, NULL);
  }
}

TopBarLayer *top_bar_layer_create(GRect frame) {
  TopBarLayer *tbl = malloc(sizeof(TopBarLayer));
  if (!tbl) return NULL;

  BatteryChargeState batt = battery_state_service_peek();
  tbl->battery_percent  = batt.charge_percent;
  tbl->battery_charging = batt.is_charging;
  tbl->bt_connected     = connection_service_peek_pebble_app_connection();
  tbl->icon_font        = fonts_load_custom_font(
    resource_get_handle(RESOURCE_ID_CARBON_ICONS_14));

  tbl->layer = layer_create_with_data(frame, sizeof(TopBarLayer *));
  *(TopBarLayer **)layer_get_data(tbl->layer) = tbl;
  layer_set_update_proc(tbl->layer, prv_update_proc);
  return tbl;
}

void top_bar_layer_destroy(TopBarLayer *layer) {
  if (!layer) return;
  fonts_unload_custom_font(layer->icon_font);
  layer_destroy(layer->layer);
  free(layer);
}

Layer *top_bar_layer_get_layer(TopBarLayer *layer) {
  return layer ? layer->layer : NULL;
}

void top_bar_layer_notify_battery(TopBarLayer *layer, BatteryChargeState state) {
  if (!layer) return;
  layer->battery_percent  = state.charge_percent;
  layer->battery_charging = state.is_charging;
  layer_mark_dirty(layer->layer);
}

void top_bar_layer_notify_bt(TopBarLayer *layer, bool connected) {
  if (!layer) return;
  layer->bt_connected = connected;
  layer_mark_dirty(layer->layer);
}
