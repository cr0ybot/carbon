/**
 * Icon bar layer
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

#pragma once
#include "../modules/weather.h"
#include <pebble.h>

typedef struct IconBarLayer IconBarLayer;

IconBarLayer *icon_bar_layer_create(GRect frame);
void icon_bar_layer_destroy(IconBarLayer *layer);
Layer *icon_bar_layer_get_layer(IconBarLayer *layer);

void icon_bar_layer_notify_battery(IconBarLayer *layer,
                                   BatteryChargeState state);
void icon_bar_layer_notify_bt(IconBarLayer *layer, bool connected);
void icon_bar_layer_set_condition(IconBarLayer *layer,
                                  WeatherCondition condition);
void icon_bar_layer_set_daytime(IconBarLayer *layer, bool is_day);
void icon_bar_layer_set_disconnected(IconBarLayer *layer, bool disconnected);
