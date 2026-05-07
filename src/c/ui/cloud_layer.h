#pragma once
#include <pebble.h>

typedef struct CloudLayer CloudLayer;

CloudLayer *cloud_layer_create(GRect frame);
void        cloud_layer_destroy(CloudLayer *layer);
Layer      *cloud_layer_get_layer(CloudLayer *layer);
void        cloud_layer_set_data(CloudLayer *layer, const uint8_t cover[24],
                                 const uint8_t hourly_code[24],
                                 uint8_t current_hour);
