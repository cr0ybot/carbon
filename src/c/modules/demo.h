#pragma once
#include "weather.h"
#include "settings.h"

// Scenario IDs — pass -DDEMO_SCENARIO=N at build time via the DEMO env var.
//
//   DEMO=1  Temperate  calm spring day, Chicago CDT
//   DEMO=2  Stormy     summer thunderstorms, Chicago CDT
//   DEMO=3  Blizzard   winter storm with wind chill, Chicago CST
//   DEMO=4  Tornado    severe spring outbreak, Chicago CDT
//
// Usage (emulator):
//   DEMO=2 pebble build && pebble install --emulator basalt
//
// Usage (device):
//   DEMO=1 pebble build && pebble install

#define DEMO_TEMPERATE  1
#define DEMO_STORMY     2
#define DEMO_BLIZZARD   3
#define DEMO_TORNADO    4

#if defined(DEMO_SCENARIO)
// Fills *weather with canned data for the selected scenario and forces
// Fahrenheit units (Chicago). Call once in init() after settings_init()
// and after memset-zeroing s_weather, before creating the main window.
void demo_data_load(WeatherData *weather, Settings *settings);

// Returns the IANA-style timezone abbreviation for the active scenario
// (e.g. "CDT" or "CST"). Used to seed time_layer when strftime %Z is
// unavailable in the emulator.
const char *demo_get_timezone(void);

// Fills *out with a fake struct tm for the scenario's demo time and date.
// Use this to seed the time display and compute current_hour in demo mode.
void demo_get_tm(struct tm *out);
#endif
