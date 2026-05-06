#pragma once
#include <pebble.h>

typedef struct DaylightLayer DaylightLayer;

DaylightLayer *daylight_layer_create(GRect frame);
void           daylight_layer_destroy(DaylightLayer *layer);
Layer         *daylight_layer_get_layer(DaylightLayer *layer);

// sunrise_hour and sunset_hour are wall-clock hours (0-23).
// current_hour is the first hour shown in the graph (leftmost column).
void           daylight_layer_set_data(DaylightLayer *layer,
                                       uint8_t sunrise_hour,
                                       uint8_t sunset_hour,
                                       uint8_t current_hour);
