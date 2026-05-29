/**
 * Clay configuration for Carbon
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

const { version } = require("../../package.json");

module.exports = [
	{
		'type': 'heading',
		'defaultValue': 'Carbon',
	},
	{
		'type': 'text',
		'defaultValue': `v${version}`,
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
				'type': 'text',
				'defaultValue': 'Time Format (12h/24h) is determined by the watch\'s system settings.',
			},
			{
				'type': 'select',
				'messageKey': 'SETTING_DATE_FORMAT',
				'label': 'Date Format',
				'defaultValue': '%A, %m/%d',
				'options': [
					{ 'label': 'Mon, 1/15',   'value': '%A, %m/%d'  },
					{ 'label': 'Mon, 15/1',   'value': '%A, %d/%m'  },
					{ 'label': 'Mon, Jan 15', 'value': '%A, %b %d'  },
					{ 'label': '1/15/2026',   'value': '%m/%d/%Y'   },
					{ 'label': '15/1/2026',   'value': '%d/%m/%Y'   },
					{ 'label': '15 Jan 2026', 'value': '%d %b %Y'   },
					{ 'label': '2026-01-15',  'value': '%Y-0%m-0%d' },
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
