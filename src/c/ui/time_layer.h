#pragma once
#include <pebble.h>
#include "../modules/settings.h"

typedef struct TimeLayer TimeLayer;

TimeLayer *time_layer_create(GRect frame);
void       time_layer_destroy(TimeLayer *layer);
Layer     *time_layer_get_layer(TimeLayer *layer);
void       time_layer_set_city(TimeLayer *layer, const char *city);
// settings is used for date_format only; 24h is read from clock_is_24h_style()
void       time_layer_update(TimeLayer *layer, struct tm *tick_time,
                             const Settings *settings);
