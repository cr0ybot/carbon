#include "cloud_layer.h"

#define HOURS 24
#define CLEAR_THRESHOLD 15

struct CloudLayer {
  Layer   *layer;
  uint8_t  cover[HOURS];
};

static void prv_draw_cloud(GContext *ctx, int cx, int cy, int r) {
  graphics_fill_circle(ctx, GPoint(cx, cy), r);
  graphics_fill_circle(ctx, GPoint(cx - r, cy + r / 2), r * 2 / 3);
  graphics_fill_circle(ctx, GPoint(cx + r, cy + r / 2), r * 2 / 3);
}

static void prv_update_proc(Layer *layer, GContext *ctx) {
  CloudLayer *cl = *(CloudLayer **)layer_get_data(layer);
  GRect bounds = layer_get_bounds(layer);
  int col_w = bounds.size.w / HOURS;
  int cy = bounds.size.h / 2;

  graphics_context_set_fill_color(ctx, GColorWhite);
  graphics_context_set_antialiased(ctx, false);

  for (int i = 0; i < HOURS; i++) {
    if (cl->cover[i] < CLEAR_THRESHOLD) continue;

    int cx = i * col_w + col_w / 2;
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

  cl->layer = layer_create_with_data(frame, sizeof(CloudLayer *));
  *(CloudLayer **)layer_get_data(cl->layer) = cl;
  layer_set_update_proc(cl->layer, prv_update_proc);
  return cl;
}

void cloud_layer_destroy(CloudLayer *layer) {
  if (!layer) return;
  layer_destroy(layer->layer);
  free(layer);
}

Layer *cloud_layer_get_layer(CloudLayer *layer) {
  return layer ? layer->layer : NULL;
}

void cloud_layer_set_data(CloudLayer *layer, const uint8_t cover[24]) {
  if (!layer) return;
  memcpy(layer->cover, cover, HOURS);
  layer_mark_dirty(layer->layer);
}
