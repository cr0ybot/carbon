#pragma once
#include <pebble.h>

typedef struct EventLayer EventLayer;

EventLayer *event_layer_create(GRect frame);
void        event_layer_destroy(EventLayer *layer);
Layer      *event_layer_get_layer(EventLayer *layer);

// hourly_code: 24-entry WMO code array.
// cloud_h: height of the cloud region within this layer's frame;
//          icons are centered on that boundary so they straddle cloud/precip.
void        event_layer_set_data(EventLayer *layer,
                                 const uint8_t hourly_code[24],
                                 int cloud_h);
