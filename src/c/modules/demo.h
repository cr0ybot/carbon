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

#pragma once
#include "settings.h"
#include "weather.h"

// Scenario IDs — pass -DDEMO_SCENARIO=N at build time via the DEMO env var.
//
//   DEMO=1  Temperate     calm spring day, Chicago CDT
//   DEMO=2  Stormy        summer thunderstorms, Chicago CDT
//   DEMO=3  Blizzard      winter storm with wind chill, Chicago CST
//   DEMO=4  Tornado       severe spring outbreak, Chicago CDT
//   DEMO=5  Partial       first 12 hours only (simulates fetch error), Chicago
//   CDT DEMO=6  Disconnected  stale cache fully in the past, no data to show
//
// Usage (emulator):
//   DEMO=2 pebble build && pebble install --emulator basalt
//
// Usage (device):
//   DEMO=1 pebble build && pebble install

#define DEMO_TEMPERATE 1
#define DEMO_STORMY 2
#define DEMO_BLIZZARD 3
#define DEMO_TORNADO 4
#define DEMO_PARTIAL 5
#define DEMO_DISCONNECTED 6

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
