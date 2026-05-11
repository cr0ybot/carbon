/**
 * Precipitation layer
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

#include "precip_layer.h"
#include "graph_common.h"

struct PrecipLayer {
	Layer *layer;
	uint8_t prob[GRAPH_HOURS];
	uint8_t hourly_code[GRAPH_HOURS];
	uint8_t current_hour;
};

// Categorize a WMO code for bar coloring.
// Returns: 0=none/clear, 1=light rain, 2=heavy rain, 3=sleet/freezing,
//          4=light snow, 5=heavy snow, 6=storm, 7=severe storm
static uint8_t prv_precip_category(uint8_t code) {
	if (code == 0)
		return 0; // clear
	if (code <= 49)
		return 0; // fog/wind/non-precip
	if (code <= 55)
		return 1; // drizzle
	if (code <= 57)
		return 3; // freezing drizzle
	if (code <= 63)
		return 1; // light/moderate rain
	if (code <= 65)
		return 2; // heavy rain
	if (code <= 67)
		return 3; // freezing rain
	if (code <= 73)
		return 4; // light/moderate snow
	if (code <= 75)
		return 5; // heavy snow
	if (code <= 79)
		return 3; // ice pellets/sleet
	if (code <= 81)
		return 1; // light/moderate showers
	if (code == 82)
		return 2; // violent showers
	if (code <= 84)
		return 3; // rain-snow showers
	if (code <= 86)
		return 5; // snow showers heavy
	if (code <= 90)
		return 3; // hail
	if (code <= 96)
		return 6; // thunderstorm
	if (code == 99)
		return 8; // severe thunderstorm with hail
	return 7;     // heavy thunderstorm (97, 98)
}

static void prv_update_proc(Layer *layer, GContext *ctx) {
	PrecipLayer *pl = *(PrecipLayer **)layer_get_data(layer);
	GRect bounds = layer_get_bounds(layer);
	int graph_x = GRAPH_OFFSET_X;
	int graph_w = bounds.size.w - graph_x;
	int layer_h = bounds.size.h;

	// Precipitation bars — proportional x so bars fill to the right edge
	// Color platforms use WMO-category colors:
	//   light rain   → dim blue    (GColorOxfordBlue)
	//   heavy rain   → bright blue (GColorVividCerulean)
	//   sleet/freeze → cadet blue  (GColorCadetBlue)
	//   light snow   → light grey  (GColorLightGray)
	//   heavy snow   → white       (GColorWhite)
	//   storm        → bright blue (GColorVividCerulean) + lightning bolt
	//   heavy storm  → bright blue (GColorVividCerulean) + lightning bolt
	//   hail storm   → white       (GColorWhite) + lightning bolt
	for (int i = 0; i < GRAPH_HOURS; i++) {
		int x0 = graph_x + (long)i * graph_w / GRAPH_HOURS;
		int x1 = graph_x + (long)(i + 1) * graph_w / GRAPH_HOURS;
		int bar_w = x1 - x0 - 1;
		if (bar_w < 1)
			bar_w = 1;

		if (pl->prob[i] == 0)
			continue;

		int bar_h = (pl->prob[i] * (layer_h - 2)) / 100;

#if defined(PBL_COLOR)
		uint8_t cat = prv_precip_category(pl->hourly_code[i]);
		GColor bar_color;
		switch (cat) {
		case 1:
			bar_color = GColorCobaltBlue;
			break; // light rain
		case 2:
			bar_color = GColorVividCerulean;
			break; // heavy rain
		case 3:
			bar_color = GColorCeleste;
			break; // sleet/freeze
		case 4:
			bar_color = GColorLightGray;
			break; // light snow
		case 5:
			bar_color = GColorWhite;
			break; // heavy snow
		case 6:
			bar_color = GColorVeryLightBlue;
			break; // storm
		case 7:
			bar_color = GColorLiberty;
			break; // heavy storm
		case 8:
			bar_color = GColorBabyBlueEyes;
			break; // hail storm
		default:
			bar_color = GColorVividCerulean;
			break; // fallback
		}
		graphics_context_set_fill_color(ctx, bar_color);
#else
		graphics_context_set_fill_color(ctx, GColorWhite);
#endif
		graphics_fill_rect(ctx, GRect(x0, 0, bar_w, bar_h), 0, GCornerNone);
	}
}

PrecipLayer *precip_layer_create(GRect frame) {
	PrecipLayer *pl = malloc(sizeof(PrecipLayer));
	if (!pl)
		return NULL;
	memset(pl->prob, 0, sizeof(pl->prob));
	memset(pl->hourly_code, 0, sizeof(pl->hourly_code));
	pl->current_hour = 0;

	pl->layer = layer_create_with_data(frame, sizeof(PrecipLayer *));
	*(PrecipLayer **)layer_get_data(pl->layer) = pl;
	layer_set_update_proc(pl->layer, prv_update_proc);
	return pl;
}

void precip_layer_destroy(PrecipLayer *layer) {
	if (!layer)
		return;
	layer_destroy(layer->layer);
	free(layer);
}

Layer *precip_layer_get_layer(PrecipLayer *layer) {
	return layer ? layer->layer : NULL;
}

void precip_layer_set_data(PrecipLayer *layer, const uint8_t prob[24],
                           const uint8_t hourly_code[24],
                           uint8_t current_hour) {
	if (!layer)
		return;
	memcpy(layer->prob, prob, GRAPH_HOURS);
	memcpy(layer->hourly_code, hourly_code, GRAPH_HOURS);
	layer->current_hour = current_hour;
	layer_mark_dirty(layer->layer);
}
