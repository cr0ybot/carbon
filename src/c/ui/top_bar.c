#include "top_bar.h"

#define TOP_BAR_FONT FONT_KEY_GOTHIC_14

struct TopBarLayer {
  Layer  *layer;
  int     battery_percent;
  bool    bt_connected;
};

static void prv_update_proc(Layer *layer, GContext *ctx) {
  TopBarLayer *tbl = *(TopBarLayer **)layer_get_data(layer);
  GRect bounds = layer_get_bounds(layer);
  GFont font = fonts_get_system_font(TOP_BAR_FONT);

  graphics_context_set_text_color(ctx, GColorWhite);

  // Battery percentage — right-aligned
  static char batt_buf[6];
  snprintf(batt_buf, sizeof(batt_buf), "%d%%", tbl->battery_percent);
  graphics_draw_text(ctx, batt_buf, font,
                     GRect(bounds.size.w - 38, 0, 36, bounds.size.h),
                     GTextOverflowModeTrailingEllipsis,
                     GTextAlignmentRight, NULL);

  // Bluetooth disconnected indicator — left-aligned, only when disconnected
  if (!tbl->bt_connected) {
    graphics_draw_text(ctx, "BT", font,
                       GRect(2, 0, 28, bounds.size.h),
                       GTextOverflowModeTrailingEllipsis,
                       GTextAlignmentLeft, NULL);
  }
}

TopBarLayer *top_bar_layer_create(GRect frame) {
  TopBarLayer *tbl = malloc(sizeof(TopBarLayer));
  if (!tbl) return NULL;

  tbl->battery_percent = battery_state_service_peek().charge_percent;
  tbl->bt_connected    = connection_service_peek_pebble_app_connection();

  tbl->layer = layer_create_with_data(frame, sizeof(TopBarLayer *));
  *(TopBarLayer **)layer_get_data(tbl->layer) = tbl;
  layer_set_update_proc(tbl->layer, prv_update_proc);
  return tbl;
}

void top_bar_layer_destroy(TopBarLayer *layer) {
  if (!layer) return;
  layer_destroy(layer->layer);
  free(layer);
}

Layer *top_bar_layer_get_layer(TopBarLayer *layer) {
  return layer ? layer->layer : NULL;
}

void top_bar_layer_notify_battery(TopBarLayer *layer, BatteryChargeState state) {
  if (!layer) return;
  layer->battery_percent = state.charge_percent;
  layer_mark_dirty(layer->layer);
}

void top_bar_layer_notify_bt(TopBarLayer *layer, bool connected) {
  if (!layer) return;
  layer->bt_connected = connected;
  layer_mark_dirty(layer->layer);
}
