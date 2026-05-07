#include "event_layer.h"
#include "graph_common.h"
#include "../generated/icons.h"

struct EventLayer {
  Layer   *layer;
  GFont    icon_font;
  uint8_t  hourly_code[GRAPH_HOURS];
  int      cloud_h;
};

// Returns the icon string and its display color for notable WMO codes.
// Returns NULL for codes that don't warrant a special icon.
static const char *prv_event_icon(uint8_t code, GColor *out_color) {
  if (code == 19 || code == 99) {
    *out_color = GColorLightGray;
    return ICON_TORNADO;
  }
  if (code >= 95 && code <= 98) {
    *out_color = GColorYellow;
    return ICON_LIGHTNING;
  }
  if (code == 75 || code == 77 || code == 85 || code == 86) {
    *out_color = GColorCyan;
    return ICON_SNOWFLAKE;
  }
  return NULL;
}

static void prv_update_proc(Layer *layer, GContext *ctx) {
  EventLayer *el = *(EventLayer **)layer_get_data(layer);
  if (!el->icon_font) return;

  GRect bounds = layer_get_bounds(layer);
  (void)bounds;
  int graph_x = GRAPH_OFFSET_X;
  int graph_w = bounds.size.w - graph_x;
  int icon_size = 12;
  // Center icon vertically on the cloud/precip boundary, nudged up 2px.
  int icon_y = el->cloud_h - icon_size / 2 - 2;

  for (int i = GRAPH_HOURS - 1; i >= 0; i--) {
    GColor icon_color = GColorWhite;
    const char *icon = prv_event_icon(el->hourly_code[i], &icon_color);
    if (!icon) continue;

    // Draw later hours first so sooner icons overlap them.
    int cx = graph_x + (long)(i * 2 + 1) * graph_w / (GRAPH_HOURS * 2);

#if defined(PBL_COLOR)
    graphics_context_set_text_color(ctx, icon_color);
#else
    graphics_context_set_text_color(ctx, GColorWhite);
#endif
    graphics_draw_text(ctx, icon, el->icon_font,
                       GRect(cx - icon_size / 2, icon_y, icon_size, icon_size),
                       GTextOverflowModeWordWrap, GTextAlignmentCenter, NULL);
  }
}

EventLayer *event_layer_create(GRect frame) {
  EventLayer *el = malloc(sizeof(EventLayer));
  if (!el) return NULL;
  memset(el->hourly_code, 0, sizeof(el->hourly_code));
  el->cloud_h = frame.size.h / 2;
  el->icon_font = fonts_load_custom_font(
    resource_get_handle(RESOURCE_ID_CARBON_ICONS_12));
  el->layer = layer_create_with_data(frame, sizeof(EventLayer *));
  *(EventLayer **)layer_get_data(el->layer) = el;
  layer_set_update_proc(el->layer, prv_update_proc);
  return el;
}

void event_layer_destroy(EventLayer *layer) {
  if (!layer) return;
  if (layer->icon_font) fonts_unload_custom_font(layer->icon_font);
  layer_destroy(layer->layer);
  free(layer);
}

Layer *event_layer_get_layer(EventLayer *layer) {
  return layer ? layer->layer : NULL;
}

void event_layer_set_data(EventLayer *layer, const uint8_t hourly_code[24],
                          int cloud_h) {
  if (!layer) return;
  memcpy(layer->hourly_code, hourly_code, GRAPH_HOURS);
  layer->cloud_h = cloud_h;
  layer_mark_dirty(layer->layer);
}
