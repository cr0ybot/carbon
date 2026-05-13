/**
 * Temperature layer
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

#include "temp_layer.h"
#include "graph_common.h"
#include <stdio.h>

struct TempLayer {
	Layer *layer;
	int16_t current;
	int16_t high;
	int16_t low;
	int8_t hourly[GRAPH_HOURS];
	int8_t apparent_hourly[GRAPH_HOURS];
	uint8_t current_hour;
	uint8_t hours_remaining;
	bool celsius;
};

static void prv_update_proc(Layer *layer, GContext *ctx) {
	TempLayer *tl = *(TempLayer **)layer_get_data(layer);
	GRect bounds = layer_get_bounds(layer);
	int lh = bounds.size.h;
	int graph_x = GRAPH_OFFSET_X;
	int graph_w = bounds.size.w - graph_x;

#if PBL_DISPLAY_HEIGHT >= 228
	GFont font_sm = fonts_get_system_font(FONT_KEY_GOTHIC_18);
	GFont font_md = fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD);
#else
	GFont font_sm = fonts_get_system_font(FONT_KEY_GOTHIC_14);
	GFont font_md = fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD);
#endif
	graphics_context_set_text_color(ctx, GColorWhite);

	// Left column: high, current, low — three equal zones matching
	// icon_bar_layer. Each item is centered in its zone; sm_lead compensates
	// for GOTHIC_14's internal top leading.
	static char curr_buf[10], high_buf[8], low_buf[8];
	snprintf(high_buf, sizeof(high_buf), "%d", (int)tl->high);
	snprintf(curr_buf, sizeof(curr_buf), "%d", (int)tl->current);
	snprintf(low_buf, sizeof(low_buf), "%d", (int)tl->low);

#if PBL_DISPLAY_HEIGHT >= 228
	int sm_h = 20;   // GOTHIC_18 rect height
	int md_h = 28;   // GOTHIC_24_BOLD rect height
	int sm_lead = 2; // GOTHIC_18 internal top leading
	int md_lead = 2; // GOTHIC_24_BOLD internal top leading
#else
	int sm_h = 15;   // GOTHIC_14 rect height
	int md_h = 20;   // GOTHIC_18_BOLD rect height
	int sm_lead = 1; // GOTHIC_14 internal top leading
	int md_lead = 2; // GOTHIC_18_BOLD internal top leading
#endif
	int zone_h =
	    (lh - 2) / 3; // 2px bottom padding keeps low label off the edge
	int label_x = GRAPH_OFFSET_X - 4;

	graphics_draw_text(ctx, high_buf, font_sm,
	                   GRect(0, (zone_h - sm_h) / 2 - sm_lead, label_x, sm_h),
	                   GTextOverflowModeWordWrap, GTextAlignmentRight, NULL);
	graphics_draw_text(
	    ctx, curr_buf, font_md,
	    GRect(0, zone_h + (zone_h - md_h) / 2 - md_lead, label_x, md_h),
	    GTextOverflowModeWordWrap, GTextAlignmentRight, NULL);
	graphics_draw_text(ctx, low_buf, font_sm,
	                   GRect(0, 2 * zone_h + (zone_h - (sm_h - sm_lead)) / 2,
	                         label_x, sm_h - sm_lead),
	                   GTextOverflowModeWordWrap, GTextAlignmentRight, NULL);

	// Vertical separator
	graph_draw_separator(ctx, graph_x, lh);

	// Sparkline — 25 points: current temp followed by 24 hourly forecasts.
	// Point 0 is at the left edge, point 24 at the right edge.
	// The sparkline min/max is based on both actual and apparent temps so the
	// two lines share the same y-scale.
	int16_t pts[25];
	pts[0] = tl->current;
	for (int i = 0; i < GRAPH_HOURS; i++)
		pts[i + 1] = tl->hourly[i];

	int16_t apt[25];
	apt[0] = tl->apparent_hourly[0]; // no separate "current apparent"; use
	                                 // first hourly
	for (int i = 0; i < GRAPH_HOURS; i++)
		apt[i + 1] = tl->apparent_hourly[i];

	// Bound the scale to the actual values in the two 24-hour arrays so the
	// lines always fill the available vertical space correctly.
	int16_t t_min = pts[0] < apt[0] ? pts[0] : apt[0];
	int16_t t_max = pts[0] > apt[0] ? pts[0] : apt[0];
	for (int i = 1; i < 25; i++) {
		if (pts[i] < t_min)
			t_min = pts[i];
		if (pts[i] > t_max)
			t_max = pts[i];
		if (apt[i] < t_min)
			t_min = apt[i];
		if (apt[i] > t_max)
			t_max = apt[i];
	}
	int t_range = t_max - t_min;
	if (t_range < 1)
		t_range = 1;

	int pad = 4;
	int graph_h = lh - pad * 2;

	// Pre-compute pixel positions for both lines
	int spx[25], spy[25];
	int apx[25], apy[25];
	for (int i = 0; i < 25; i++) {
		spx[i] = graph_x + i * graph_w / 24;
		spy[i] = pad + graph_h - ((pts[i] - t_min) * graph_h / t_range);
		apx[i] = spx[i];
		apy[i] = pad + graph_h - ((apt[i] - t_min) * graph_h / t_range);
	}

#if defined(PBL_COLOR)
	int line_bottom = lh - 1;
// Two-pass color rendering:
//   Pass 1 — dark fill from the line position down to the bottom of the layer.
//   Pass 2 — light-colored 1px line drawn on top at the actual-temp position.
//   Pass 3 — white 1px line for apparent temperature over everything.
//
// Using paired dark/light shades for each comfort band gives the effect of a
// lighter accent at the line and a darker mass below, making the white
// apparent-temp line legible across all temperature conditions.
//
// Thresholds (°F): <=10 pink  <=32 purple <=45 cyan   <=59 teal
//                  <=76 green <=84 yellow <=96 orange >96 red
#define TEMP_TO_F(t) (tl->celsius ? ((t)*9 / 5 + 32) : (t))
#define DARK_TEMP_COLOR(tf)                                                    \
	((tf) <= 10   ? GColorPurple                                               \
	 : (tf) <= 32 ? GColorImperialPurple                                       \
	 : (tf) <= 45 ? GColorTiffanyBlue                                          \
	 : (tf) <= 59 ? GColorCadetBlue                                            \
	 : (tf) <= 76 ? GColorKellyGreen                                           \
	 : (tf) <= 84 ? GColorBrass                                                \
	 : (tf) <= 96 ? GColorWindsorTan                                           \
	              : GColorDarkCandyAppleRed)
#define LIGHT_TEMP_COLOR(tf)                                                   \
	((tf) <= 10   ? GColorShockingPink                                         \
	 : (tf) <= 32 ? GColorLavenderIndigo                                       \
	 : (tf) <= 45 ? GColorCyan                                                 \
	 : (tf) <= 59 ? GColorMediumAquamarine                                     \
	 : (tf) <= 76 ? GColorSpringBud                                            \
	 : (tf) <= 84 ? GColorIcterine                                             \
	 : (tf) <= 96 ? GColorChromeYellow                                         \
	              : GColorRed)

	// Pass 1: dark fills
	for (int i = 1; i <= (int)tl->hours_remaining && i < 25; i++) {
		int avg = ((int)pts[i - 1] + (int)pts[i]) / 2;
		graphics_context_set_fill_color(ctx, DARK_TEMP_COLOR(TEMP_TO_F(avg)));
		int x0 = spx[i - 1], y0 = spy[i - 1], x1 = spx[i], y1 = spy[i];
		int dx = x1 - x0, dy = y1 - y0;
		int steps = (abs(dx) > abs(dy)) ? abs(dx) : abs(dy);
		if (steps == 0)
			steps = 1;
		for (int s = 0; s <= steps; s++) {
			int col_x = x0 + dx * s / steps;
			int col_y = y0 + dy * s / steps;
			int col_h = line_bottom - col_y + 1;
			if (col_h > 0) {
				graphics_fill_rect(ctx, GRect(col_x, col_y, 1, col_h), 0,
				                   GCornerNone);
			}
		}
	}

	// Pass 2: light-colored actual-temp line on top of the fill
	graphics_context_set_stroke_width(ctx, 1);
	for (int i = 1; i <= (int)tl->hours_remaining && i < 25; i++) {
		int avg = ((int)pts[i - 1] + (int)pts[i]) / 2;
		graphics_context_set_stroke_color(ctx,
		                                  LIGHT_TEMP_COLOR(TEMP_TO_F(avg)));
		graphics_draw_line(ctx, GPoint(spx[i - 1], spy[i - 1]),
		                   GPoint(spx[i], spy[i]));
	}

	// Pass 3: white apparent-temp line over everything
	graphics_context_set_stroke_color(ctx, GColorWhite);
	for (int i = 1; i <= (int)tl->hours_remaining && i < 25; i++) {
		graphics_draw_line(ctx, GPoint(apx[i - 1], apy[i - 1]),
		                   GPoint(apx[i], apy[i]));
	}

#undef DARK_TEMP_COLOR
#undef LIGHT_TEMP_COLOR
#undef TEMP_TO_F
#else
	// B&W: white actual-temp line + dotted apparent-temp line.
	graphics_context_set_stroke_width(ctx, 1);
	graphics_context_set_stroke_color(ctx, GColorWhite);
	for (int i = 1; i <= (int)tl->hours_remaining && i < 25; i++) {
		graphics_draw_line(ctx, GPoint(spx[i - 1], spy[i - 1]),
		                   GPoint(spx[i], spy[i]));
	}

	// Pebble's b&w path does not offer dashed strokes, so render the apparent
	// temperature as sampled pixels along each segment instead.
	for (int i = 1; i <= (int)tl->hours_remaining && i < 25; i++) {
		graph_draw_dotted_line(ctx, GPoint(apx[i - 1], apy[i - 1]),
		                       GPoint(apx[i], apy[i]), 3);
	}
#endif

	// Noon/midnight ticks — temp is the bottommost graph layer, draw bottom
	// only. Each tick is colored individually: black when it falls within the
	// sparkline fill (contrasts against color), white when it falls in the
	// empty region or there is no sparkline at all.
	{
		int bar_w = graph_w / GRAPH_HOURS;
		int offsets[2] = {
		    (12 - (int)tl->current_hour + 24) % 24, // noon
		    (24 - (int)tl->current_hour) % 24,      // midnight
		};
		graphics_context_set_stroke_width(ctx, 1);
		for (int i = 0; i < 2; i++) {
			int off = offsets[i];
			if (off == 0)
				continue;
			bool in_sparkline = (off < (int)tl->hours_remaining);
			graphics_context_set_stroke_color(
			    ctx, PBL_IF_COLOR_ELSE(in_sparkline ? GColorBlack : GColorWhite,
			                           GColorWhite));
			int tx = graph_x + off * bar_w;
			graphics_draw_line(ctx, GPoint(tx, lh - 4), GPoint(tx, lh - 1));
		}
	}
}

TempLayer *temp_layer_create(GRect frame) {
	TempLayer *tl = malloc(sizeof(TempLayer));
	if (!tl)
		return NULL;
	tl->current = 0;
	tl->high = 0;
	tl->low = 0;
	tl->current_hour = 0;
	tl->hours_remaining = GRAPH_HOURS;
	tl->celsius = false;
	memset(tl->hourly, 0, sizeof(tl->hourly));
	memset(tl->apparent_hourly, 0, sizeof(tl->apparent_hourly));

	tl->layer = layer_create_with_data(frame, sizeof(TempLayer *));
	*(TempLayer **)layer_get_data(tl->layer) = tl;
	layer_set_update_proc(tl->layer, prv_update_proc);
	return tl;
}

void temp_layer_destroy(TempLayer *layer) {
	if (!layer)
		return;
	layer_destroy(layer->layer);
	free(layer);
}

Layer *temp_layer_get_layer(TempLayer *layer) {
	return layer ? layer->layer : NULL;
}

void temp_layer_set_data(TempLayer *layer, int16_t current, int16_t high,
                         int16_t low, const int8_t hourly[24],
                         const int8_t apparent_hourly[24], uint8_t current_hour,
                         uint8_t hours_remaining) {
	if (!layer)
		return;
	layer->current = current;
	layer->high = high;
	layer->low = low;
	layer->current_hour = current_hour;
	layer->hours_remaining = hours_remaining;
	memcpy(layer->hourly, hourly, GRAPH_HOURS);
	memcpy(layer->apparent_hourly, apparent_hourly, GRAPH_HOURS);
	layer_mark_dirty(layer->layer);
}

void temp_layer_set_unit(TempLayer *layer, bool celsius) {
	if (!layer)
		return;
	layer->celsius = celsius;
	layer_mark_dirty(layer->layer);
}

void temp_layer_set_current_hour(TempLayer *layer, uint8_t current_hour,
                                 uint8_t hours_remaining) {
	if (!layer)
		return;
	layer->current_hour = current_hour;
	layer->hours_remaining = hours_remaining;
	layer_mark_dirty(layer->layer);
}
