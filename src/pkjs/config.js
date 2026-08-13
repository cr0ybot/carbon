/**
 * Clay configuration for Carbon
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

const { version, hash } = require('../../.buildinfo.json');

module.exports = [
	{
		'type': 'heading',
		'defaultValue': 'Carbon',
	},
	{
		'type': 'text',
		'defaultValue': `v${version} (${hash})`,
	},
	{
		'type': 'section',
		'items': [
			{
				'type': 'heading',
				'defaultValue': 'Weather',
			},
			{
				'type': 'select',
				'messageKey': 'SETTING_TEMP_UNIT',
				'label': 'Temperature Unit',
				'description': '"Auto" detects your locale (US = °F, everywhere else = °C).',
				'defaultValue': -1,
				'options': [
					{ 'label': 'Auto (locale)', 'value': -1 },
					{ 'label': 'Celsius (°C)', 'value': 0 },
					{ 'label': 'Fahrenheit (°F)', 'value': 1 },
				],
			},
			{
				'type': 'select',
				'messageKey': 'SETTING_FETCH_INTERVAL',
				'label': 'Weather Refresh Interval',
				'defaultValue': 30,
				'options': [
					{ 'label': 'Every 15 minutes', 'value': 15 },
					{ 'label': 'Every 30 minutes', 'value': 30 },
					{ 'label': 'Every 60 minutes', 'value': 60 },
				],
			},
		],
	},
	{
		'type': 'section',
		'items': [
			{
				'type': 'heading',
				'defaultValue': 'Display',
			},
			{
				'type': 'text',
				'defaultValue': 'Time Format (12h/24h) is determined by the watch\'s system settings.',
			},
			{
				'type': 'select',
				'messageKey': 'SETTING_DATE_FORMAT',
				'label': 'Date Format',
				'defaultValue': '%A, %m/%d',
				'options': [
					{ 'label': 'Monday, 1/15', 'value': '%A, %m/%d' },
					{ 'label': 'Monday, 15/1', 'value': '%A, %d/%m' },
					{ 'label': 'Monday, Jan 15', 'value': '%A, %b %d' },
					{ 'label': '1/15/2026', 'value': '%m/%d/%Y' },
					{ 'label': '15/1/2026', 'value': '%d/%m/%Y' },
					{ 'label': '15 Jan 2026', 'value': '%d %b %Y' },
					{ 'label': '2026-01-15', 'value': '%Y-0%m-0%d' },
				],
			},
			{
				'type': 'select',
				'messageKey': 'SETTING_BATTERY_DISPLAY',
				'label': 'Battery Display',
				'defaultValue': 0,
				'options': [
					{ 'label': 'Icon', 'value': 0 },
					{ 'label': 'Percentage', 'value': 1 },
				],
			},
			{
				'type': 'toggle',
				'messageKey': 'SETTING_BIG_TIME',
				'label': 'Big Time',
				'description': 'Fill the width with an oversized clock, hiding the location, date, timezone and AM/PM indicators. The weather graphs and temperatures are unaffected.',
				'defaultValue': false,
			},
			{
				'type': 'toggle',
				'messageKey': 'SETTING_SHOW_TIMEZONE',
				'label': 'Show Timezone',
				'description': 'Show the timezone abbreviation to the left of the time.',
				'defaultValue': true,
			},
			{
				'type': 'toggle',
				'messageKey': 'SETTING_SHOW_AMPM',
				'label': 'Show AM/PM / 24h Indicator',
				'description': 'Show the AM/PM or 24h indicator to the right of the time.',
				'defaultValue': true,
			},
		],
	},
	{
		'type': 'section',
		'items': [
			{
				'type': 'heading',
				'defaultValue': 'Location',
			},
			{
				'type': 'toggle',
				'messageKey': 'SETTING_GEOCODE_ENABLED',
				'label': 'Detect Location Name',
				'description': 'Look up your city name from your location (reverse geocoding). When off, the custom text below is shown instead.',
				'defaultValue': true,
			},
			{
				'type': 'input',
				'messageKey': 'SETTING_LOCATION_OVERRIDE',
				'label': 'Custom Location Text',
				'description': 'Shown when location detection is off. Leave blank to show no location.',
				'defaultValue': '',
				'attributes': {
					'placeholder': 'e.g. Home',
					'maxlength': 23,
				},
			},
			{
				'type': 'toggle',
				'messageKey': 'SETTING_USE_STATIC_LOCATION',
				'label': 'Use Static Location',
				'description': 'Skip GPS and always use fixed coordinates for weather and location name.',
				'defaultValue': false,
			},
			{
				'type': 'input',
				'messageKey': 'SETTING_STATIC_LAT',
				'label': 'Static Latitude',
				'description': 'Used only when static location is enabled.',
				'defaultValue': '',
				'attributes': {
					'type': 'number',
					'step': 'any',
					'placeholder': '41.8338',
				},
			},
			{
				'type': 'input',
				'messageKey': 'SETTING_STATIC_LON',
				'label': 'Static Longitude',
				'description': 'Used only when static location is enabled.',
				'defaultValue': '',
				'attributes': {
					'type': 'number',
					'step': 'any',
					'placeholder': '-87.8966',
				},
			},
		],
	},
	{
		'type': 'submit',
		'defaultValue': 'Save Settings',
	},
	{
		'type': 'section',
		'items': [
			{
				'type': 'heading',
				'defaultValue': 'Advanced',
			},
			{
				'type': 'toggle',
				'messageKey': 'SETTING_SHOW_ADVANCED_OPTIONS',
				'label': 'Show advanced options',
				'description': 'Advanced options are geared toward developers and troubleshooting. Most users should not mess with these.',
				'defaultValue': false,
			},
			{
				'type': 'toggle',
				'messageKey': 'SETTING_CLEAR_CACHE',
				'label': 'Clear cached data on save',
				'description': 'Wipes cached weather and location data and refetches. Resets itself after use. *Intended for debugging and should not be necessary for normal use.*',
				'defaultValue': false,
			},
		],
	},
	{
		'type': 'debug-info',
	},
];
