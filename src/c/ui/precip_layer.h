/**
 * Precipitation layer
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

#pragma once
#include "../modules/weather.h"
#include <pebble.h>

typedef struct PrecipLayer PrecipLayer;

PrecipLayer *precip_layer_create(GRect frame);
void precip_layer_destroy(PrecipLayer *layer);
Layer *precip_layer_get_layer(PrecipLayer *layer);
void precip_layer_set_data(PrecipLayer *layer, const uint8_t prob[24],
                           const uint8_t hourly_code[24], uint8_t current_hour,
                           uint8_t hours_remaining);
