#include "daylight_layer.h"
#include "graph_common.h"

struct DaylightLayer {
  Layer   *layer;
  uint8_t  sunrise_hour;
  uint8_t  sunset_hour;
  uint8_t  current_hour;
};

static void prv_update_proc(Layer *layer, GContext *ctx) {
  DaylightLayer *dl = *(DaylightLayer **)layer_get_data(layer);
  GRect bounds = layer_get_bounds(layer);
  int graph_x = GRAPH_OFFSET_X;
  int graph_w = bounds.size.w - graph_x;
  int bar_w   = graph_w / GRAPH_HOURS;
  int mid_y   = bounds.size.h / 2;
  int lh      = bounds.size.h;

  // Vertical separator
  graph_draw_separator(ctx, graph_x, lh);

  graphics_context_set_stroke_color(ctx, GColorWhite);
  graphics_context_set_stroke_width(ctx, 1);

  // Map sunrise/sunset wall-clock hours to graph column offsets.
  // Column offset i means "current_hour + i" wrapping mod 24.
  int rise_off = ((int)dl->sunrise_hour - (int)dl->current_hour + 24) % 24;
  int set_off  = ((int)dl->sunset_hour  - (int)dl->current_hour + 24) % 24;

  int x_rise = graph_x + rise_off * bar_w;
  int x_set  = graph_x + set_off  * bar_w;
  int x_end  = bounds.size.w;

  if (rise_off < set_off) {
    // It is currently night before sunrise: draw one segment rise→set
    graphics_draw_line(ctx, GPoint(x_rise, mid_y), GPoint(x_set,  mid_y));
    graphics_draw_line(ctx, GPoint(x_rise, mid_y - 2), GPoint(x_rise, mid_y + 2));
    graphics_draw_line(ctx, GPoint(x_set,  mid_y - 2), GPoint(x_set,  mid_y + 2));
  } else if (rise_off > set_off) {
    // Currently in daytime: draw left-edge→sunset, then sunrise→right-edge
    if (set_off > 0) {
      graphics_draw_line(ctx, GPoint(graph_x, mid_y), GPoint(x_set, mid_y));
      graphics_draw_line(ctx, GPoint(x_set, mid_y - 2), GPoint(x_set, mid_y + 2));
    }
    graphics_draw_line(ctx, GPoint(x_rise, mid_y), GPoint(x_end, mid_y));
    graphics_draw_line(ctx, GPoint(x_rise, mid_y - 2), GPoint(x_rise, mid_y + 2));
  }
  // rise_off == set_off: sunrise and sunset at the same offset — skip drawing
}

DaylightLayer *daylight_layer_create(GRect frame) {
  DaylightLayer *dl = malloc(sizeof(DaylightLayer));
  if (!dl) return NULL;
  dl->sunrise_hour = 6;
  dl->sunset_hour  = 20;
  dl->current_hour = 0;

  dl->layer = layer_create_with_data(frame, sizeof(DaylightLayer *));
  *(DaylightLayer **)layer_get_data(dl->layer) = dl;
  layer_set_update_proc(dl->layer, prv_update_proc);
  return dl;
}

void daylight_layer_destroy(DaylightLayer *layer) {
  if (!layer) return;
  layer_destroy(layer->layer);
  free(layer);
}

Layer *daylight_layer_get_layer(DaylightLayer *layer) {
  return layer ? layer->layer : NULL;
}

void daylight_layer_set_data(DaylightLayer *layer,
                             uint8_t sunrise_hour,
                             uint8_t sunset_hour,
                             uint8_t current_hour) {
  if (!layer) return;
  layer->sunrise_hour = sunrise_hour;
  layer->sunset_hour  = sunset_hour;
  layer->current_hour = current_hour;
  layer_mark_dirty(layer->layer);
}
