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
		'      <button type="button" class="carbon-debug__copy">Copy debug info to clipboard</button>',
		'    </div>',
		'  </details>',
		'</div>',
	].join(''),

	style: [
		'.carbon-debug h4 { display: inline-block; }',
		'.carbon-debug code { display: block; font-family: monospace; background: #414141; padding: 4px; }',
		'.carbon-debug__copy { margin: 1rem 0 0; }'
	].join(' '),

	manipulator: 'html',

	initialize: function(minified, clayConfig) {
		if ( ! clayConfig.meta.userData.debugInfo ) {
			this.hide();
			return;
		}

		// The default value is set from the messageKey with a fallback to defaultValue after initialize is called. We hijack defaultValue to display the debug info.
		this.config.defaultValue =  clayConfig.meta.userData.debugInfo.html || '<p>No cache data yet.</p>';

		// Add click handler for the copy button.
		var copyButton = this.$element.select('button');
		console.log(copyButton);
		copyButton.on('click', function() {
			console.log(clayConfig.meta.userData.debugInfo.raw);
			var debugContents = clayConfig.meta.userData.debugInfo.raw;
			if (debugContents) {
				// Create temporary textarea to hold the debug contents.
				var tempTextarea = document.createElement('textarea');
				tempTextarea.value = debugContents;
				document.body.appendChild(tempTextarea);
				tempTextarea.select();

				// Clipboard API is not available outside of secure contexts.
				var copied = document.execCommand('copy');
				if (copied) alert('Debug info copied to clipboard.');

				// Clear the selection after copying.
				document.body.removeChild(tempTextarea);
			}
		});
	},
};
