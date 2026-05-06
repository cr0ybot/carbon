#pragma once
#include <pebble.h>

typedef struct TopBarLayer TopBarLayer;

TopBarLayer *top_bar_layer_create(GRect frame);
void         top_bar_layer_destroy(TopBarLayer *layer);
Layer       *top_bar_layer_get_layer(TopBarLayer *layer);
void         top_bar_layer_notify_battery(TopBarLayer *layer, BatteryChargeState state);
void         top_bar_layer_notify_bt(TopBarLayer *layer, bool connected);
