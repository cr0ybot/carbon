/**
 * Cloud layer
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

#pragma once
#include <pebble.h>

typedef struct CloudLayer CloudLayer;

CloudLayer *cloud_layer_create(GRect frame);
void        cloud_layer_destroy(CloudLayer *layer);
Layer      *cloud_layer_get_layer(CloudLayer *layer);
void        cloud_layer_set_data(CloudLayer *layer, const uint8_t cover[24],
                                 const uint8_t hourly_code[24],
                                 uint8_t current_hour);
