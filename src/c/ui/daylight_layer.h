/**
 * Daylight layer
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

#pragma once
#include <pebble.h>

typedef struct DaylightLayer DaylightLayer;

DaylightLayer *daylight_layer_create(GRect frame);
void daylight_layer_destroy(DaylightLayer *layer);
Layer *daylight_layer_get_layer(DaylightLayer *layer);

// sunrise_hour and sunset_hour are wall-clock hours (0-23).
// current_hour is the first hour shown in the graph (leftmost column).
// When sunrise_approx or sunset_approx is true the corresponding endpoint is
// drawn as a dithered fade centered on that hour instead of a solid endcap.
void daylight_layer_set_data(DaylightLayer *layer, uint8_t sunrise_hour,
                             uint8_t sunset_hour, uint8_t current_hour,
                             bool sunrise_approx, bool sunset_approx);
