#include "daylight_layer.h"
#include "graph_common.h"
#include "../generated/icons.h"

struct DaylightLayer {
  Layer   *layer;
  uint8_t  sunrise_hour;
  uint8_t  sunset_hour;
  uint8_t  current_hour;
};

// Calculate the current moon phase (0=new, 1=wax crescent, 2=first quarter,
// 3=wax gibbous, 4=full, 5=wan gibbous, 6=last quarter, 7=wan crescent).
// Integer-only adaptation of the classic algorithm, scaled x10000 and
// epoch-offset to year 2000 so all values fit in 32-bit long.
static int prv_moon_phase(void) {
  time_t now = time(NULL);
  struct tm *t = localtime(&now);
  if (!t) return 0;
  int year = t->tm_year + 1900;
  int month = t->tm_mon + 1;
  int day = t->tm_mday;
  if (month < 3) { year--; month += 12; }
  month++;
  int yp = year - 2000;
  long jd = 3652500L * yp + 306000L * month + 10000L * day + 364609100L;
  long denom = 295306L;  // 29.5305882 * 10000 (lunar cycle)
  long rem = jd % denom;
  int b = (int)((rem * 8L + denom / 2L) / denom);
  return (b >= 8) ? 0 : b;
}

// Draw a circle marker styled by phase:
//   phase 4 (noon): solid white.
//   phase 0-7 (moon): 0=new (dark outline), 4=full (solid white),
//     partial phases fill interior pixel columns from the lit side.
//     r=3 gives interior dx range [-2..+2]; thresholds per phase:
//       waxing  1→dx>=+2  2→dx>=+1  3→dx>=-1
//       waning  5→dx<=+1  6→dx<=-1  7→dx<=-2
// When col==0 also draws the marker peeking from the right edge (wrap).
static void prv_draw_col_marker(GContext *ctx, int col, int phase,
                                int graph_x, int bar_w, int line_y, int layer_w) {
  // Lit-side threshold indexed by phase (0 and 4 are special-cased below)
  static const int s_thr[8] = { 0, 2, 1, -1, 0, 1, -1, -2 };
  const int r = 3;
  int xs[2], n = 1;
  xs[0] = graph_x + col * bar_w;
  if (col == 0) {
    xs[1] = layer_w;
    n = 2;
  }
  for (int i = 0; i < n; i++) {
    GPoint pt = GPoint(xs[i], line_y);

    // Base: black fill + white outline
    graphics_context_set_fill_color(ctx, GColorBlack);
    graphics_fill_circle(ctx, pt, r);
    graphics_context_set_stroke_color(ctx, GColorWhite);
    graphics_context_set_stroke_width(ctx, 1);
    graphics_draw_circle(ctx, pt, r);

    if (phase == 0) continue;  // new moon: all dark, done

    if (phase == 4) {
      // Full / noon: solid white on top of outline
      graphics_context_set_fill_color(ctx, GColorWhite);
      graphics_fill_circle(ctx, pt, r);
      continue;
    }

    // Partial phases: paint lit interior columns with white horizontal lines.
    // Interior pixels satisfy dx^2 + dy^2 < r^2 (strictly inside outline).
    bool waxing = (phase >= 1 && phase <= 3);
    int thr = s_thr[phase];

    graphics_context_set_stroke_color(ctx, GColorWhite);
    graphics_context_set_stroke_width(ctx, 1);
    for (int dy = -(r - 1); dy <= r - 1; dy++) {
      // Find max dx strictly inside the circle at this row
      int dx_max = 0;
      while ((dx_max + 1) * (dx_max + 1) + dy * dy < r * r) dx_max++;
      // Lit x range: waxing fills [thr..+dx_max], waning fills [-dx_max..thr]
      int x_lo = waxing ? thr     : -dx_max;
      int x_hi = waxing ? dx_max  : thr;
      if (x_lo < -dx_max) x_lo = -dx_max;
      if (x_hi >  dx_max) x_hi =  dx_max;
      if (x_lo > x_hi) continue;
      graphics_draw_line(ctx, GPoint(pt.x + x_lo, pt.y + dy),
                              GPoint(pt.x + x_hi, pt.y + dy));
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

  // Markers drawn first; label column filled black after to clip any bleed
  int noon_off = (12 - (int)dl->current_hour + 24) % 24;
  int midn_off = (24 - (int)dl->current_hour)      % 24;
  int moon_phase = prv_moon_phase();
  prv_draw_col_marker(ctx, noon_off, 4,          graph_x, bar_w, line_y, bounds.size.w);
  prv_draw_col_marker(ctx, midn_off, moon_phase, graph_x, bar_w, line_y, bounds.size.w);

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


