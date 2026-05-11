/**
 * Event layer
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

#include "event_layer.h"
#include "../generated/icons.h"
#include "graph_common.h"

struct EventLayer {
	Layer *layer;
	GFont icon_font;
	uint8_t hourly_code[GRAPH_HOURS];
	uint8_t hours_remaining;
};

typedef enum {
	EVENT_KIND_NONE = 0,
	EVENT_KIND_SNOW,
	EVENT_KIND_STORM,
	EVENT_KIND_TORNADO,
	EVENT_KIND_MISSING,
} EventKind;

// Represents a consecutive span of the same event type
typedef struct {
	int start_hour;
	int end_hour;
	EventKind kind;
	GColor color;
	const char *icon;
} EventSpan;

// Returns the icon string and its display color for notable WMO codes.
// Returns NULL for codes that don't warrant a special icon.
static const char *prv_event_icon(uint8_t code, GColor *out_color,
                                  EventKind *out_kind) {
	if (code == 19 || code == 99) {
		*out_color = GColorOrange;
		*out_kind = EVENT_KIND_TORNADO;
		return ICON_TORNADO;
	}
	if (code >= 95 && code <= 98) {
		*out_color = GColorYellow;
		*out_kind = EVENT_KIND_STORM;
		return ICON_LIGHTNING;
	}
	if (code == 75 || code == 77 || code == 85 || code == 86) {
		*out_color = GColorCyan;
		*out_kind = EVENT_KIND_SNOW;
		return ICON_SNOWFLAKE;
	}
	*out_kind = EVENT_KIND_NONE;
	return NULL;
}

// Scan hourly_code to identify consecutive runs of the same event type.
// Also appends a single MISSING span for hours >= hours_remaining.
// Returns the number of spans found and populates the spans array.
static int prv_find_spans(const uint8_t hourly_code[24],
                          uint8_t hours_remaining, EventSpan spans[24]) {
	int span_count = 0;
	int i = 0;
	while (i < (int)hours_remaining && i < GRAPH_HOURS) {
		GColor color;
		EventKind kind;
		const char *icon = prv_event_icon(hourly_code[i], &color, &kind);
		if (!icon) {
			i++;
			continue;
		}

		// Group consecutive hours that map to the same visual event type.
		int start = i;
		while (i < (int)hours_remaining && i < GRAPH_HOURS) {
			GColor next_color;
			EventKind next_kind;
			if (!prv_event_icon(hourly_code[i], &next_color, &next_kind) ||
			    next_kind != kind) {
				break;
			}
			i++;
		}

		spans[span_count].start_hour = start;
		spans[span_count].end_hour = i - 1;
		spans[span_count].kind = kind;
		spans[span_count].color = color;
		spans[span_count].icon = icon;
		span_count++;
	}

	// Only append a missing span when some valid data exists — total absence
	// is indicated by the icon_bar disconnect icon instead.
	if ((int)hours_remaining > 0 && (int)hours_remaining < GRAPH_HOURS) {
		spans[span_count].start_hour = (int)hours_remaining;
		spans[span_count].end_hour = GRAPH_HOURS - 1;
		spans[span_count].kind = EVENT_KIND_MISSING;
		spans[span_count].color = GColorRed;
		spans[span_count].icon = ICON_CONNECTION_SIGNAL__OFF;
		span_count++;
	}

	return span_count;
}

static void prv_update_proc(Layer *layer, GContext *ctx) {
	EventLayer *el = *(EventLayer **)layer_get_data(layer);
	if (!el->icon_font)
		return;

	GRect bounds = layer_get_bounds(layer);
	int graph_x = GRAPH_OFFSET_X;
	int graph_w = bounds.size.w - graph_x;
	int layer_h = bounds.size.h;

	// Find all event spans in the hourly data
	EventSpan spans[GRAPH_HOURS];
	int span_count =
	    prv_find_spans(el->hourly_code, el->hours_remaining, spans);

	// Draw each span in reverse order so earlier spans are on top of later ones
	// in case of overlap.
	for (int s = span_count - 1; s >= 0; s--) {
		EventSpan *span = &spans[s];

		// Calculate x-position for the center of each hour
		// Formula: graph_x + (hour * 2 + 1) / (GRAPH_HOURS * 2) * graph_w
		int x_start = graph_x + (long)(span->start_hour * 2 + 1) * graph_w /
		                            (GRAPH_HOURS * 2);
		int x_end = graph_x + (long)(span->end_hour * 2 + 1) * graph_w /
		                          (GRAPH_HOURS * 2);

		// Center vertically in the layer
		int center_y = layer_h / 2;
		int icon_x = (x_start + x_end) / 2;
		int icon_size = 12;
		int icon_gap =
		    icon_size / 2 + 1; // Add gap between icon and extent lines.
		GColor icon_color;

		graphics_context_set_stroke_width(ctx, 1);

#if defined(PBL_COLOR)
		icon_color = span->color;
#else
		icon_color = GColorWhite;
#endif

		graphics_context_set_stroke_color(ctx, icon_color);

		if (x_start < icon_x - icon_gap) {
			graphics_draw_line(ctx, GPoint(x_start, center_y),
			                   GPoint(icon_x - icon_gap, center_y));
			graphics_draw_line(ctx, GPoint(x_start, center_y - 2),
			                   GPoint(x_start, center_y + 2));
		}
		if (x_end > icon_x + icon_gap) {
			graphics_draw_line(ctx, GPoint(icon_x + icon_gap, center_y),
			                   GPoint(x_end, center_y));
			graphics_draw_line(ctx, GPoint(x_end, center_y - 2),
			                   GPoint(x_end, center_y + 2));
		}

		// Draw the icon centered in the span.
		graphics_context_set_text_color(ctx, icon_color);
		if (span->icon != NULL) {
			graphics_draw_text(
			    ctx, span->icon, el->icon_font,
			    GRect(icon_x - icon_size / 2, center_y - icon_size / 2,
			          icon_size, icon_size),
			    GTextOverflowModeWordWrap, GTextAlignmentCenter, NULL);
		}
	}
}

EventLayer *event_layer_create(GRect frame) {
	EventLayer *el = malloc(sizeof(EventLayer));
	if (!el)
		return NULL;
	memset(el->hourly_code, 0, sizeof(el->hourly_code));
	el->hours_remaining = GRAPH_HOURS;
	el->icon_font = fonts_load_custom_font(
	    resource_get_handle(RESOURCE_ID_CARBON_ICONS_12));
	el->layer = layer_create_with_data(frame, sizeof(EventLayer *));
	*(EventLayer **)layer_get_data(el->layer) = el;
	layer_set_update_proc(el->layer, prv_update_proc);
	return el;
}

void event_layer_destroy(EventLayer *layer) {
	if (!layer)
		return;
	if (layer->icon_font)
		fonts_unload_custom_font(layer->icon_font);
	layer_destroy(layer->layer);
	free(layer);
}

Layer *event_layer_get_layer(EventLayer *layer) {
	return layer ? layer->layer : NULL;
}

void event_layer_set_data(EventLayer *layer, const uint8_t hourly_code[24],
                          uint8_t hours_remaining) {
	if (!layer)
		return;
	memcpy(layer->hourly_code, hourly_code, GRAPH_HOURS);
	layer->hours_remaining = hours_remaining;
	layer_mark_dirty(layer->layer);
}
