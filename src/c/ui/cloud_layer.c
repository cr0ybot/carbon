#include "cloud_layer.h"
#include "graph_common.h"
#include "../generated/icons.h"

#define CLEAR_THRESHOLD 15

struct CloudLayer {
  Layer   *layer;
  GFont    icon_font;
  uint8_t  cover[GRAPH_HOURS];
  uint8_t  current_hour;
  bool     bt_connected;
};

static void prv_draw_cloud(GContext *ctx, int cx, int cy, int r) {
  graphics_fill_circle(ctx, GPoint(cx, cy), r);
  graphics_fill_circle(ctx, GPoint(cx - r, cy + r / 2), r * 2 / 3);
  graphics_fill_circle(ctx, GPoint(cx + r, cy + r / 2), r * 2 / 3);
}

static void prv_update_proc(Layer *layer, GContext *ctx) {
  CloudLayer *cl = *(CloudLayer **)layer_get_data(layer);
  GRect bounds = layer_get_bounds(layer);
  int graph_x = GRAPH_OFFSET_X;
  int graph_w = bounds.size.w - graph_x;
  int cy = bounds.size.h / 2;
  int lh = bounds.size.h;

  // Bluetooth disconnected indicator in left column
  if (!cl->bt_connected) {
    graphics_context_set_text_color(ctx, GColorWhite);
    graphics_draw_text(ctx, ICON_BLUETOOTH_OFF, cl->icon_font,
                       GRect(0, 0, GRAPH_OFFSET_X, lh),
                       GTextOverflowModeTrailingEllipsis,
                       GTextAlignmentCenter, NULL);
  }

  // Vertical separator
  graph_draw_separator(ctx, graph_x, lh);

  graphics_context_set_fill_color(ctx, GColorWhite);
  graphics_context_set_antialiased(ctx, false);

  for (int i = 0; i < GRAPH_HOURS; i++) {
    if (cl->cover[i] < CLEAR_THRESHOLD) continue;

    // Proportional x so last bar reaches the right edge
    int cx = graph_x + (long)(i * 2 + 1) * graph_w / (GRAPH_HOURS * 2);
    int r;
    if (cl->cover[i] < 40) {
      r = 2;
    } else if (cl->cover[i] < 70) {
      r = 3;
    } else {
      r = 4;
    }
    prv_draw_cloud(ctx, cx, cy, r);
  }
}

CloudLayer *cloud_layer_create(GRect frame) {
  CloudLayer *cl = malloc(sizeof(CloudLayer));
  if (!cl) return NULL;
  memset(cl->cover, 0, sizeof(cl->cover));
  cl->current_hour = 0;
  cl->bt_connected = true;
  cl->icon_font    = fonts_load_custom_font(
    resource_get_handle(RESOURCE_ID_CARBON_ICONS_14));

  cl->layer = layer_create_with_data(frame, sizeof(CloudLayer *));
  *(CloudLayer **)layer_get_data(cl->layer) = cl;
  layer_set_update_proc(cl->layer, prv_update_proc);
  return cl;
}

void cloud_layer_destroy(CloudLayer *layer) {
  if (!layer) return;
  fonts_unload_custom_font(layer->icon_font);
  layer_destroy(layer->layer);
  free(layer);
}

Layer *cloud_layer_get_layer(CloudLayer *layer) {
  return layer ? layer->layer : NULL;
}

void cloud_layer_set_data(CloudLayer *layer, const uint8_t cover[24],
                          uint8_t current_hour) {
  if (!layer) return;
  memcpy(layer->cover, cover, GRAPH_HOURS);
  layer->current_hour = current_hour;
  layer_mark_dirty(layer->layer);
}

void cloud_layer_notify_bt(CloudLayer *layer, bool connected) {
  if (!layer) return;
  layer->bt_connected = connected;
  layer_mark_dirty(layer->layer);
}
