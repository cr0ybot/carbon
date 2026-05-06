#pragma once
#include <pebble.h>
#include "../modules/settings.h"

typedef struct TempLayer TempLayer;

TempLayer *temp_layer_create(GRect frame);
void       temp_layer_destroy(TempLayer *layer);
Layer     *temp_layer_get_layer(TempLayer *layer);
void       temp_layer_set_data(TempLayer *layer,
                               int16_t current,
                               int16_t high,
                               int16_t low,
                               const int8_t hourly[24],
                               uint8_t current_hour);
void       temp_layer_set_unit(TempLayer *layer, bool celsius);
