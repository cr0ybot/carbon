/**
 * Event layer
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

#pragma once
#include <pebble.h>

typedef struct EventLayer EventLayer;

EventLayer *event_layer_create(GRect frame);
void        event_layer_destroy(EventLayer *layer);
Layer      *event_layer_get_layer(EventLayer *layer);

// hourly_code: 24-entry WMO code array.
//              Groups consecutive hours with the same event type and renders
//              as a single icon in a colored circle with extent lines + endcaps.
void        event_layer_set_data(EventLayer *layer,
                                 const uint8_t hourly_code[24]);
