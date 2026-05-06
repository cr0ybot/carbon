#include "daylight_layer.h"
#include "graph_common.h"
#include "../generated/icons.h"

struct DaylightLayer {
  Layer   *layer;
  GFont    icon_font;
  int      battery_percent;
  bool     battery_charging;
  uint8_t  sunrise_hour;
  uint8_t  sunset_hour;
  uint8_t  current_hour;
};

static const char *prv_battery_icon(int pct, bool charging) {
  if (charging)  return ICON_BATTERY_CHARGING;
  if (pct >= 70) return ICON_BATTERY_FULL;
  if (pct >= 35) return ICON_BATTERY_MEDIUM;
  if (pct >= 10) return ICON_BATTERY_LOW;
  return ICON_BATTERY_WARNING;
}

// Draw a small circle marker at the given column offset on the daylight line.
// filled=true → white filled (noon); filled=false → black fill, white outline (midnight).
// When col==0 the event is at the left edge; also draw it peeking from the right
// so it appears to wrap around the 24-hour cycle.
static void prv_draw_col_marker(GContext *ctx, int col, bool filled,
                                int graph_x, int bar_w, int line_y, int layer_w) {
  const int r = 3;
  int xs[2];
  int n = 1;
  xs[0] = graph_x + col * bar_w;
  if (col == 0) {
    xs[1] = layer_w;  // right-edge wrap — layer clips to left half
    n = 2;
  }
  for (int i = 0; i < n; i++) {
    if (!filled) {
      graphics_context_set_fill_color(ctx, GColorBlack);
      graphics_fill_circle(ctx, GPoint(xs[i], line_y), r);
      graphics_context_set_stroke_color(ctx, GColorWhite);
      graphics_context_set_stroke_width(ctx, 1);
      graphics_draw_circle(ctx, GPoint(xs[i], line_y), r);
    } else {
      graphics_context_set_fill_color(ctx, GColorWhite);
      graphics_fill_circle(ctx, GPoint(xs[i], line_y), r);
    }
  }
}

static void prv_update_proc(Layer *layer, GContext *ctx) {
  DaylightLayer *dl = *(DaylightLayer **)layer_get_data(layer);
  GRect bounds = layer_get_bounds(layer);
  int graph_x = GRAPH_OFFSET_X;
  int graph_w = bounds.size.w - graph_x;
  int bar_w   = graph_w / GRAPH_HOURS;
  int lh      = bounds.size.h;
  int line_y  = lh / 2;

  // Markers drawn before separator so the separator clips the left-edge bleed
  int noon_off = (12 - (int)dl->current_hour + 24) % 24;
  int midn_off = (24 - (int)dl->current_hour)      % 24;
  prv_draw_col_marker(ctx, noon_off, true,  graph_x, bar_w, line_y, bounds.size.w);
  prv_draw_col_marker(ctx, midn_off, false, graph_x, bar_w, line_y, bounds.size.w);

  // Vertical separator — drawn on top to clip any marker bleeding into label column
  graph_draw_separator(ctx, graph_x, lh);

  // Battery icon in left column
  graphics_context_set_text_color(ctx, GColorWhite);
  graphics_draw_text(ctx,
                     prv_battery_icon(dl->battery_percent, dl->battery_charging),
                     dl->icon_font,
                     GRect(0, 0, GRAPH_OFFSET_X, 14),
                     GTextOverflowModeTrailingEllipsis,
                     GTextAlignmentCenter, NULL);

  // Daylight line
  graphics_context_set_stroke_color(ctx, GColorWhite);
  graphics_context_set_stroke_width(ctx, 1);

  int rise_off = ((int)dl->sunrise_hour - (int)dl->current_hour + 24) % 24;
  int set_off  = ((int)dl->sunset_hour  - (int)dl->current_hour + 24) % 24;

  int x_rise = graph_x + rise_off * bar_w;
  int x_set  = graph_x + set_off  * bar_w;
  int x_end  = bounds.size.w;

  if (rise_off < set_off) {
    graphics_draw_line(ctx, GPoint(x_rise, line_y), GPoint(x_set,  line_y));
    graphics_draw_line(ctx, GPoint(x_rise, line_y - 2), GPoint(x_rise, line_y + 2));
    graphics_draw_line(ctx, GPoint(x_set,  line_y - 2), GPoint(x_set,  line_y + 2));
  } else if (rise_off > set_off) {
    if (set_off > 0) {
      graphics_draw_line(ctx, GPoint(graph_x, line_y), GPoint(x_set, line_y));
      graphics_draw_line(ctx, GPoint(x_set, line_y - 2), GPoint(x_set, line_y + 2));
    }
    graphics_draw_line(ctx, GPoint(x_rise, line_y), GPoint(x_end, line_y));
    graphics_draw_line(ctx, GPoint(x_rise, line_y - 2), GPoint(x_rise, line_y + 2));
  }
}

DaylightLayer *daylight_layer_create(GRect frame) {
  DaylightLayer *dl = malloc(sizeof(DaylightLayer));
  if (!dl) return NULL;
  BatteryChargeState batt = battery_state_service_peek();
  dl->battery_percent  = batt.charge_percent;
  dl->battery_charging = batt.is_charging;
  dl->icon_font        = fonts_load_custom_font(
    resource_get_handle(RESOURCE_ID_CARBON_ICONS_14));
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
  fonts_unload_custom_font(layer->icon_font);
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

void daylight_layer_notify_battery(DaylightLayer *layer,
                                   BatteryChargeState state) {
  if (!layer) return;
  layer->battery_percent  = state.charge_percent;
  layer->battery_charging = state.is_charging;
  layer_mark_dirty(layer->layer);
}
