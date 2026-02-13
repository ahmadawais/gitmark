'use strict';

(function () {
	function loadSettings() {
		chrome.storage.sync.get(
			['owner', 'repo', 'path', 'token'],
			function (data) {
				if (data.owner && data.repo) {
					document.getElementById('repository').value =
						data.owner + '/' + data.repo;
				}
				if (data.path)
					document.getElementById('path').value = data.path;
				if (data.token)
					document.getElementById('token').value = data.token;
			},
		);
	}

	function parseRepo(val) {
		val = val
			.trim()
			.replace(/^https?:\/\//, '')
			.replace(/^github\.com\//, '')
			.replace(/\/+$/, '');

		var parts = val.split('/');
		if (parts.length < 2 || !parts[0] || !parts[1]) return null;
		return {owner: parts[0].trim(), repo: parts[1].trim()};
	}

	async function validateSettings(owner, repo, path, token) {
		var headers = {Authorization: 'Bearer ' + token};

		// Validate token.
		var userRes = await fetch('https://api.github.com/user', {
			headers: headers,
		});
		if (!userRes.ok)
			return {ok: false, error: 'Invalid token.', user: null};
		var user = await userRes.json();

		// Validate repo access.
		var repoRes = await fetch(
			'https://api.github.com/repos/' + owner + '/' + repo,
			{headers: headers},
		);
		if (!repoRes.ok)
			return {
				ok: false,
				error:
					'Repo "' + owner + '/' + repo + '" not found or no access.',
				user: user,
			};

		// Validate file exists (case-insensitive).
		var parts = path.split('/');
		var filename = parts.pop();
		var dirPath = parts.length ? '/' + parts.join('/') : '';
		var dirRes = await fetch(
			'https://api.github.com/repos/' +
				owner +
				'/' +
				repo +
				'/contents' +
				dirPath,
			{headers: headers},
		);

		if (dirRes.ok) {
			var contents = await dirRes.json();
			if (Array.isArray(contents)) {
				var match = contents.find(function (item) {
					return item.name.toLowerCase() === filename.toLowerCase();
				});
				if (!match)
					return {
						ok: false,
						error:
							'File "' +
							path +
							'" not found in repo. Create it first.',
						user: user,
					};
			}
		}

		return {ok: true, user: user};
	}

	async function saveSettings() {
		var status = document.getElementById('status');
		var repoVal = document.getElementById('repository').value;
		var pathVal = document.getElementById('path').value.trim();
		var tokenVal = document.getElementById('token').value.trim();

		var parsed = parseRepo(repoVal);
		if (!parsed) {
			status.textContent = 'Repository must be in owner/repo format.';
			status.className = 'status-bar status-error';
			return;
		}

		if (!tokenVal) {
			status.textContent = 'API token is required.';
			status.className = 'status-bar status-error';
			return;
		}

		var owner = parsed.owner;
		var repo = parsed.repo;
		var path = pathVal || 'README.md';

		status.textContent = 'Validating...';
		status.className = 'status-bar';

		try {
			var result = await validateSettings(owner, repo, path, tokenVal);

			if (!result.ok) {
				status.textContent = result.error;
				status.className = 'status-bar status-error';
				return;
			}

			var user = result.user;
			var settings = {
				owner: owner,
				repo: repo,
				path: path,
				token: tokenVal,
				committer_name: user.name || user.login || owner,
				committer_email:
					user.email || owner + '@users.noreply.github.com',
			};

			chrome.storage.sync.set(settings, function () {
				status.textContent =
					'Connected as ' +
					(user.login || owner) +
					'. Settings saved.';
				status.className = 'status-bar status-ok';
				window.scrollTo(0, 0);
			});
		} catch (e) {
			status.textContent = 'Connection failed. Check your network.';
			status.className = 'status-bar status-error';
		}
	}

	document.addEventListener('DOMContentLoaded', function () {
		loadSettings();
		document.getElementById('save').addEventListener('click', saveSettings);
	});
})();
