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
// Late-May day in Chicago: sunny, light breeze, no rain.
// Temps rise through mid-afternoon and fall off gently overnight.
static const int8_t  s_temp_1[24]    = { 58, 57, 55, 55, 56, 57, 59, 62, 65, 67, 70, 72, 73, 74, 73, 71, 69, 67, 65, 63, 62, 61, 60, 59 };
static const int8_t  s_appar_1[24]   = { 56, 55, 53, 53, 54, 55, 57, 60, 63, 65, 68, 70, 71, 72, 71, 69, 67, 65, 63, 61, 60, 59, 58, 57 };
static const uint8_t s_precip_1[24]  = {  5,  5,  5,  5,  5,  5,  5,  5,  5,  5,  5,  5,  5,  5,  5,  5,  5,  5,  5,  5,  5,  5,  5,  5 };
static const uint8_t s_cloud_1[24]   = { 15, 10, 10, 10, 10, 15, 20, 20, 15, 15, 20, 25, 25, 20, 15, 15, 20, 20, 15, 10, 10, 10, 15, 15 };
static const uint8_t s_wmo_1[24]     = {  0,  0,  0,  0,  0,  0,  0,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  0,  0,  0,  0,  0,  0 };

// Scenario 2 — STORMY
// Mid-July day: hot and muggy, severe thunderstorms develop in the afternoon
// and peak at dusk. Heat index runs 10°F above actual before the front passes.
static const int8_t  s_temp_2[24]    = { 70, 68, 67, 67, 68, 70, 72, 75, 78, 80, 82, 83, 84, 83, 81, 78, 74, 71, 68, 67, 67, 68, 68, 69 };
static const int8_t  s_appar_2[24]   = { 74, 72, 71, 71, 72, 74, 77, 80, 84, 87, 90, 92, 93, 91, 87, 81, 74, 70, 67, 66, 66, 67, 68, 69 };
static const uint8_t s_precip_2[24]  = {  5,  5,  5,  5,  5,  5,  5, 10, 10, 15, 20, 30, 40, 55, 70, 85, 95,100, 90, 70, 50, 30, 15,  5 };
static const uint8_t s_cloud_2[24]   = { 20, 15, 15, 10, 10, 15, 20, 30, 40, 55, 70, 80, 85, 90, 95,100,100,100, 95, 85, 70, 50, 35, 25 };
static const uint8_t s_wmo_2[24]     = {  1,  0,  0,  0,  0,  1,  1,  2,  2,  2,  3,  3, 51, 61, 80, 80, 95, 95, 96, 95, 80, 61, 51,  3 };

// Scenario 3 — BLIZZARD
// January blizzard: heavy snow all day, temperatures barely above single
// digits, wind chill drives apparent temps well below zero.
static const int8_t  s_temp_3[24]    = {  8,  6,  5,  4,  4,  5,  6,  8, 10, 12, 14, 15, 16, 17, 17, 16, 15, 14, 12, 11, 10,  9,  8,  7 };
static const int8_t  s_appar_3[24]   = { -4, -6, -7, -8, -8, -7, -5, -3, -1,  1,  3,  4,  5,  6,  6,  5,  3,  2,  0, -1, -2, -3, -4, -5 };
static const uint8_t s_precip_3[24]  = { 85, 90, 90, 90, 95, 95, 95, 95, 95, 90, 85, 80, 80, 80, 85, 90, 95, 95, 90, 85, 80, 80, 80, 85 };
static const uint8_t s_cloud_3[24]   = {100,100,100,100,100,100,100,100,100, 95, 95, 95, 95, 95,100,100,100,100,100,100,100,100,100,100 };
static const uint8_t s_wmo_3[24]     = { 75, 75, 77, 77, 77, 75, 75, 73, 73, 71, 71, 73, 73, 73, 75, 75, 77, 77, 75, 73, 71, 71, 73, 75 };

