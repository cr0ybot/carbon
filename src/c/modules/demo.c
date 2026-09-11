/**
 * Demo module
 *
 * Provides predefined weather data for testing and screenshots.
 * Each scenario includes a full hourly slice of data.
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

#include "demo.h"
#include <stddef.h>
#include <string.h>

#if defined(DEMO_SCENARIO)

// Each scenario provides a full hourly slice of data so the sparkline and
// graph layers are fully
// populated regardless of what the actual wall-clock hour is when the
// watchface starts in the emulator.
//
// All temperatures are in Celsius. Berlin uses Celsius; demo_data_load
// forces the settings unit flag accordingly.

// Scenario 1 — TEMPERATE
// Thursday May 28, 2026, 10:00 AM CEST. Mild spring day in Berlin:
// mostly dry with a brief light shower early tomorrow morning.
static const int8_t s_temp_1[WEATHER_HOURLY_COUNT] = {
    20, 21, 22, 22, 23, 22, 21, 20, 19, 18, 17, 17, 16, 16, 14, 13, 13, 12,
    12, 13, 14, 15, 17, 18, 18, 19, 20, 21, 21, 21, 19, 18, 17, 16, 16, 15,
};
static const int8_t s_appar_1[WEATHER_HOURLY_COUNT] = {
    18, 19, 21, 21, 22, 21, 20, 19, 18, 17, 16, 16, 15, 14, 13, 12, 12, 11,
    11, 12, 13, 14, 16, 17, 17, 18, 19, 19, 20, 19, 18, 17, 16, 15, 14, 14,
};
static const uint8_t s_precip_1[WEATHER_HOURLY_COUNT] = {
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  0, 0, 0, 10, 20, 15,
    5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 8, 4, 0, 0,  0,  0,
};
static const uint8_t s_cloud_1[WEATHER_HOURLY_COUNT] = {
    5,  10, 15, 10, 20, 25, 20, 15, 20, 18, 25, 35, 45, 35, 30, 40, 55, 45,
    30, 20, 15, 10, 8,  5,  8,  12, 18, 22, 28, 35, 40, 32, 25, 20, 15, 10,
};
static const uint8_t s_wmo_1[WEATHER_HOURLY_COUNT] = {
    0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 2, 2, 1, 1, 51, 61, 51,
    1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 2, 1, 1, 1, 0,  0,  0,
};

// Scenario 2 — STORMY
// Wednesday July 15, 2026, 2:00 PM CEST. Hot and muggy day in Berlin.
// At 2pm: rain is already starting. Severe thunderstorms build
// through the afternoon and peak in the evening (WMO 95-96), then clear
// overnight as a cold front sweeps through.
static const int8_t s_temp_2[WEATHER_HOURLY_COUNT] = {
    28, 29, 29, 29, 28, 27, 25, 23, 21, 19, 18, 18, 18, 18, 19, 21, 21, 21,
    20, 20, 21, 22, 24, 26, 27, 28, 29, 29, 28, 26, 24, 22, 20, 19, 18, 18,
};
static const int8_t s_appar_2[WEATHER_HOURLY_COUNT] = {
    32, 34, 35, 34, 32, 29, 27, 23, 19, 18, 17, 17, 17, 17, 19, 23, 24, 24,
    23, 23, 23, 25, 27, 30, 31, 32, 33, 32, 30, 28, 25, 22, 20, 19, 18, 17,
};
static const uint8_t s_precip_2[WEATHER_HOURLY_COUNT] = {
    40, 55, 65, 80, 95, 100, 95, 80, 55, 30, 10, 0,  0,  0,  0,  0,  0, 0,
    0,  0,  5,  10, 15, 25,  35, 50, 65, 75, 85, 75, 55, 35, 20, 10, 5, 0,
};
static const uint8_t s_cloud_2[WEATHER_HOURLY_COUNT] = {
    92, 98, 100, 100, 100, 100, 96, 86, 68, 45, 25, 12,
    10, 10, 8,   10,  10,  15,  20, 30, 45, 60, 75, 85,
    92, 98, 100, 100, 96,  86,  72, 58, 42, 30, 20, 12,
};
static const uint8_t s_wmo_2[WEATHER_HOURLY_COUNT] = {
    80, 80, 95, 95, 96, 96, 95, 80, 61, 51, 3,  1,  0,  0, 0, 0, 0, 0,
    1,  1,  2,  3,  51, 61, 80, 95, 96, 95, 80, 61, 51, 3, 1, 0, 0, 0,
};

// Scenario 3 — BLIZZARD
// Wednesday January 7, 2026, 8:00 AM CET. Winter storm in Berlin.
// At 8am: moderate snow (WMO 73). Conditions worsen through the morning
// into a full blizzard by evening (WMO 77), then gradually ease overnight.
static const int8_t s_temp_3[WEATHER_HOURLY_COUNT] = {
    -12, -12, -13, -13, -14, -14, -13, -13, -12, -12, -12, -11, -11, -11,
    -11, -10, -10, -10, -11, -11, -12, -12, -12, -13, -13, -13, -14, -14,
    -14, -14, -14, -13, -13, -13, -12, -12,
};
static const int8_t s_appar_3[WEATHER_HOURLY_COUNT] = {
    -19, -20, -21, -21, -22, -22, -21, -20, -19, -19, -19, -18, -18, -18,
    -18, -17, -17, -18, -18, -18, -19, -19, -19, -20, -21, -21, -22, -22,
    -23, -23, -22, -22, -21, -21, -20, -20,
};
static const uint8_t s_precip_3[WEATHER_HOURLY_COUNT] = {
    80, 82, 85, 88, 90, 88, 82, 75, 80, 90, 95, 95, 92, 88, 82, 75, 68, 58,
    48, 38, 28, 18, 10, 5,  8,  12, 18, 26, 34, 42, 50, 56, 48, 36, 24, 15,
};
static const uint8_t s_cloud_3[WEATHER_HOURLY_COUNT] = {
    98, 98, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100,
    98, 96, 95,  92,  88,  82,  74,  64,  54,  42,  30,  20,
    18, 24, 34,  46,  58,  70,  82,  90,  96,  98,  100, 100,
};
static const uint8_t s_wmo_3[WEATHER_HOURLY_COUNT] = {
    73, 73, 75, 75, 75, 73, 71, 73, 73, 75, 77, 77, 77, 75, 75, 73, 73, 71,
    71, 71, 73, 73, 71, 1,  1,  71, 73, 75, 77, 77, 75, 73, 71, 71, 3,  1,
};

// Scenario 4 — TORNADO
// Tuesday April 7, 2026, 11:00 AM CEST. Severe tornado outbreak in Berlin.
// At 11am: heavy rain advancing ahead of the squall line (WMO 65).
// Violent thunderstorms (WMO 99) and tornado threat peak mid-afternoon,
// then the cold front clears things out by evening.
static const int8_t s_temp_4[WEATHER_HOURLY_COUNT] = {
    23, 24, 24, 24, 23, 21, 18, 15, 13, 12, 12, 12, 12, 13, 14, 14, 15, 16,
    16, 16, 17, 18, 20, 22, 23, 23, 24, 23, 22, 19, 17, 15, 13, 12, 12, 11,
};
static const int8_t s_appar_4[WEATHER_HOURLY_COUNT] = {
    28, 29, 29, 27, 23, 17, 12, 9,  8,  7,  7,  7,  7,  8,  9,  11, 14, 17,
    18, 18, 19, 21, 23, 26, 27, 28, 27, 25, 21, 16, 12, 10, 8,  7,  7,  6,
};
static const uint8_t s_precip_4[WEATHER_HOURLY_COUNT] = {
    35, 55, 78, 92, 100, 100, 96, 85, 65, 42, 22,  10, 5,  0,  0,  0,  0, 0,
    0,  0,  0,  5,  10,  20,  30, 45, 65, 88, 100, 92, 75, 52, 28, 12, 5, 0,
};
static const uint8_t s_cloud_4[WEATHER_HOURLY_COUNT] = {
    80, 92, 100, 100, 100, 100, 96, 88, 72, 55, 38, 25,
    18, 12, 10,  10,  10,  10,  15, 15, 20, 30, 45, 62,
    80, 92, 100, 100, 96,  84,  70, 52, 36, 24, 16, 10,
};
static const uint8_t s_wmo_4[WEATHER_HOURLY_COUNT] = {
    61, 65, 95, 99, 99, 99, 96, 95, 80, 61, 51, 3,  1,  0,  0,  0, 0, 0,
    0,  1,  1,  2,  3,  51, 61, 80, 95, 99, 96, 95, 80, 61, 51, 3, 1, 0,
};

typedef struct {
	int16_t current_temp;
	int16_t high_temp;
	int16_t low_temp;
	uint8_t weather_code;
	uint8_t sunrise_hour;
	uint8_t sunset_hour;
	const int8_t *temp_hourly;
	const int8_t *apparent_hourly;
	const uint8_t *precip_prob;
	const uint8_t *cloud_cover;
	const uint8_t *hourly_code;
	const char *city_name;
	const char *tz_abbr;
	uint8_t valid_hours;
	int32_t
	    fetch_offset_hours; // hours in the past the fetch occurred (0 = now)
} DemoScenario;

static const DemoScenario s_scenarios[6] = {
    // 1 — TEMPERATE: May 28, 10am, current=19°C, high=23, low=12
    {19, 23, 12, 1, 5, 19, s_temp_1, s_appar_1, s_precip_1, s_cloud_1, s_wmo_1,
     "Berlin", "CEST", WEATHER_HOURLY_COUNT, 0},
    // 2 — STORMY: Jul 15, 2pm, current=27°C, high=29, low=20
    {27, 29, 20, 80, 5, 20, s_temp_2, s_appar_2, s_precip_2, s_cloud_2, s_wmo_2,
     "Berlin", "CEST", WEATHER_HOURLY_COUNT, 0},
    // 3 — BLIZZARD: Jan 7, 8am, current=-12°C, high=-10, low=-14
    {-12, -10, -14, 73, 7, 16, s_temp_3, s_appar_3, s_precip_3, s_cloud_3,
     s_wmo_3, "Berlin", "CET", WEATHER_HOURLY_COUNT, 0},
    // 4 — TORNADO: Apr 7, 11am, current=24°C, high=24, low=12
    {24, 24, 12, 65, 6, 19, s_temp_4, s_appar_4, s_precip_4, s_cloud_4, s_wmo_4,
     "Berlin", "CEST", WEATHER_HOURLY_COUNT, 0},
    // 5 — PARTIAL: same as temperate but only first 12 hours valid
    {19, 23, 12, 1, 5, 19, s_temp_1, s_appar_1, s_precip_1, s_cloud_1, s_wmo_1,
     "Berlin", "CEST", 12, 0},
    // 6 — DISCONNECTED: temperate data but fetch was 25h ago, fully expired
    {19, 23, 12, 1, 5, 19, s_temp_1, s_appar_1, s_precip_1, s_cloud_1, s_wmo_1,
     "Berlin", "CEST", WEATHER_HOURLY_COUNT, 25},
};

void demo_data_load(WeatherData *weather, Settings *settings) {
#if DEMO_SCENARIO < 1 || DEMO_SCENARIO > 6
#error "DEMO_SCENARIO must be 1 through 6"
#endif
	const DemoScenario *s = &s_scenarios[DEMO_SCENARIO - 1];

	weather->current_temp = s->current_temp;
	weather->high_temp = s->high_temp;
	weather->low_temp = s->low_temp;
	weather->weather_code = s->weather_code;
	weather->sunrise_hour = s->sunrise_hour;
	weather->sunset_hour = s->sunset_hour;
	memcpy(weather->temp_hourly, s->temp_hourly, WEATHER_HOURLY_COUNT);
	memcpy(weather->apparent_temp_hourly, s->apparent_hourly,
	       WEATHER_HOURLY_COUNT);
	memcpy(weather->precip_prob, s->precip_prob, WEATHER_HOURLY_COUNT);
	memcpy(weather->cloud_cover, s->cloud_cover, WEATHER_HOURLY_COUNT);
	memcpy(weather->hourly_weather_code, s->hourly_code, WEATHER_HOURLY_COUNT);
	strncpy(weather->city_name, s->city_name, WEATHER_CITY_MAX_LEN - 1);
	weather->city_name[WEATHER_CITY_MAX_LEN - 1] = '\0';
	weather->is_valid = true;
	weather->valid_hours = s->valid_hours;
	weather->fetch_time = time(NULL) - (time_t)(s->fetch_offset_hours * 3600);

	// Berlin uses Celsius
	if (settings) {
		settings->temp_unit_celsius = true;
	}
}

const char *demo_get_timezone(void) {
	return s_scenarios[DEMO_SCENARIO - 1].tz_abbr;
}

void demo_get_tm(struct tm *out) {
	// Scenario times:
	//   1 TEMPERATE    Thu May 28 2026 10:00 CEST — wday=4, yday=147
	//   2 STORMY       Wed Jul 15 2026 14:00 CEST — wday=3, yday=195
	//   3 BLIZZARD     Wed Jan 07 2026 08:00 CET  — wday=3, yday=6
	//   4 TORNADO      Tue Apr 07 2026 11:00 CEST — wday=2, yday=96
	//   5 PARTIAL      Thu May 28 2026 10:00 CEST — same as TEMPERATE
	//   6 DISCONNECTED Thu May 28 2026 10:00 CEST — same as TEMPERATE
	static const int s_hour[6] = {10, 14, 8, 11, 10, 10};
	static const int s_mday[6] = {28, 15, 7, 7, 28, 28};
	static const int s_mon[6] = {4, 6, 0, 3, 4, 4};
	static const int s_wday[6] = {4, 3, 3, 2, 4, 4};
	static const int s_yday[6] = {147, 195, 6, 96, 147, 147};
	static const int s_isdst[6] = {1, 1, 0, 1, 1, 1};
	const int i = DEMO_SCENARIO - 1;
	memset(out, 0, sizeof(*out));
	out->tm_year = 126; // 2026
	out->tm_hour = s_hour[i];
	out->tm_mday = s_mday[i];
	out->tm_mon = s_mon[i];
	out->tm_wday = s_wday[i];
	out->tm_yday = s_yday[i];
	out->tm_isdst = s_isdst[i];
}

#endif // defined(DEMO_SCENARIO)
