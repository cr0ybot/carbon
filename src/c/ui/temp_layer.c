#include "temp_layer.h"
#include <stdio.h>

#define LABEL_COL_W 30
#define HOURS 24
#define C_TO_F(c) ((c) * 9 / 5 + 32)

struct TempLayer {
  Layer   *layer;
  int16_t  current;
  int16_t  high;
  int16_t  low;
  int8_t   hourly[HOURS];
  uint8_t  current_hour;
  bool     celsius;
};

static void prv_update_proc(Layer *layer, GContext *ctx) {
  TempLayer *tl = *(TempLayer **)layer_get_data(layer);
  GRect bounds = layer_get_bounds(layer);
  int lh = bounds.size.h;
  int graph_x = LABEL_COL_W;
  int graph_w = bounds.size.w - LABEL_COL_W;

  GFont font_sm = fonts_get_system_font(FONT_KEY_GOTHIC_14);
  GFont font_md = fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD);
  graphics_context_set_text_color(ctx, GColorWhite);

  // Left column: current (large), H, L
  int16_t disp_curr = tl->celsius ? tl->current : C_TO_F(tl->current);
  int16_t disp_high = tl->celsius ? tl->high    : C_TO_F(tl->high);
  int16_t disp_low  = tl->celsius ? tl->low     : C_TO_F(tl->low);
  const char *unit_str = tl->celsius ? "\u00b0C" : "\u00b0F";

  static char curr_buf[12], high_buf[10], low_buf[10];
  snprintf(curr_buf, sizeof(curr_buf), "%d%s", (int)disp_curr, unit_str);
  snprintf(high_buf, sizeof(high_buf), "H:%d", (int)disp_high);
  snprintf(low_buf,  sizeof(low_buf),  "L:%d", (int)disp_low);

  int label_row_h = lh / 3;
  graphics_draw_text(ctx, high_buf, font_sm,
                     GRect(0, 0, LABEL_COL_W - 2, label_row_h),
                     GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft, NULL);
  graphics_draw_text(ctx, curr_buf, font_md,
                     GRect(0, label_row_h, LABEL_COL_W - 2, label_row_h),
                     GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft, NULL);
  graphics_draw_text(ctx, low_buf, font_sm,
                     GRect(0, label_row_h * 2, LABEL_COL_W - 2, label_row_h),
                     GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft, NULL);

  // Find min/max of hourly data for y-axis scaling
  int8_t t_min = tl->hourly[0], t_max = tl->hourly[0];
  for (int i = 1; i < HOURS; i++) {
    if (tl->hourly[i] < t_min) t_min = tl->hourly[i];
    if (tl->hourly[i] > t_max) t_max = tl->hourly[i];
  }
  int t_range = t_max - t_min;
  if (t_range < 1) t_range = 1;  // prevent divide by zero

  int pad = 4;
  int graph_h = lh - pad * 2;
  int bar_w = graph_w / HOURS;

  // Draw sparkline polyline
  graphics_context_set_stroke_color(ctx, GColorWhite);
  graphics_context_set_stroke_width(ctx, 1);
  GPoint prev = {0, 0};
  for (int i = 0; i < HOURS; i++) {
    int x = graph_x + i * bar_w + bar_w / 2;
    int y = pad + graph_h - ((tl->hourly[i] - t_min) * graph_h / t_range);
    GPoint pt = GPoint(x, y);
    if (i > 0) {
      graphics_draw_line(ctx, prev, pt);
    }
    prev = pt;
  }

  // Current hour tick
  if (tl->current_hour < HOURS) {
    int tick_x = graph_x + tl->current_hour * bar_w + bar_w / 2;
    graphics_context_set_stroke_color(ctx, GColorWhite);
    graphics_context_set_stroke_width(ctx, 2);
    graphics_draw_line(ctx, GPoint(tick_x, lh - 4), GPoint(tick_x, lh));
  }
}

TempLayer *temp_layer_create(GRect frame) {
  TempLayer *tl = malloc(sizeof(TempLayer));
  if (!tl) return NULL;
  tl->current = 0;
  tl->high = 0;
  tl->low = 0;
  memset(tl->hourly, 0, sizeof(tl->hourly));
  tl->current_hour = 0;
  tl->celsius = true;

  tl->layer = layer_create_with_data(frame, sizeof(TempLayer *));
  *(TempLayer **)layer_get_data(tl->layer) = tl;
  layer_set_update_proc(tl->layer, prv_update_proc);
  return tl;
}

void temp_layer_destroy(TempLayer *layer) {
  if (!layer) return;
  layer_destroy(layer->layer);
  free(layer);
}

Layer *temp_layer_get_layer(TempLayer *layer) {
  return layer ? layer->layer : NULL;
}

void temp_layer_set_data(TempLayer *layer,
                         int16_t current, int16_t high, int16_t low,
                         const int8_t hourly[24], uint8_t current_hour) {
  if (!layer) return;
  layer->current = current;
  layer->high = high;
  layer->low = low;
  memcpy(layer->hourly, hourly, HOURS);
  layer->current_hour = current_hour;
  layer_mark_dirty(layer->layer);
}

void temp_layer_set_unit(TempLayer *layer, bool celsius) {
  if (!layer) return;
  layer->celsius = celsius;
  layer_mark_dirty(layer->layer);
}
