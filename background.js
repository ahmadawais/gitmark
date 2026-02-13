'use strict';

async function sendToggle(tabId) {
	try {
		await chrome.tabs.sendMessage(tabId, {type: 'toggle'});
	} catch {}
}

chrome.commands.onCommand.addListener(async (command) => {
	if (command !== 'toggle-like') return;
	const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
	if (tab?.id) sendToggle(tab.id);
});

chrome.action.onClicked.addListener((tab) => {
	if (tab?.id) sendToggle(tab.id);
});
