#include "time_layer.h"
#include <stdio.h>

struct TimeLayer {
  Layer      *container;
  TextLayer  *city_label;
  TextLayer  *time_label;
  TextLayer  *date_label;
  char        city_buf[24];
  char        time_buf[8];
  char        date_buf[32];
};

static const char *prv_date_format(DateFormat fmt) {
  switch (fmt) {
    case DATE_FORMAT_WEEKDAY_MON_D:  return "%A, %b %-d";
    case DATE_FORMAT_M_D_YYYY:       return "%-m/%-d/%Y";
    case DATE_FORMAT_D_MON_YYYY:     return "%-d %b %Y";
    case DATE_FORMAT_ISO:            return "%Y-%m-%d";
    case DATE_FORMAT_WEEKDAY_M_D:
    default:                         return "%A, %-m/%-d";
  }
}

TimeLayer *time_layer_create(GRect frame) {
  TimeLayer *tl = malloc(sizeof(TimeLayer));
  if (!tl) return NULL;

  tl->city_buf[0] = '\0';
  tl->time_buf[0] = '\0';
  tl->date_buf[0] = '\0';

  tl->container = layer_create(frame);
  int w = frame.size.w;

  // City name — top, small font
  tl->city_label = text_layer_create(GRect(0, 2, w, 20));
  text_layer_set_background_color(tl->city_label, GColorClear);
  text_layer_set_text_color(tl->city_label, GColorWhite);
  text_layer_set_font(tl->city_label,
                      fonts_get_system_font(FONT_KEY_GOTHIC_18));
  text_layer_set_text_alignment(tl->city_label, GTextAlignmentCenter);
  text_layer_set_text(tl->city_label, tl->city_buf);
  layer_add_child(tl->container, text_layer_get_layer(tl->city_label));

  // Time — large, centered below city
  GFont time_font = PBL_IF_RECT_ELSE(
    fonts_get_system_font(FONT_KEY_LECO_42_NUMBERS),
    fonts_get_system_font(FONT_KEY_LECO_36_BOLD_NUMBERS));
  int time_y = PBL_IF_RECT_ELSE(24, 22);
  int time_h = PBL_IF_RECT_ELSE(50, 44);
  tl->time_label = text_layer_create(GRect(0, time_y, w, time_h));
  text_layer_set_background_color(tl->time_label, GColorClear);
  text_layer_set_text_color(tl->time_label, GColorWhite);
  text_layer_set_font(tl->time_label, time_font);
  text_layer_set_text_alignment(tl->time_label, GTextAlignmentCenter);
  text_layer_set_text(tl->time_label, tl->time_buf);
  layer_add_child(tl->container, text_layer_get_layer(tl->time_label));

  // Date — below time
  int date_y = time_y + time_h + 2;
  tl->date_label = text_layer_create(GRect(0, date_y, w, 28));
  text_layer_set_background_color(tl->date_label, GColorClear);
  text_layer_set_text_color(tl->date_label, GColorWhite);
  text_layer_set_font(tl->date_label,
                      fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD));
  text_layer_set_text_alignment(tl->date_label, GTextAlignmentCenter);
  text_layer_set_text(tl->date_label, tl->date_buf);
  layer_add_child(tl->container, text_layer_get_layer(tl->date_label));

  return tl;
}

void time_layer_destroy(TimeLayer *layer) {
  if (!layer) return;
  text_layer_destroy(layer->date_label);
  text_layer_destroy(layer->time_label);
  text_layer_destroy(layer->city_label);
  layer_destroy(layer->container);
  free(layer);
}

Layer *time_layer_get_layer(TimeLayer *layer) {
  return layer ? layer->container : NULL;
}

void time_layer_set_city(TimeLayer *layer, const char *city) {
  if (!layer || !city) return;
  strncpy(layer->city_buf, city, sizeof(layer->city_buf) - 1);
  layer->city_buf[sizeof(layer->city_buf) - 1] = '\0';
  text_layer_set_text(layer->city_label, layer->city_buf);
}

void time_layer_update(TimeLayer *layer, struct tm *tick_time,
                       const Settings *settings) {
  if (!layer || !tick_time || !settings) return;

  strftime(layer->time_buf, sizeof(layer->time_buf),
           settings->time_24h ? "%H:%M" : "%I:%M", tick_time);
  // Strip leading zero from 12h format
  const char *time_str = layer->time_buf;
  if (!settings->time_24h && time_str[0] == '0') time_str++;
  text_layer_set_text(layer->time_label, time_str);

  strftime(layer->date_buf, sizeof(layer->date_buf),
           prv_date_format(settings->date_format), tick_time);
  text_layer_set_text(layer->date_label, layer->date_buf);
}
