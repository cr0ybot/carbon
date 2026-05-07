#pragma once
#include <pebble.h>
#include "../modules/weather.h"

typedef struct IconBarLayer IconBarLayer;

IconBarLayer *icon_bar_layer_create(GRect frame);
void          icon_bar_layer_destroy(IconBarLayer *layer);
Layer        *icon_bar_layer_get_layer(IconBarLayer *layer);

void          icon_bar_layer_notify_battery(IconBarLayer *layer,
                                            BatteryChargeState state);
void          icon_bar_layer_notify_bt(IconBarLayer *layer, bool connected);
void          icon_bar_layer_set_condition(IconBarLayer *layer,
                                           WeatherCondition condition);
void          icon_bar_layer_set_daytime(IconBarLayer *layer, bool is_day);
