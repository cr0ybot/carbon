/**
 * Icon bar layer
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

#include "icon_bar_layer.h"
#include "../generated/icons.h"
#include "graph_common.h"

struct IconBarLayer {
	Layer *layer;
	GFont icon_font;
	int battery_percent;
	bool battery_charging;
	bool bt_connected;
	WeatherCondition condition;
	bool is_day;
	bool weather_disconnected;
};

static const char *prv_battery_icon(int pct, bool charging) {
	if (charging)
		return ICON_BATTERY__CHARGING;
	if (pct >= 70)
		return ICON_BATTERY__FULL;
	if (pct >= 35)
		return ICON_BATTERY__HALF;
	if (pct >= 10)
		return ICON_BATTERY__LOW;
	return ICON_BATTERY__EMPTY;
}

static const char *prv_condition_icon(WeatherCondition cond, bool is_day) {
	switch (cond) {
	case WEATHER_CONDITION_CLEAR:
		return is_day ? ICON_SUN : ICON_MOON;
	case WEATHER_CONDITION_PARTLY_CLOUDY:
		return is_day ? ICON_PARTLY_CLOUDY : ICON_PARTLY_CLOUDY__NIGHT;
	case WEATHER_CONDITION_MOSTLY_CLOUDY:
		return is_day ? ICON_MOSTLY_CLOUDY : ICON_MOSTLY_CLOUDY__NIGHT;
	case WEATHER_CONDITION_CLOUDY:
		return ICON_CLOUDY;
	case WEATHER_CONDITION_FOG:
		return is_day ? ICON_CLOUD : ICON_HAZE__NIGHT;
	case WEATHER_CONDITION_WINDY:
		return ICON_WINDY;
	case WEATHER_CONDITION_DRIZZLE:
		return ICON_RAIN__DRIZZLE;
	case WEATHER_CONDITION_RAIN:
		return is_day ? ICON_RAIN : ICON_RAIN__SCATTERED__NIGHT;
	case WEATHER_CONDITION_RAIN_HEAVY:
		return ICON_RAIN__HEAVY;
	case WEATHER_CONDITION_SLEET:
		return ICON_SLEET;
	case WEATHER_CONDITION_SNOW:
		return is_day ? ICON_SNOW : ICON_SNOW__SCATTERED__NIGHT;
	case WEATHER_CONDITION_SNOW_HEAVY:
		return ICON_SNOW__HEAVY;
	case WEATHER_CONDITION_HAIL:
		return ICON_HAIL;
	case WEATHER_CONDITION_STORM:
		return is_day ? ICON_THUNDERSTORM__SCATTERED
		              : ICON_THUNDERSTORM__SCATTERED__NIGHT;
	case WEATHER_CONDITION_STORM_SEVERE:
		return ICON_THUNDERSTORM__STRONG;
	case WEATHER_CONDITION_TORNADO:
		return ICON_TORNADO;
	default:
		return ICON_CLOUD__OFFLINE;
	}
}

static void prv_update_proc(Layer *layer, GContext *ctx) {
	IconBarLayer *sl = *(IconBarLayer **)layer_get_data(layer);
	GRect bounds = layer_get_bounds(layer);
	int graph_x = GRAPH_OFFSET_X;
	int lh = bounds.size.h;
	int zone_h = lh / 3;

#if PBL_DISPLAY_HEIGHT >= 228
	int icon_size = 22;
#elif PBL_DISPLAY_HEIGHT <= 168
	int icon_size = 14;
#else
	int icon_size = 18;
#endif

	// Black column fill covers any graph bleed from underlying layers
	graphics_context_set_fill_color(ctx, GColorBlack);
	graphics_fill_rect(ctx, GRect(0, 0, graph_x - 1, lh), 0, GCornerNone);

	// Single separator spanning the full combined height
	graph_draw_separator(ctx, graph_x, lh);

	// Three equally-spaced icon slots: battery, bluetooth, weather condition
	graphics_context_set_text_color(ctx, GColorWhite);

	// Slot 0: battery (always shown)
	int y0 = (zone_h - icon_size) / 2;
	graphics_draw_text(
	    ctx, prv_battery_icon(sl->battery_percent, sl->battery_charging),
	    sl->icon_font, GRect(0, y0, graph_x, icon_size),
	    GTextOverflowModeTrailingEllipsis, GTextAlignmentCenter, NULL);

	// Slot 1: connection status — BT disconnect takes priority; signal-off
	// shown for both fully-expired and partially-expired weather data.
	const char *conn_icon = NULL;
	if (!sl->bt_connected)
		conn_icon = ICON_BLUETOOTH__OFF;
	else if (sl->weather_disconnected)
		conn_icon = ICON_CONNECTION_SIGNAL__OFF;
	if (conn_icon) {
		int y1 = zone_h + (zone_h - icon_size) / 2;
		graphics_draw_text(
		    ctx, conn_icon, sl->icon_font, GRect(0, y1, graph_x, icon_size),
		    GTextOverflowModeTrailingEllipsis, GTextAlignmentCenter, NULL);
	}

	// Slot 2: weather condition — only shown when data is available for the
	// current hour (condition != UNKNOWN means set_condition was called).
	if (sl->condition != WEATHER_CONDITION_UNKNOWN) {
		int y2 = 2 * zone_h + (zone_h - icon_size) / 2;
		graphics_draw_text(ctx, prv_condition_icon(sl->condition, sl->is_day),
		                   sl->icon_font, GRect(0, y2, graph_x, icon_size),
		                   GTextOverflowModeTrailingEllipsis,
		                   GTextAlignmentCenter, NULL);
	}
}

IconBarLayer *icon_bar_layer_create(GRect frame) {
	IconBarLayer *sl = malloc(sizeof(IconBarLayer));
	if (!sl)
		return NULL;

	BatteryChargeState batt = battery_state_service_peek();
	sl->battery_percent = batt.charge_percent;
	sl->battery_charging = batt.is_charging;
	sl->bt_connected = true;
	sl->condition = WEATHER_CONDITION_UNKNOWN;
	sl->is_day = true;
	sl->weather_disconnected = true; // shown until first weather fetch

#if PBL_DISPLAY_HEIGHT >= 228
	sl->icon_font = fonts_load_custom_font(
	    resource_get_handle(RESOURCE_ID_CARBON_ICONS_22));
#elif PBL_DISPLAY_HEIGHT <= 168
	sl->icon_font = fonts_load_custom_font(
	    resource_get_handle(RESOURCE_ID_CARBON_ICONS_14));
#else
	sl->icon_font = fonts_load_custom_font(
	    resource_get_handle(RESOURCE_ID_CARBON_ICONS_18));
#endif

	sl->layer = layer_create_with_data(frame, sizeof(IconBarLayer *));
	*(IconBarLayer **)layer_get_data(sl->layer) = sl;
	layer_set_update_proc(sl->layer, prv_update_proc);
	return sl;
}

void icon_bar_layer_destroy(IconBarLayer *layer) {
	if (!layer)
		return;
	fonts_unload_custom_font(layer->icon_font);
	layer_destroy(layer->layer);
	free(layer);
}

Layer *icon_bar_layer_get_layer(IconBarLayer *layer) {
	return layer ? layer->layer : NULL;
}

void icon_bar_layer_notify_battery(IconBarLayer *layer,
                                   BatteryChargeState state) {
	if (!layer)
		return;
	layer->battery_percent = state.charge_percent;
	layer->battery_charging = state.is_charging;
	layer_mark_dirty(layer->layer);
}

void icon_bar_layer_notify_bt(IconBarLayer *layer, bool connected) {
	if (!layer)
		return;
	layer->bt_connected = connected;
	layer_mark_dirty(layer->layer);
}

void icon_bar_layer_set_condition(IconBarLayer *layer,
                                  WeatherCondition condition) {
	if (!layer)
		return;
	layer->condition = condition;
	layer_mark_dirty(layer->layer);
}

void icon_bar_layer_set_daytime(IconBarLayer *layer, bool is_day) {
	if (!layer)
		return;
	layer->is_day = is_day;
	layer_mark_dirty(layer->layer);
}

void icon_bar_layer_set_disconnected(IconBarLayer *layer, bool disconnected) {
	if (!layer)
		return;
	layer->weather_disconnected = disconnected;
	layer_mark_dirty(layer->layer);
}
