/**
 * Demo module
 *
 * Provides predefined weather data for testing and screenshots.
 * Each scenario includes a full 24-hour slice of data.
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

#include "demo.h"
#include <string.h>

#if defined(DEMO_SCENARIO)

// Each scenario provides a full 24-hour slice of data (hours 0–23, midnight
// through 11 pm local time) so the sparkline and graph layers are fully
// populated regardless of what the actual wall-clock hour is when the
// watchface starts in the emulator.
//
// All temperatures are in Fahrenheit. Chicago uses Fahrenheit; demo_data_load
// forces the settings unit flag accordingly.

// Scenario 1 — TEMPERATE
// Thursday May 28, 2026, 10:00 AM CDT. Mild spring day in Chicago:
// mostly dry with a brief light shower early tomorrow morning.
static const int8_t s_temp_1[24] = {68, 69, 71, 72, 73, 72, 70, 68,
                                    66, 64, 63, 62, 61, 60, 58, 56,
                                    55, 54, 54, 55, 57, 59, 62, 64};
static const int8_t s_appar_1[24] = {65, 67, 69, 70, 71, 70, 68, 66,
                                     64, 62, 61, 60, 59, 58, 56, 54,
                                     53, 52, 52, 53, 55, 57, 60, 62};
static const uint8_t s_precip_1[24] = {0, 0, 0, 0,  0,  0,  0, 0, 0, 0, 0, 0,
                                       0, 0, 0, 10, 20, 15, 5, 0, 0, 0, 0, 0};
static const uint8_t s_cloud_1[24] = {5,  10, 15, 10, 20, 25, 20, 15,
                                      20, 18, 25, 35, 45, 35, 30, 40,
                                      55, 45, 30, 20, 15, 10, 8,  5};
static const uint8_t s_wmo_1[24] = {0, 0, 0, 0,  0,  0,  1, 1, 1, 1, 1, 2,
                                    2, 1, 1, 51, 61, 51, 1, 0, 0, 0, 0, 0};

// Scenario 2 — STORMY
// Wednesday July 15, 2026, 2:00 PM CDT. Hot and muggy day in Chicago.
// At 2pm: rain is already starting. Severe thunderstorms build
// through the afternoon and peak in the evening (WMO 95-96), then clear
// overnight as a cold front sweeps through.
static const int8_t s_temp_2[24] = {82, 84, 85, 85, 83, 80, 77, 73,
                                    69, 66, 65, 64, 64, 65, 67, 69,
                                    70, 69, 68, 68, 69, 72, 75, 79};
static const int8_t s_appar_2[24] = {90, 93, 95, 94, 90, 85, 80, 73,
                                     67, 64, 63, 62, 62, 63, 66, 73,
                                     75, 75, 73, 73, 74, 77, 81, 86};
static const uint8_t s_precip_2[24] = {40, 55, 65, 80, 95, 100, 95, 80,
                                       55, 30, 10, 0,  0,  0,   0,  0,
                                       0,  0,  0,  0,  5,  10,  15, 25};
static const uint8_t s_cloud_2[24] = {92, 98, 100, 100, 100, 100, 96, 86,
                                      68, 45, 25,  12,  10,  10,  8,  10,
                                      10, 15, 20,  30,  45,  60,  75, 85};
static const uint8_t s_wmo_2[24] = {80, 80, 95, 95, 96, 96, 95, 80,
                                    61, 51, 3,  1,  0,  0,  0,  0,
                                    0,  0,  1,  1,  2,  3,  51, 61};

// Scenario 3 — BLIZZARD
// Wednesday January 7, 2026, 8:00 AM CST. Winter storm in Chicago.
// At 8am: moderate snow (WMO 73). Conditions worsen through the morning
// into a full blizzard by evening (WMO 77), then gradually ease overnight.
static const int8_t s_temp_3[24] = {11, 10, 9,  8,  7,  7,  8,  9,
                                    10, 11, 11, 12, 12, 13, 13, 14,
                                    14, 14, 13, 12, 11, 10, 10, 9};
static const int8_t s_appar_3[24] = {-3, -4, -5, -6, -7, -7, -5, -4,
                                     -3, -2, -2, -1, -1, 0,  0,  1,
                                     1,  0,  0,  -1, -2, -2, -3, -4};
static const uint8_t s_precip_3[24] = {80, 82, 85, 88, 90, 88, 82, 75,
                                       80, 90, 95, 95, 92, 88, 82, 75,
                                       68, 58, 48, 38, 28, 18, 10, 5};
static const uint8_t s_cloud_3[24] = {98,  98,  100, 100, 100, 100, 100, 100,
                                      100, 100, 100, 100, 98,  96,  95,  92,
                                      88,  82,  74,  64,  54,  42,  30,  20};
static const uint8_t s_wmo_3[24] = {73, 73, 75, 75, 75, 73, 71, 73,
                                    73, 75, 77, 77, 77, 75, 75, 73,
                                    73, 71, 71, 71, 73, 73, 71, 1};

// Scenario 4 — TORNADO
// Tuesday April 7, 2026, 11:00 AM CDT. Severe tornado outbreak in Chicago.
// At 11am: heavy rain advancing ahead of the squall line (WMO 65).
// Violent thunderstorms (WMO 99) and tornado threat peak mid-afternoon,
// then the cold front clears things out by evening.
static const int8_t s_temp_4[24] = {73, 75, 76, 75, 73, 69, 64, 59,
                                    56, 54, 53, 53, 54, 56, 57, 58,
                                    59, 60, 60, 61, 63, 65, 68, 71};
static const int8_t s_appar_4[24] = {82, 85, 84, 80, 73, 63, 54, 49,
                                     46, 45, 44, 44, 45, 47, 48, 51,
                                     58, 62, 64, 65, 67, 70, 74, 78};
static const uint8_t s_precip_4[24] = {35, 55, 78, 92, 100, 100, 96, 85,
                                       65, 42, 22, 10, 5,   0,   0,  0,
                                       0,  0,  0,  0,  0,   5,   10, 20};
static const uint8_t s_cloud_4[24] = {
    80, 92, 100, 100, 100, 100, 96, 88, 72, 55, 38, 25,
    18, 12, 10,  10,  10,  10,  15, 15, 20, 30, 45, 62,
};
static const uint8_t s_wmo_4[24] = {61, 65, 95, 99, 99, 99, 96, 95,
                                    80, 61, 51, 3,  1,  0,  0,  0,
                                    0,  0,  0,  1,  1,  2,  3,  51};

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
    // 1 — TEMPERATE: May 28, 10am, current=67°F, high=73, low=54
    {67, 73, 54, 1, 5, 19, s_temp_1, s_appar_1, s_precip_1, s_cloud_1, s_wmo_1,
     "Chicago", "CDT", 24, 0},
    // 2 — STORMY: Jul 15, 2pm, current=80°F, high=85, low=68
    {80, 85, 68, 80, 5, 20, s_temp_2, s_appar_2, s_precip_2, s_cloud_2, s_wmo_2,
     "Chicago", "CDT", 24, 0},
    // 3 — BLIZZARD: Jan 7, 8am, current=10°F, high=14, low=7
    {10, 14, 7, 73, 7, 16, s_temp_3, s_appar_3, s_precip_3, s_cloud_3, s_wmo_3,
     "Chicago", "CST", 24, 0},
    // 4 — TORNADO: Apr 7, 11am, current=75°F, high=76, low=53
    {75, 76, 53, 65, 6, 19, s_temp_4, s_appar_4, s_precip_4, s_cloud_4, s_wmo_4,
     "Chicago", "CDT", 24, 0},
    // 5 — PARTIAL: same as temperate but only first 12 hours valid
    {67, 73, 54, 1, 5, 19, s_temp_1, s_appar_1, s_precip_1, s_cloud_1, s_wmo_1,
     "Chicago", "CDT", 12, 0},
    // 6 — DISCONNECTED: temperate data but fetch was 25h ago, fully expired
    {67, 73, 54, 1, 5, 19, s_temp_1, s_appar_1, s_precip_1, s_cloud_1, s_wmo_1,
     "Chicago", "CDT", 24, 25},
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

	// Chicago uses Fahrenheit
	if (settings) {
		settings->temp_unit_celsius = false;
	}
}

const char *demo_get_timezone(void) {
	return s_scenarios[DEMO_SCENARIO - 1].tz_abbr;
}

void demo_get_tm(struct tm *out) {
	// Scenario times:
	//   1 TEMPERATE    Thu May 28 2026 10:00 CDT  — wday=4, yday=147
	//   2 STORMY       Wed Jul 15 2026 14:00 CDT  — wday=3, yday=195
	//   3 BLIZZARD     Wed Jan 07 2026 08:00 CST  — wday=3, yday=6
	//   4 TORNADO      Tue Apr 07 2026 11:00 CDT  — wday=2, yday=96
	//   5 PARTIAL      Thu May 28 2026 10:00 CDT  — same as TEMPERATE
	//   6 DISCONNECTED Thu May 28 2026 10:00 CDT  — same as TEMPERATE
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
