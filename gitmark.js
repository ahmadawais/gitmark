'use strict';

(function () {
	var API_BASE = 'https://api.github.com/repos';
	var MONTHS = [
		'January',
		'February',
		'March',
		'April',
		'May',
		'June',
		'July',
		'August',
		'September',
		'October',
		'November',
		'December'
	];

	// Common page title suffixes to strip.
	var TITLE_JUNK = [
		/ [-–—|·] GitHub$/i,
		/ [-–—|·] YouTube$/i,
		/ [-–—|·] Medium$/i,
		/ [-–—|·] Wikipedia$/i,
		/ [-–—|·] Stack Overflow$/i,
		/ [-–—|·] Reddit$/i,
		/ [-–—|·] X$/i,
		/ [-–—|·] Twitter$/i,
		/ [-–—|·] LinkedIn$/i,
		/ [-–—|·] npm$/i,
		/ [-–—|·] DEV Community$/i
	];

	var POPUP_HTML =
		'<div class="gm">' +
		'<div class="gm-header">' +
		'<span class="gm-brand">GitMark</span>' +
		'<button class="gm-close" id="gm_close">&times;</button>' +
		'</div>' +
		'<div class="gm-field">' +
		'<label class="gm-label">Title</label>' +
		'<input class="gm-input" type="text" name="title" />' +
		'</div>' +
		'<div class="gm-field">' +
		'<label class="gm-label">Description <span class="gm-optional">optional</span></label>' +
		'<input class="gm-input" type="text" name="desc" />' +
		'</div>' +
		'<input type="hidden" name="url" />' +
		'<div class="gm-field">' +
		'<label class="gm-label">Date</label>' +
		'<input class="gm-input" type="date" name="date" />' +
		'</div>' +
		'<div class="gm-actions">' +
		'<button class="gm-btn gm-btn-primary" id="gm_save">Save</button>' +
		'<button class="gm-btn gm-btn-ghost" id="gm_cancel">Cancel</button>' +
		'<span class="gm-hint">\u2318\u23CE save</span>' +
		'</div>' +
		'<div class="gm-status" id="gm_status"><p></p></div>' +
		'</div>';

	// --- Helpers ---

	function $(sel) {
		return document.querySelector(sel);
	}

	function getMetaDescription() {
		var meta = $('meta[name="description"]');
		return meta ? meta.content : '';
	}

	function cleanTitle(title) {
		TITLE_JUNK.forEach(function (regex) {
			title = title.replace(regex, '');
		});
		return title.trim();
	}

	function decodeBase64(str) {
		var bytes = Uint8Array.from(atob(str), function (c) {
			return c.charCodeAt(0);
		});
		return new TextDecoder().decode(bytes);
	}

	function encodeBase64(str) {
		var bytes = new TextEncoder().encode(str);
		var binary = '';
		for (var i = 0; i < bytes.length; i++) {
			binary += String.fromCharCode(bytes[i]);
		}
		return btoa(binary);
	}

	function formatDate(d) {
		return MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
	}

	function todayISO() {
		var d = new Date();
		var mm = String(d.getMonth() + 1).padStart(2, '0');
		var dd = String(d.getDate()).padStart(2, '0');
		return d.getFullYear() + '-' + mm + '-' + dd;
	}

	function parseDate(str) {
		var m = str.trim().match(/^(\w+)\s+(\d+),\s+(\d+)$/);
		if (!m) return null;
		var mi = MONTHS.indexOf(m[1]);
		if (mi === -1) return null;
		return new Date(parseInt(m[3]), mi, parseInt(m[2]));
	}

	function friendlyError(status, message) {
		if (status === 401) return 'Invalid token. Generate a new one in settings.';
		if (status === 403) return 'Access denied. Check token permissions.';
		if (status === 404)
			return 'Repo or file not found. Check your settings.';
		if (status === 409) return 'Conflict — file was updated elsewhere. Try again.';
		if (status === 422) return 'Validation failed. The file may be too large.';
		return message || 'Something went wrong.';
	}

	function hasUrl(content, url) {
		return content.indexOf('](' + url + ')') !== -1;
	}

	function appendLink(content, linkLine, dateStr) {
		if (content.indexOf('### ' + dateStr) !== -1) {
			return content.replace(
				'### ' + dateStr + '\n',
				'### ' + dateStr + '\n' + linkLine
			);
		}

		if (!content.trim()) {
			return '### ' + dateStr + '\n' + linkLine;
		}

		var target = parseDate(dateStr);
		var regex = /^### (.+)$/gm;
		var match;
		var insertPos = -1;

		while ((match = regex.exec(content)) !== null) {
			var existing = parseDate(match[1]);
			if (existing && target > existing) {
				insertPos = match.index;
				break;
			}
		}

		var section = '### ' + dateStr + '\n' + linkLine + '\n';

		if (insertPos === -1) {
			return content.trimEnd() + '\n\n' + section;
		}

		return content.slice(0, insertPos) + section + content.slice(insertPos);
	}

	// --- Storage ---

	function getSettings() {
		return new Promise(function (resolve) {
			chrome.storage.sync.get(
				[
					'owner',
					'repo',
					'path',
					'token',
					'committer_name',
					'committer_email'
				],
				resolve
			);
		});
	}

	// --- Popup ---

	var popupCreated = false;

	function ensurePopup() {
		if (popupCreated && $('.gm')) return;
		document.body.insertAdjacentHTML('beforeend', POPUP_HTML);
		popupCreated = true;
		bindPopupEvents();
	}

	function showPopup() {
		ensurePopup();
		var container = $('.gm');
		container.classList.add('gm-open');

		// Force reflow then add visible for animation.
		container.offsetHeight;
		container.classList.add('gm-visible');

		$('.gm input[name="title"]').value = cleanTitle(document.title);
		$('.gm input[name="desc"]').value = getMetaDescription();
		$('.gm input[name="url"]').value = window.location.href;
		$('.gm input[name="date"]').value = todayISO();
		$('.gm input[name="title"]').focus();
	}

	function hidePopup() {
		var container = $('.gm');
		if (!container) return;
		container.classList.remove('gm-visible');
		setTimeout(function () {
			container.classList.remove('gm-open');
			resetPopup();
		}, 150);
	}

	function togglePopup() {
		ensurePopup();
		var container = $('.gm');
		if (container.classList.contains('gm-open')) {
			hidePopup();
		} else {
			showPopup();
		}
	}

	function resetPopup() {
		var btn = $('#gm_save');
		if (btn) {
			btn.textContent = 'Save';
			btn.classList.remove('saving');
		}
		var status = $('#gm_status');
		if (status) status.classList.remove('gm-status-open');
		var statusText = $('#gm_status p');
		if (statusText) statusText.innerHTML = '';
	}

	function showMessage(html) {
		var status = $('#gm_status');
		var statusText = $('#gm_status p');
		if (status) status.classList.add('gm-status-open');
		if (statusText) statusText.innerHTML = html;
	}

	// --- GitHub ---

	async function resolveFilePath(repoBase, path, headers) {
		var parts = path.split('/');
		var filename = parts.pop();
		var dirPath = parts.length ? '/' + parts.join('/') : '';
		var dirUrl = repoBase + '/contents' + dirPath;

		var res = await fetch(dirUrl, {headers: headers});
		if (!res.ok) return path;

		var contents = await res.json();
		if (!Array.isArray(contents)) return path;

		var match = contents.find(function (item) {
			return item.name.toLowerCase() === filename.toLowerCase();
		});

		return match ? match.path : path;
	}

	async function commitLike() {
		var btn = $('#gm_save');
		if (btn.classList.contains('saving')) return;

		var title = $('.gm input[name="title"]').value.trim();
		var desc = $('.gm input[name="desc"]').value.trim();
		var url = $('.gm input[name="url"]').value.trim();
		var dateVal = $('.gm input[name="date"]').value;
		var dateObj = dateVal ? new Date(dateVal + 'T12:00:00') : new Date();
		var dateStr = formatDate(dateObj);

		if (!title) {
			showMessage('Title is required.');
			return;
		}

		btn.classList.add('saving');
		btn.textContent = 'Saving...';

		try {
			var settings = await getSettings();
			var owner = settings.owner;
			var repo = settings.repo;
			var path = settings.path;
			var token = settings.token;

			if (!owner || !repo || !path || !token) {
				showMessage(
					'Missing settings. Right-click the extension icon and open Options.'
				);
				btn.classList.remove('saving');
				btn.textContent = 'Save';
				return;
			}

			var repoBase = API_BASE + '/' + owner + '/' + repo;
			var headers = {
				'Content-Type': 'application/json',
				Authorization: 'Bearer ' + token
			};

			var apiUrl = repoBase + '/contents/' + path;
			var fileRes = await fetch(apiUrl, {headers: headers});

			if (fileRes.status === 404) {
				path = await resolveFilePath(repoBase, path, headers);
				apiUrl = repoBase + '/contents/' + path;
				fileRes = await fetch(apiUrl, {headers: headers});
			}

			var fileData = await fileRes.json();

			if (!fileRes.ok) {
				showMessage(friendlyError(fileRes.status, fileData.message));
				btn.classList.remove('saving');
				btn.textContent = 'Save';
				return;
			}

			var currentContent = decodeBase64(fileData.content.replace(/\n/g, ''));

			// Duplicate check.
			if (hasUrl(currentContent, url)) {
				showMessage('Already bookmarked.');
				btn.classList.remove('saving');
				btn.textContent = 'Save';
				return;
			}

			var linkLine =
				'- [' +
				title +
				'](' +
				url +
				')' +
				(desc ? ' \u2014 ' + desc : '') +
				'\n';
			var updatedContent = appendLink(currentContent, linkLine, dateStr);

			var commit = {
				message: '\uD83D\uDCE6 NEW: ' + title,
				content: encodeBase64(updatedContent),
				sha: fileData.sha,
				committer: {
					name: settings.committer_name || owner,
					email: settings.committer_email || ''
				}
			};

			var putRes = await fetch(apiUrl, {
				method: 'PUT',
				headers: headers,
				body: JSON.stringify(commit)
			});
			var putData = await putRes.json();

			if (putRes.ok) {
				showMessage(
					'Done \u2014 <a href="' +
						putData.commit.html_url +
						'" target="_blank">view commit</a>'
				);
				setTimeout(hidePopup, 5000);
			} else {
				showMessage(friendlyError(putRes.status, putData.message));
			}
		} catch (err) {
			showMessage('Error: ' + err.message);
		}

		btn.classList.remove('saving');
		btn.textContent = 'Save';
	}

	// --- Events ---

	function bindPopupEvents() {
		$('#gm_save').addEventListener('click', commitLike);
		$('#gm_cancel').addEventListener('click', hidePopup);
		$('#gm_close').addEventListener('click', hidePopup);

		document.addEventListener('keydown', function (e) {
			if (!$('.gm') || !$('.gm').classList.contains('gm-open')) return;

			if (e.key === 'Escape') hidePopup();

			if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				commitLike();
			}
		});

		document.addEventListener('mousedown', function (e) {
			var container = $('.gm');
			if (!container || !container.classList.contains('gm-open')) return;
			if (!container.contains(e.target)) hidePopup();
		});
	}

	// --- Global shortcut (Cmd/Ctrl+Shift+G) ---

	document.addEventListener('keydown', function (e) {
		if (e.key === 'g' && e.shiftKey && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			togglePopup();
		}
	});

	// --- Listen for background messages ---

	chrome.runtime.onMessage.addListener(function (msg) {
		if (msg.type === 'toggle') togglePopup();
	});
})();
