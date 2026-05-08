/**
 * Weather module
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

#include "weather.h"

/**
 * Converts a WMO weather code (0-99) to a WeatherCondition enum.
 * Codes are defined here:
 * https://open-meteo.com/en/docs#weather_variable_documentation
 */
WeatherCondition weather_code_to_condition(uint8_t wmo_code) {
  if (wmo_code == 0)
    return WEATHER_CONDITION_CLEAR;
  if (wmo_code == 1)
    return WEATHER_CONDITION_PARTLY_CLOUDY; // mainly clear
  if (wmo_code == 2)
    return WEATHER_CONDITION_MOSTLY_CLOUDY; // partly cloudy
  if (wmo_code == 3)
    return WEATHER_CONDITION_CLOUDY; // overcast
  if (wmo_code <= 5)
    return WEATHER_CONDITION_FOG; // smoke/haze
  if (wmo_code <= 9)
    return WEATHER_CONDITION_WINDY; // dust/sandstorm
  if (wmo_code <= 12)
    return WEATHER_CONDITION_FOG; // mist, fog patches
  if (wmo_code == 13)
    return WEATHER_CONDITION_STORM; // lightning visible
  if (wmo_code <= 16)
    return WEATHER_CONDITION_RAIN; // precip in sight
  if (wmo_code == 17)
    return WEATHER_CONDITION_STORM; // thunder, no precip
  if (wmo_code == 18)
    return WEATHER_CONDITION_WINDY; // squalls
  if (wmo_code == 19)
    return WEATHER_CONDITION_TORNADO; // funnel cloud
  if (wmo_code == 20)
    return WEATHER_CONDITION_DRIZZLE; // past-hour drizzle
  if (wmo_code == 21)
    return WEATHER_CONDITION_RAIN;
  if (wmo_code == 22)
    return WEATHER_CONDITION_SNOW;
  if (wmo_code <= 24)
    return WEATHER_CONDITION_SLEET; // rain/snow mixed, freezing
  if (wmo_code == 25)
    return WEATHER_CONDITION_RAIN; // rain shower
  if (wmo_code == 26)
    return WEATHER_CONDITION_SLEET; // rain-snow shower
  if (wmo_code == 27)
    return WEATHER_CONDITION_HAIL;
  if (wmo_code == 28)
    return WEATHER_CONDITION_FOG;
  if (wmo_code == 29)
    return WEATHER_CONDITION_STORM;
  if (wmo_code <= 35)
    return WEATHER_CONDITION_WINDY; // duststorm
  if (wmo_code <= 39)
    return WEATHER_CONDITION_SNOW; // blowing/drifting snow
  if (wmo_code <= 49)
    return WEATHER_CONDITION_FOG;
  if (wmo_code <= 55)
    return WEATHER_CONDITION_DRIZZLE;
  if (wmo_code <= 57)
    return WEATHER_CONDITION_SLEET; // freezing drizzle
  if (wmo_code <= 59)
    return WEATHER_CONDITION_RAIN; // drizzle + rain
  if (wmo_code <= 63)
    return WEATHER_CONDITION_RAIN;
  if (wmo_code <= 65)
    return WEATHER_CONDITION_RAIN_HEAVY;
  if (wmo_code <= 69)
    return WEATHER_CONDITION_SLEET; // freezing/mixed rain
  if (wmo_code <= 73)
    return WEATHER_CONDITION_SNOW;
  if (wmo_code <= 75)
    return WEATHER_CONDITION_SNOW_HEAVY;
  if (wmo_code <= 79)
    return WEATHER_CONDITION_SLEET; // ice pellets, crystals
  if (wmo_code <= 81)
    return WEATHER_CONDITION_RAIN; // rain showers
  if (wmo_code == 82)
    return WEATHER_CONDITION_RAIN_HEAVY; // violent showers
  if (wmo_code <= 84)
    return WEATHER_CONDITION_SLEET; // rain-snow showers
  if (wmo_code == 85)
    return WEATHER_CONDITION_SNOW;
  if (wmo_code == 86)
    return WEATHER_CONDITION_SNOW_HEAVY;
  if (wmo_code <= 90)
    return WEATHER_CONDITION_HAIL;
  if (wmo_code <= 92)
    return WEATHER_CONDITION_RAIN; // rain near recent storm
  if (wmo_code <= 94)
    return WEATHER_CONDITION_SLEET; // snow/hail near storm
  if (wmo_code <= 96)
    return WEATHER_CONDITION_STORM;
  if (wmo_code == 97)
    return WEATHER_CONDITION_STORM_SEVERE; // heavy thunderstorm
  if (wmo_code == 98)
    return WEATHER_CONDITION_STORM;
  if (wmo_code == 99)
    return WEATHER_CONDITION_STORM_SEVERE; // severe + hail
  return WEATHER_CONDITION_UNKNOWN;
}