// Scenario 4 — TORNADO
// Early-April severe outbreak: extremely humid and warm before an explosive
// cold front. Violent thunderstorms (WMO 99 = hail+storm) in the late
// afternoon; apparent temp runs 10–15°F above actual pre-front, then
// plummets as the cold air rushes in.
static const int8_t  s_temp_4[24]    = { 63, 61, 60, 60, 61, 63, 65, 68, 71, 74, 76, 77, 77, 76, 74, 71, 65, 60, 57, 55, 54, 54, 55, 56 };
static const int8_t  s_appar_4[24]   = { 67, 65, 64, 64, 65, 67, 70, 74, 78, 82, 85, 87, 86, 83, 78, 70, 60, 53, 49, 47, 46, 46, 47, 48 };
static const uint8_t s_precip_4[24]  = {  5,  5,  5,  5,  5,  5,  5, 10, 15, 25, 35, 50, 65, 80, 90,100,100, 95, 80, 65, 50, 35, 20, 10 };
static const uint8_t s_cloud_4[24]   = { 20, 15, 15, 15, 15, 20, 25, 35, 45, 60, 75, 85, 90, 95,100,100,100, 95, 85, 70, 55, 40, 30, 25 };
static const uint8_t s_wmo_4[24]     = {  1,  0,  0,  0,  0,  1,  1,  2,  2,  3,  3, 51, 80, 95, 95, 99, 99, 96, 95, 80, 61, 51,  3,  2 };

typedef struct {
  int16_t        current_temp;
  int16_t        high_temp;
  int16_t        low_temp;
  uint8_t        weather_code;
  uint8_t        sunrise_hour;
  uint8_t        sunset_hour;
  const int8_t  *temp_hourly;
  const int8_t  *apparent_hourly;
  const uint8_t *precip_prob;
  const uint8_t *cloud_cover;
  const uint8_t *hourly_code;
  const char    *city_name;
  const char    *tz_abbr;
} DemoScenario;

static const DemoScenario s_scenarios[4] = {
  // 1 — TEMPERATE
  { 68, 74, 55, 1, 6, 19, s_temp_1, s_appar_1, s_precip_1, s_cloud_1, s_wmo_1, "Chicago", "CDT" },
  // 2 — STORMY
  { 78, 84, 67, 95, 5, 20, s_temp_2, s_appar_2, s_precip_2, s_cloud_2, s_wmo_2, "Chicago", "CDT" },
  // 3 — BLIZZARD
  { 12, 17, 4, 75, 7, 16, s_temp_3, s_appar_3, s_precip_3, s_cloud_3, s_wmo_3, "Chicago", "CST" },
  // 4 — TORNADO
  { 71, 77, 54, 99, 6, 19, s_temp_4, s_appar_4, s_precip_4, s_cloud_4, s_wmo_4, "Chicago", "CDT" },
};

void demo_data_load(WeatherData *weather, Settings *settings) {
#if DEMO_SCENARIO < 1 || DEMO_SCENARIO > 4
#error "DEMO_SCENARIO must be 1, 2, 3, or 4"
#endif
  const DemoScenario *s = &s_scenarios[DEMO_SCENARIO - 1];

  weather->current_temp = s->current_temp;
  weather->high_temp    = s->high_temp;
  weather->low_temp     = s->low_temp;
  weather->weather_code = s->weather_code;
  weather->sunrise_hour = s->sunrise_hour;
  weather->sunset_hour  = s->sunset_hour;
  memcpy(weather->temp_hourly,          s->temp_hourly,     WEATHER_HOURLY_COUNT);
  memcpy(weather->apparent_temp_hourly, s->apparent_hourly, WEATHER_HOURLY_COUNT);
  memcpy(weather->precip_prob,          s->precip_prob,     WEATHER_HOURLY_COUNT);
  memcpy(weather->cloud_cover,          s->cloud_cover,     WEATHER_HOURLY_COUNT);
  memcpy(weather->hourly_weather_code,  s->hourly_code,     WEATHER_HOURLY_COUNT);
  strncpy(weather->city_name, s->city_name, WEATHER_CITY_MAX_LEN - 1);
  weather->city_name[WEATHER_CITY_MAX_LEN - 1] = '\0';
  weather->is_valid = true;

  // Chicago uses Fahrenheit
  if (settings) {
    settings->temp_unit_celsius = false;
  }
}

const char *demo_get_timezone(void) {
  return s_scenarios[DEMO_SCENARIO - 1].tz_abbr;
}

#endif // defined(DEMO_SCENARIO)
