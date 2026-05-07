#pragma once
#include <pebble.h>

// Horizontal pixel offset shared by all graph layers (daylight, cloud,
// precip, temp). The left column is reserved for icons / labels.
// Wider on emery to accommodate larger fonts and icons.
#if PBL_DISPLAY_HEIGHT >= 228
#define GRAPH_OFFSET_X 32
#else
#define GRAPH_OFFSET_X 24
#endif

// Number of hourly slots displayed across all graph layers
#define GRAPH_HOURS 24

// Draw tick marks at noon and midnight within a graph layer.
// Call from within a LayerUpdateProc after setting stroke color.
//   draw_top    - draw tick from the top edge downward
//   draw_bottom - draw tick from the bottom edge upward
static inline void graph_draw_ticks(GContext *ctx,
                                    int graph_x, int graph_w, int layer_h,
                                    uint8_t current_hour, int tick_h,
                                    bool draw_top, bool draw_bottom) {
  int bar_w = graph_w / GRAPH_HOURS;
  // Offsets relative to current_hour where noon (12) and midnight (0) fall
  int offsets[2] = {
    (12 - (int)current_hour + 24) % 24,   // noon
    (24 - (int)current_hour)      % 24,   // midnight (0 == skip, at boundary)
  };
  graphics_context_set_stroke_width(ctx, 1);
  for (int i = 0; i < 2; i++) {
    int off = offsets[i];
    if (off == 0) continue;  // on the left boundary, skip
    int x = graph_x + off * bar_w;
    if (draw_top)
      graphics_draw_line(ctx, GPoint(x, 0), GPoint(x, tick_h - 1));
    if (draw_bottom)
      graphics_draw_line(ctx, GPoint(x, layer_h - tick_h), GPoint(x, layer_h - 1));
  }
}

// Draw the vertical separator line between label area and graph area.
static inline void graph_draw_separator(GContext *ctx, int graph_x, int layer_h) {
  graphics_context_set_stroke_color(ctx, GColorDarkGray);
  graphics_context_set_stroke_width(ctx, 1);
  graphics_draw_line(ctx, GPoint(graph_x - 1, 0), GPoint(graph_x - 1, layer_h - 1));
}
