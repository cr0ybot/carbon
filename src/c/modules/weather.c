#include "weather.h"

WeatherCondition weather_code_to_condition(uint8_t wmo_code) {
  if (wmo_code == 0) return WEATHER_CONDITION_CLEAR;
  if (wmo_code <= 2) return WEATHER_CONDITION_PARTLY_CLOUDY;
  if (wmo_code == 3) return WEATHER_CONDITION_CLOUDY;
  if (wmo_code <= 48) return WEATHER_CONDITION_FOG;
  if (wmo_code <= 57) return WEATHER_CONDITION_DRIZZLE;
  if (wmo_code <= 67) return WEATHER_CONDITION_RAIN;
  if (wmo_code <= 77) return WEATHER_CONDITION_SNOW;
  if (wmo_code <= 82) return WEATHER_CONDITION_RAIN;
  if (wmo_code <= 86) return WEATHER_CONDITION_SNOW;
  if (wmo_code <= 99) return WEATHER_CONDITION_STORM;
  return WEATHER_CONDITION_UNKNOWN;
}
