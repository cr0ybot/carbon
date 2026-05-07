#include "temp_layer.h"
#include "graph_common.h"
#include <stdio.h>

struct TempLayer {
  Layer   *layer;
  int16_t  current;
  int16_t  high;
  int16_t  low;
  int8_t   hourly[GRAPH_HOURS];
  uint8_t  current_hour;
};

static void prv_update_proc(Layer *layer, GContext *ctx) {
  TempLayer *tl = *(TempLayer **)layer_get_data(layer);
  GRect bounds = layer_get_bounds(layer);
  int lh = bounds.size.h;
  int graph_x = GRAPH_OFFSET_X;
  int graph_w = bounds.size.w - graph_x;

#if PBL_DISPLAY_HEIGHT >= 228
  GFont font_sm = fonts_get_system_font(FONT_KEY_GOTHIC_18);
  GFont font_md = fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD);
#else
  GFont font_sm = fonts_get_system_font(FONT_KEY_GOTHIC_14);
  GFont font_md = fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD);
#endif
  graphics_context_set_text_color(ctx, GColorWhite);

  // Left column: high, current, low — three equal zones matching icon_bar_layer.
  // Each item is centered in its zone; sm_lead compensates for GOTHIC_14's internal top leading.
  static char curr_buf[10], high_buf[8], low_buf[8];
  snprintf(high_buf, sizeof(high_buf), "%d", (int)tl->high);
  snprintf(curr_buf, sizeof(curr_buf), "%d", (int)tl->current);
  snprintf(low_buf,  sizeof(low_buf),  "%d", (int)tl->low);

#if PBL_DISPLAY_HEIGHT >= 228
  int sm_h    = 20;  // GOTHIC_18 rect height
  int md_h    = 28;  // GOTHIC_24_BOLD rect height
  int sm_lead = 2;   // GOTHIC_18 internal top leading
  int md_lead = 2;   // GOTHIC_24_BOLD internal top leading
#else
  int sm_h    = 15;  // GOTHIC_14 rect height
  int md_h    = 20;  // GOTHIC_18_BOLD rect height
  int sm_lead = 1;   // GOTHIC_14 internal top leading
  int md_lead = 2;   // GOTHIC_18_BOLD internal top leading
#endif
  int zone_h  = lh / 3;
  int label_x = GRAPH_OFFSET_X - 4;

  graphics_draw_text(ctx, high_buf, font_sm,
                     GRect(0, (zone_h - sm_h) / 2 - sm_lead, label_x, sm_h),
                     GTextOverflowModeWordWrap, GTextAlignmentRight, NULL);
  graphics_draw_text(ctx, curr_buf, font_md,
                     GRect(0, zone_h + (zone_h - md_h) / 2 - md_lead, label_x, md_h),
                     GTextOverflowModeWordWrap, GTextAlignmentRight, NULL);
  graphics_draw_text(ctx, low_buf, font_sm,
                     GRect(0, 2 * zone_h + (zone_h - (sm_h - sm_lead)) / 2, label_x, sm_h - sm_lead),
                     GTextOverflowModeWordWrap, GTextAlignmentRight, NULL);

  // Vertical separator
  graph_draw_separator(ctx, graph_x, lh);

  // Sparkline — 25 points: current temp followed by 24 hourly forecasts.
  // Point 0 is at the left edge, point 24 at the right edge.
  int16_t pts[25];
  pts[0] = tl->current;
  for (int i = 0; i < GRAPH_HOURS; i++) pts[i + 1] = tl->hourly[i];

  int16_t t_min = pts[0], t_max = pts[0];
  for (int i = 1; i < 25; i++) {
    if (pts[i] < t_min) t_min = pts[i];
    if (pts[i] > t_max) t_max = pts[i];
  }
  int t_range = t_max - t_min;
  if (t_range < 1) t_range = 1;

  int pad = 4;
  int graph_h = lh - pad * 2;

  graphics_context_set_stroke_color(ctx, GColorWhite);
  graphics_context_set_stroke_width(ctx, 1);
  GPoint prev = GPoint(0, 0);
  for (int i = 0; i < 25; i++) {
    int x = graph_x + i * graph_w / 24;
    int y = pad + graph_h - ((pts[i] - t_min) * graph_h / t_range);
    GPoint pt = GPoint(x, y);
    if (i > 0) graphics_draw_line(ctx, prev, pt);
    prev = pt;
  }

  // Noon/midnight ticks — temp is the bottommost graph layer, draw bottom only
  graphics_context_set_stroke_color(ctx, GColorWhite);
  graph_draw_ticks(ctx, graph_x, graph_w, lh, tl->current_hour, 4, false, true);
}

TempLayer *temp_layer_create(GRect frame) {
  TempLayer *tl = malloc(sizeof(TempLayer));
  if (!tl) return NULL;
  tl->current      = 0;
  tl->high         = 0;
  tl->low          = 0;
  tl->current_hour = 0;
  memset(tl->hourly, 0, sizeof(tl->hourly));

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
  layer->current      = current;
  layer->high         = high;
  layer->low          = low;
  layer->current_hour = current_hour;
  memcpy(layer->hourly, hourly, GRAPH_HOURS);
  layer_mark_dirty(layer->layer);
}

void temp_layer_set_unit(TempLayer *layer, bool celsius) {
  // Unit is determined by pkjs and baked into the values; stored for
  // potential future display use only.
  (void)layer; (void)celsius;
}
