/**
 * Clay custom component: debug-info
 *
 * Displays cached weather/location debug data in a collapsed <details> panel.
 * Content is injected at showConfiguration time via clay.meta.userData so
 * it always reflects the most recent cache snapshot.
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 */

module.exports = {
	name: 'debug-info',

	template: [
		'<div class="carbon-debug">',
		'  <details class="section carbon-debug__section">',
		'    <summary class="component component-heading carbon-debug__summary tap-highlight"><h4>Debug</h4></summary>',
		'    <div class="component component-debug-info carbon-debug__details">',
		'      <div class="carbon-debug__contents" data-manipulator-target></div>',
		'      <p class="carbon-debug__disclaimer">Do not share this information publicly without obfuscating sensitive data, such as latitude and longitude. Obfuscation rounds coordinates to approximately 1 decimal place.</p>',
		'      <label class="carbon-debug__obfuscate-wrap"><input type="checkbox" class="carbon-debug__obfuscate" checked> Obfuscate latitude/longitude when copying (round to ~1 decimal)</label>',
		'      <button type="button" class="carbon-debug__copy">Copy debug info to clipboard</button>',
		'    </div>',
		'  </details>',
		'</div>',
	].join(''),

	style: [
		'.carbon-debug h4 { display: inline-block; }',
		'.carbon-debug code { display: block; font-family: monospace; background: #414141; padding: 4px; }',
		'.carbon-debug__disclaimer { margin: 0.7rem 0; font-style: italic; }',
		'.carbon-debug__obfuscate-wrap { display: block; margin: 0.7rem 0; }',
		'.carbon-debug__copy { margin: 0; }',
	].join(' '),

	manipulator: 'html',

	initialize: function (minified, clayConfig) {
		var debugInfo = clayConfig.meta.userData && clayConfig.meta.userData.debugInfo;

		if (!debugInfo) {
			this.hide();
			return;
		}

		function escHtml(s) {
			return String(s)
				.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;');
		}

		function obfuscateCoordNumber(value) {
			if (typeof value !== 'number' || !isFinite(value)) return value;
			// 1 decimal keeps regional context while removing precise coordinates.
			return Math.round(value * 10) / 10;
		}

		function obfuscateCoordLikeString(value) {
			if (typeof value !== 'string') return value;
			var parsed = parseFloat(value);
			if (!isFinite(parsed)) return value;
			if (!/^\s*-?\d+(?:\.\d+)?\s*$/.test(value)) return value;
			return String(obfuscateCoordNumber(parsed));
		}

		function obfuscateCoordString(value) {
			if (typeof value !== 'string') return value;
			return value
				.replace(/(lat=)(-?\d+(?:\.\d+)?)/ig, function (_, prefix, num) {
					return prefix + String(obfuscateCoordNumber(parseFloat(num)));
				})
				.replace(/((?:lon|lng)=)(-?\d+(?:\.\d+)?)/ig, function (_, prefix, num) {
					return prefix + String(obfuscateCoordNumber(parseFloat(num)));
				});
		}

		function obfuscateCoords(value, key) {
			if (Array.isArray(value)) {
				return value.map(function (item) {
					return obfuscateCoords(item, '');
				});
			}

			if (value && typeof value === 'object') {
				var out = {};
				var objectKeys = Object.keys(value);
				for (var idx = 0; idx < objectKeys.length; idx++) {
					var k = objectKeys[idx];
					out[k] = obfuscateCoords(value[k], k);
				}
				return out;
			}

			if (/(^|_|\b)(lat|latitude|lon|lng|longitude)(_|\b|$)/i.test(String(key || ''))) {
				if (typeof value === 'number') {
					return obfuscateCoordNumber(value);
				}
				if (typeof value === 'string') {
					return obfuscateCoordLikeString(value);
				}
			}

			if (typeof value === 'string') {
				return obfuscateCoordString(value);
			}

			return value;
		}

		var allData = { activeWatchInfo: clayConfig.meta.activeWatchInfo };
		var dkeys = Object.keys(debugInfo);
		for (var j = 0; j < dkeys.length; j++) {
			allData[dkeys[j]] = debugInfo[dkeys[j]];
		}

		var parts = [];
		var keys = Object.keys(allData);
		for (var i = 0; i < keys.length; i++) {
			var key = keys[i];
			parts.push(
				'<details><summary>' + escHtml(key) + '</summary>' +
				'<code><pre>' + escHtml(JSON.stringify(allData[key], null, 2)) + '</pre></code>' +
				'</details>'
			);
		}
		this.config.defaultValue = parts.join('');

		var copyButton = this.$element.select('.carbon-debug__copy');
		var obfuscateCheckbox = this.$element.select('.carbon-debug__obfuscate');
		copyButton.on('click', function () {
			var shouldObfuscate = true;
			if (obfuscateCheckbox && obfuscateCheckbox.length) {
				shouldObfuscate = !!obfuscateCheckbox.get('checked');
			}

			var copyPayload = shouldObfuscate ? obfuscateCoords(allData, '') : allData;
			var temp = document.createElement('textarea');
			temp.value = JSON.stringify(copyPayload);
			document.body.appendChild(temp);
			temp.select();
			var copied = document.execCommand('copy');
			if (copied) alert('Debug info copied to clipboard.');
			document.body.removeChild(temp);
		});
	},
};
