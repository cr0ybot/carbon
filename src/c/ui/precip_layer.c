#include "precip_layer.h"
#include "graph_common.h"
#include "../generated/icons.h"

struct PrecipLayer {
  Layer   *layer;
  uint8_t  prob[GRAPH_HOURS];
  uint8_t  current_hour;
};

static void prv_update_proc(Layer *layer, GContext *ctx) {
  PrecipLayer *pl = *(PrecipLayer **)layer_get_data(layer);
  GRect bounds = layer_get_bounds(layer);
  int graph_x = GRAPH_OFFSET_X;
  int graph_w = bounds.size.w - graph_x;
  int layer_h = bounds.size.h;

  // Precipitation bars — proportional x so bars fill to the right edge
  graphics_context_set_fill_color(ctx, GColorWhite);
  for (int i = 0; i < GRAPH_HOURS; i++) {
    if (pl->prob[i] == 0) continue;
    int x0 = graph_x + (long)i       * graph_w / GRAPH_HOURS;
    int x1 = graph_x + (long)(i + 1) * graph_w / GRAPH_HOURS;
    int bar_h = (pl->prob[i] * (layer_h - 2)) / 100;
    graphics_fill_rect(ctx, GRect(x0, 0, x1 - x0 - 1, bar_h), 0, GCornerNone);
  }
  // No tick marks — precip is a middle layer
}

PrecipLayer *precip_layer_create(GRect frame) {
  PrecipLayer *pl = malloc(sizeof(PrecipLayer));
  if (!pl) return NULL;
  memset(pl->prob, 0, sizeof(pl->prob));
  pl->current_hour = 0;

  pl->layer = layer_create_with_data(frame, sizeof(PrecipLayer *));
  *(PrecipLayer **)layer_get_data(pl->layer) = pl;
  layer_set_update_proc(pl->layer, prv_update_proc);
  return pl;
}

void precip_layer_destroy(PrecipLayer *layer) {
  if (!layer) return;
  layer_destroy(layer->layer);
  free(layer);
}

Layer *precip_layer_get_layer(PrecipLayer *layer) {
  return layer ? layer->layer : NULL;
}

void precip_layer_set_data(PrecipLayer *layer,
                           const uint8_t prob[24],
                           uint8_t current_hour) {
  if (!layer) return;
  memcpy(layer->prob, prob, GRAPH_HOURS);
  layer->current_hour = current_hour;
  layer_mark_dirty(layer->layer);
}
