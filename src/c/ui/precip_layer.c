#include "precip_layer.h"
#include "graph_common.h"
#include "../generated/icons.h"

struct PrecipLayer {
  Layer            *layer;
  GFont             icon_font;
  uint8_t           prob[GRAPH_HOURS];
  uint8_t           current_hour;
  WeatherCondition  condition;
};

// Map WeatherCondition to the appropriate icon string
static const char *prv_condition_icon(WeatherCondition cond) {
  switch (cond) {
    case WEATHER_CONDITION_CLEAR:         return ICON_SUN;
    case WEATHER_CONDITION_PARTLY_CLOUDY: return ICON_CLOUD_SUN;
    case WEATHER_CONDITION_CLOUDY:        return ICON_CLOUDY;
    case WEATHER_CONDITION_FOG:           return ICON_CLOUD_FOG;
    case WEATHER_CONDITION_DRIZZLE:       return ICON_CLOUD_DRIZZLE;
    case WEATHER_CONDITION_RAIN:          return ICON_CLOUD_RAIN;
    case WEATHER_CONDITION_SNOW:          return ICON_CLOUD_SNOW;
    case WEATHER_CONDITION_STORM:         return ICON_CLOUD_LIGHTNING;
    default:                              return ICON_CLOUD;
  }
}

static void prv_update_proc(Layer *layer, GContext *ctx) {
  PrecipLayer *pl = *(PrecipLayer **)layer_get_data(layer);
  GRect bounds = layer_get_bounds(layer);
  int graph_x = GRAPH_OFFSET_X;
  int graph_w = bounds.size.w - graph_x;
  int layer_h = bounds.size.h;

  // Weather icon in left column, centered vertically
  graphics_context_set_text_color(ctx, GColorWhite);
  graphics_draw_text(ctx, prv_condition_icon(pl->condition),
                     pl->icon_font,
                     GRect(0, (layer_h - 18) / 2, graph_x - 2, 18),
                     GTextOverflowModeTrailingEllipsis,
                     GTextAlignmentCenter, NULL);

  // Vertical separator
  graph_draw_separator(ctx, graph_x, layer_h);

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
  pl->condition    = WEATHER_CONDITION_UNKNOWN;
  pl->icon_font    = fonts_load_custom_font(
    resource_get_handle(RESOURCE_ID_CARBON_ICONS_18));

  pl->layer = layer_create_with_data(frame, sizeof(PrecipLayer *));
  *(PrecipLayer **)layer_get_data(pl->layer) = pl;
  layer_set_update_proc(pl->layer, prv_update_proc);
  return pl;
}

void precip_layer_destroy(PrecipLayer *layer) {
  if (!layer) return;
  fonts_unload_custom_font(layer->icon_font);
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

void precip_layer_set_condition(PrecipLayer *layer, WeatherCondition condition) {
  if (!layer) return;
  layer->condition = condition;
  layer_mark_dirty(layer->layer);
}
