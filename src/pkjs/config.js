/**
 * Clay configuration for Carbon
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

module.exports = [
	{
		'type': 'heading',
		'defaultValue': 'Carbon',
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
					{ 'label': 'Celsius (°C)',  'value': 0  },
					{ 'label': 'Fahrenheit (°F)', 'value': 1 },
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
				'type': 'select',
				'messageKey': 'SETTING_DATE_FORMAT',
				'label': 'Date Format',
				'defaultValue': 0,
				'options': [
					{ 'label': 'Monday 1/15',     'value': 0 },
					{ 'label': 'Monday, Jan 15',  'value': 1 },
					{ 'label': '1/15/2026',       'value': 2 },
					{ 'label': '15 Jan 2026',     'value': 3 },
					{ 'label': '2026-01-15',      'value': 4 },
				],
			},
			{
				'type': 'select',
				'messageKey': 'SETTING_BATTERY_DISPLAY',
				'label': 'Battery Display',
				'defaultValue': 0,
				'options': [
					{ 'label': 'Icon',       'value': 0 },
					{ 'label': 'Percentage', 'value': 1 },
				],
			},
		],
	},
	{
		'type': 'submit',
		'defaultValue': 'Save Settings',
	},
];
