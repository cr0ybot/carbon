/**
 * Clay custom component: service-notice
 *
 * Displays a warning banner when any remote service has been deliberately
 * disabled via services.json. Notice data is injected at showConfiguration
 * time via clay.meta.userData.serviceNotices.
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 */

module.exports = {
	name: 'service-notice',

	template: [
		'<div class="component carbon-service-notice">',
		'  <div data-manipulator-target></div>',
		'</div>',
	].join(''),

	style: [
		'.carbon-service-notice { background: #5c3a00; border-radius: 4px; padding: 1px 10px; margin: 6px 0; }',
		'.carbon-service-notice p { margin: 0.6rem 0; }',
		'.carbon-service-notice a { color: #ffb84d; }',
	].join(' '),

	manipulator: 'html',

	initialize: function(minified, clayConfig) {
		var userData = clayConfig.meta.userData || {};
		var notices = userData.serviceNotices;

		if (!notices || !notices.length) {
			this.hide();
			return;
		}

		function escHtml(s) {
			return String(s)
				.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;')
				.replace(/"/g, '&quot;');
		}

		var parts = [];
		for (var i = 0; i < notices.length; i++) {
			var n = notices[i];
			parts.push(
				'<p><strong>' + escHtml(n.label || n.service) +
				'</strong> is temporarily disabled' +
				(n.message ? ': ' + escHtml(n.message) : '.') + '</p>'
			);
		}
		if (userData.repoUrl) {
			parts.push(
				'<p>Check <a href="' + escHtml(userData.repoUrl) +
				'">the GitHub repository</a> for more information.</p>'
			);
		}
		this.config.defaultValue = parts.join('');
	},
};
