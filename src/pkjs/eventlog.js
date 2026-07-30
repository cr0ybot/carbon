/**
 * Event log with two-generation localStorage rotation.
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 */

var {
	LOG_KEY_CUR,
	LOG_KEY_PREV,
	MAX_LOG_ENTRIES,
} = require('./constants');

function safeParseList(raw) {
	if (!raw) return [];
	try {
		var parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch (e) {
		return [];
	}
}

function safeReadList(key) {
	try {
		return safeParseList(localStorage.getItem(key));
	} catch (e) {
		return [];
	}
}

function safeWriteList(key, list) {
	try {
		localStorage.setItem(key, JSON.stringify(list));
	} catch (e) { }
}

function trimString(value, maxLen) {
	if (value === null || value === undefined) return '';
	return String(value).substring(0, maxLen);
}

function log(eventCode, detail) {
	var cur = safeReadList(LOG_KEY_CUR);
	if (cur.length >= MAX_LOG_ENTRIES) {
		safeWriteList(LOG_KEY_PREV, cur);
		cur = [];
	}

	cur.push({
		t: Date.now(),
		e: trimString(eventCode, 24),
		d: trimString(detail, 180),
	});

	safeWriteList(LOG_KEY_CUR, cur);
}

function aggregate(eventCode, detail) {
	var cur = safeReadList(LOG_KEY_CUR);
	var now = Date.now();
	var code = trimString(eventCode, 24);
	var info = trimString(detail, 180);

	if (cur.length > 0) {
		var last = cur[cur.length - 1];
		if (last && last.e === code) {
			last.n = last.n ? last.n + 1 : 2;
			last.d = info;
			last.tn = now;
			safeWriteList(LOG_KEY_CUR, cur);
			return;
		}
	}

	log(code, info);
}

function read() {
	return {
		current: safeReadList(LOG_KEY_CUR),
		previous: safeReadList(LOG_KEY_PREV),
	};
}

module.exports = {
	log: log,
	aggregate: aggregate,
	read: read,
};
