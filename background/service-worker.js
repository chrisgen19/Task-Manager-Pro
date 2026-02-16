const NEWTAB_URL = chrome.runtime.getURL('newtab/newtab.html');

chrome.action.onClicked.addListener(async () => {
  const tabs = await chrome.tabs.query({ url: NEWTAB_URL });
  if (tabs.length > 0) {
    await chrome.tabs.update(tabs[0].id, { active: true });
    await chrome.windows.update(tabs[0].windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url: NEWTAB_URL });
  }
});
