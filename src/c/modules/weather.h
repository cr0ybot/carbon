#pragma once
#include <pebble.h>

#define WEATHER_HOURLY_COUNT 24
#define WEATHER_CITY_MAX_LEN 24

typedef enum {
  WEATHER_CONDITION_CLEAR = 0,
  WEATHER_CONDITION_PARTLY_CLOUDY,
  WEATHER_CONDITION_MOSTLY_CLOUDY,
  WEATHER_CONDITION_CLOUDY,
  WEATHER_CONDITION_FOG,
  WEATHER_CONDITION_WINDY,
  WEATHER_CONDITION_DRIZZLE,
  WEATHER_CONDITION_RAIN,
  WEATHER_CONDITION_RAIN_HEAVY,
  WEATHER_CONDITION_SLEET,
  WEATHER_CONDITION_SNOW,
  WEATHER_CONDITION_SNOW_HEAVY,
  WEATHER_CONDITION_HAIL,
  WEATHER_CONDITION_STORM,
  WEATHER_CONDITION_STORM_SEVERE,
  WEATHER_CONDITION_TORNADO,
  WEATHER_CONDITION_UNKNOWN,
} WeatherCondition;

typedef struct {
  int16_t current_temp;
  int16_t high_temp;
  int16_t low_temp;
  int16_t apparent_high_temp;
  int16_t apparent_low_temp;
  uint8_t weather_code;
  uint8_t sunrise_hour;
  uint8_t sunset_hour;
  uint8_t precip_prob[WEATHER_HOURLY_COUNT];
  int8_t  temp_hourly[WEATHER_HOURLY_COUNT];
  int8_t  apparent_temp_hourly[WEATHER_HOURLY_COUNT];
  uint8_t cloud_cover[WEATHER_HOURLY_COUNT];
  uint8_t hourly_weather_code[WEATHER_HOURLY_COUNT];
  char    city_name[WEATHER_CITY_MAX_LEN];
  bool    is_valid;
} WeatherData;

WeatherCondition weather_code_to_condition(uint8_t wmo_code);
