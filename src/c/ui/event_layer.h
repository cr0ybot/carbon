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
void event_layer_destroy(EventLayer *layer);
Layer *event_layer_get_layer(EventLayer *layer);

// hourly_code: 24-entry WMO code array, shifted so index 0 = current hour.
// hours_remaining: how many of those 24 entries contain valid data.
//   Entries at index >= hours_remaining are drawn as a missing-data span
//   marked with ICON_CONNECTION_SIGNAL__OFF.
void event_layer_set_data(EventLayer *layer, const uint8_t hourly_code[24],
                          uint8_t hours_remaining);
