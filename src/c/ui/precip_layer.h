#pragma once
#include <pebble.h>
#include "../modules/weather.h"

typedef struct PrecipLayer PrecipLayer;

PrecipLayer *precip_layer_create(GRect frame);
void         precip_layer_destroy(PrecipLayer *layer);
Layer       *precip_layer_get_layer(PrecipLayer *layer);
void         precip_layer_set_data(PrecipLayer *layer,
                                   const uint8_t prob[24],
                                   uint8_t current_hour);
void         precip_layer_set_condition(PrecipLayer *layer, WeatherCondition condition);
