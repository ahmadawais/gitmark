'use strict';

async function sendToggle(tabId) {
	try {
		await chrome.tabs.sendMessage(tabId, {type: 'toggle'});
	} catch {}
}

chrome.action.onClicked.addListener(tab => {
	if (tab?.id) sendToggle(tab.id);
});
