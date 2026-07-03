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
		'      <p class="carbon-debug__disclaimer">Do not share this information publicly without obfuscating sensitive data, such as latitude and longitude.</p>',
		'      <button type="button" class="carbon-debug__copy">Copy debug info to clipboard</button>',
		'    </div>',
		'  </details>',
		'</div>',
	].join(''),

	style: [
		'.carbon-debug h4 { display: inline-block; }',
		'.carbon-debug code { display: block; font-family: monospace; background: #414141; padding: 4px; }',
		'.carbon-debug__disclaimer { margin: 0.7rem 0; font-style: italic; }',
		'.carbon-debug__copy { margin: 0; }',
	].join(' '),

	manipulator: 'html',

	initialize: function(minified, clayConfig) {
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

		var copyButton = this.$element.select('button');
		copyButton.on('click', function() {
			var temp = document.createElement('textarea');
			temp.value = JSON.stringify(allData);
			document.body.appendChild(temp);
			temp.select();
			var copied = document.execCommand('copy');
			if (copied) alert('Debug info copied to clipboard.');
			document.body.removeChild(temp);
		});
	},
};
