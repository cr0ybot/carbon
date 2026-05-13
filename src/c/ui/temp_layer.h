/**
 * Temperature layer
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

#pragma once
#include <pebble.h>

typedef struct TempLayer TempLayer;

TempLayer *temp_layer_create(GRect frame);
void temp_layer_destroy(TempLayer *layer);
Layer *temp_layer_get_layer(TempLayer *layer);
void temp_layer_set_data(TempLayer *layer, int16_t current, int16_t high,
                         int16_t low, const int8_t hourly[24],
                         const int8_t apparent_hourly[24], uint8_t current_hour,
                         uint8_t hours_remaining);
// No-op kept for call-site compatibility; unit is baked into values by pkjs.
void temp_layer_set_unit(TempLayer *layer, bool celsius);
// Update only the current hour (tick positions) and hours_remaining without
// touching graph data. Pass hours_remaining=0 when no data is available.
void temp_layer_set_current_hour(TempLayer *layer, uint8_t current_hour,
                                 uint8_t hours_remaining);
