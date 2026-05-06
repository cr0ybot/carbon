#pragma once
#include <pebble.h>

typedef enum {
  DATE_FORMAT_WEEKDAY_M_D = 0,
  DATE_FORMAT_WEEKDAY_MON_D,
  DATE_FORMAT_M_D_YYYY,
  DATE_FORMAT_D_MON_YYYY,
  DATE_FORMAT_ISO,
  DATE_FORMAT_COUNT,
} DateFormat;

typedef struct {
  bool       temp_unit_celsius;
  bool       time_24h;
  DateFormat date_format;
  GColor     accent_color;
} Settings;

void settings_init(void);
Settings *settings_get(void);
void settings_save(void);
void settings_apply_from_message(DictionaryIterator *iter);
