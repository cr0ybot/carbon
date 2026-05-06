#include "precip_layer.h"

#define HOURS 24
#define ICON_COL_W 18

struct PrecipLayer {
  Layer            *layer;
  uint8_t           prob[HOURS];
  uint8_t           sunrise_hour;
  uint8_t           sunset_hour;
  WeatherCondition  condition;
};

static void prv_draw_weather_icon(GContext *ctx, GRect bounds, WeatherCondition cond) {
  int cx = bounds.size.w / 2;
  int cy = bounds.size.h / 2;

  graphics_context_set_stroke_color(ctx, GColorWhite);
  graphics_context_set_fill_color(ctx, GColorWhite);
  graphics_context_set_stroke_width(ctx, 1);

  switch (cond) {
    case WEATHER_CONDITION_CLEAR:
      // Sun: circle
      graphics_draw_circle(ctx, GPoint(cx, cy), 5);
      // Four rays
      graphics_draw_line(ctx, GPoint(cx, cy - 8), GPoint(cx, cy - 6));
      graphics_draw_line(ctx, GPoint(cx, cy + 6), GPoint(cx, cy + 8));
      graphics_draw_line(ctx, GPoint(cx - 8, cy), GPoint(cx - 6, cy));
      graphics_draw_line(ctx, GPoint(cx + 6, cy), GPoint(cx + 8, cy));
      break;

    case WEATHER_CONDITION_PARTLY_CLOUDY:
      // Sun peeking behind cloud
      graphics_draw_circle(ctx, GPoint(cx - 2, cy - 2), 4);
      // Cloud bumps
      graphics_fill_circle(ctx, GPoint(cx - 1, cy + 3), 3);
      graphics_fill_circle(ctx, GPoint(cx + 4, cy + 2), 4);
      graphics_fill_circle(ctx, GPoint(cx + 5, cy + 5), 3);
      graphics_fill_rect(ctx,
        GRect(cx - 4, cy + 4, 14, 4), 0, GCornerNone);
      break;

    case WEATHER_CONDITION_CLOUDY:
      graphics_fill_circle(ctx, GPoint(cx - 2, cy), 4);
      graphics_fill_circle(ctx, GPoint(cx + 3, cy - 1), 5);
      graphics_fill_circle(ctx, GPoint(cx + 4, cy + 2), 4);
      graphics_fill_rect(ctx,
        GRect(cx - 6, cy + 1, 14, 5), 0, GCornerNone);
      break;

    case WEATHER_CONDITION_FOG:
      // Horizontal lines
      for (int y = cy - 3; y <= cy + 3; y += 3) {
        graphics_draw_line(ctx, GPoint(cx - 7, y), GPoint(cx + 7, y));
      }
      break;

    case WEATHER_CONDITION_DRIZZLE:
    case WEATHER_CONDITION_RAIN:
      // Cloud
      graphics_fill_circle(ctx, GPoint(cx - 1, cy - 2), 3);
      graphics_fill_circle(ctx, GPoint(cx + 3, cy - 3), 4);
      graphics_fill_rect(ctx,
        GRect(cx - 4, cy - 1, 11, 3), 0, GCornerNone);
      // Rain drops
      graphics_draw_line(ctx, GPoint(cx - 3, cy + 3), GPoint(cx - 5, cy + 7));
      graphics_draw_line(ctx, GPoint(cx,     cy + 3), GPoint(cx - 2, cy + 7));
      graphics_draw_line(ctx, GPoint(cx + 3, cy + 3), GPoint(cx + 1, cy + 7));
      break;

    case WEATHER_CONDITION_SNOW:
      // Cloud
      graphics_fill_circle(ctx, GPoint(cx - 1, cy - 3), 3);
      graphics_fill_circle(ctx, GPoint(cx + 3, cy - 4), 4);
      graphics_fill_rect(ctx,
        GRect(cx - 4, cy - 2, 11, 3), 0, GCornerNone);
      // Snow dots
      graphics_fill_circle(ctx, GPoint(cx - 3, cy + 4), 1);
      graphics_fill_circle(ctx, GPoint(cx,     cy + 5), 1);
      graphics_fill_circle(ctx, GPoint(cx + 3, cy + 4), 1);
      break;

    case WEATHER_CONDITION_STORM:
      // Cloud
      graphics_fill_circle(ctx, GPoint(cx - 1, cy - 4), 3);
      graphics_fill_circle(ctx, GPoint(cx + 3, cy - 5), 4);
      graphics_fill_rect(ctx,
        GRect(cx - 4, cy - 3, 11, 3), 0, GCornerNone);
      // Lightning bolt
      graphics_draw_line(ctx, GPoint(cx + 1, cy),     GPoint(cx - 2, cy + 4));
      graphics_draw_line(ctx, GPoint(cx - 2, cy + 4), GPoint(cx + 1, cy + 4));
      graphics_draw_line(ctx, GPoint(cx + 1, cy + 4), GPoint(cx - 2, cy + 8));
      break;

    default:
      // Question mark substitute: just a small circle
      graphics_draw_circle(ctx, GPoint(cx, cy), 4);
      break;
  }
}

static void prv_update_proc(Layer *layer, GContext *ctx) {
  PrecipLayer *pl = *(PrecipLayer **)layer_get_data(layer);
  GRect bounds = layer_get_bounds(layer);
  int bar_area_x = ICON_COL_W;
  int bar_area_w = bounds.size.w - ICON_COL_W;
  int bar_w = bar_area_w / HOURS;
  int layer_h = bounds.size.h;

  // Weather icon in left column
  prv_draw_weather_icon(ctx, GRect(0, 0, ICON_COL_W, layer_h), pl->condition);

  // Precipitation bars (down from top)
  graphics_context_set_fill_color(ctx, GColorWhite);
  for (int i = 0; i < HOURS; i++) {
    if (pl->prob[i] == 0) continue;
    int bar_h = (pl->prob[i] * (layer_h - 2)) / 100;
    int x = bar_area_x + i * bar_w;
    graphics_fill_rect(ctx, GRect(x, 0, bar_w - 1, bar_h), 0, GCornerNone);
  }

  // Daylight line: thin horizontal line at y=2 spanning sunrise→sunset columns
  if (pl->sunrise_hour < pl->sunset_hour && pl->sunset_hour <= HOURS) {
    int x0 = bar_area_x + pl->sunrise_hour * bar_w;
    int x1 = bar_area_x + pl->sunset_hour  * bar_w;
    graphics_context_set_stroke_color(ctx, GColorWhite);
    graphics_context_set_stroke_width(ctx, 1);
    graphics_draw_line(ctx, GPoint(x0, 1), GPoint(x1, 1));
  }
}

PrecipLayer *precip_layer_create(GRect frame) {
  PrecipLayer *pl = malloc(sizeof(PrecipLayer));
  if (!pl) return NULL;
  memset(pl->prob, 0, sizeof(pl->prob));
  pl->sunrise_hour = 6;
  pl->sunset_hour  = 20;
  pl->condition    = WEATHER_CONDITION_UNKNOWN;

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
                           uint8_t sunrise_hour,
                           uint8_t sunset_hour) {
  if (!layer) return;
  memcpy(layer->prob, prob, HOURS);
  layer->sunrise_hour = sunrise_hour;
  layer->sunset_hour  = sunset_hour;
  layer_mark_dirty(layer->layer);
}

void precip_layer_set_condition(PrecipLayer *layer, WeatherCondition condition) {
  if (!layer) return;
  layer->condition = condition;
  layer_mark_dirty(layer->layer);
}
