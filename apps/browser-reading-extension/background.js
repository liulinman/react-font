import { api, connection } from './connection.js';

const menu = 'english-world-context-meaning';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: menu,
    title: 'English World · 查本句含义',
    contexts: ['selection'],
    documentUrlPatterns: ['http://*/*', 'https://*/*'],
  });
});

chrome.action.onClicked.addListener(() => { void chrome.runtime.openOptionsPage(); });

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== menu || tab?.id == null) return;
  try {
    const [script] = await chrome.scripting.executeScript({
      target: { tabId: tab.id, frameIds: [info.frameId ?? 0] },
      files: ['content.js'],
    });
    await chrome.tabs.sendMessage(tab.id, {
      kind: 'read-selection', selected: info.selectionText,
    }, { documentId: script.documentId });
  } catch {
    await chrome.action.setBadgeText({ tabId: tab.id, text: '!' }).catch(() => {});
    await chrome.action.setTitle({
      tabId: tab.id, title: '此页面无法读取选词。请在普通网页正文中重试。',
    }).catch(() => {});
  }
});

chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (!sender.tab || !['explain', 'save', 'open-settings'].includes(message?.kind)) return;
  (async () => {
    if (message.kind === 'open-settings') {
      await chrome.runtime.openOptionsPage();
      return {};
    }
    const { origin, accessToken } = await connection();
    if (!origin || !accessToken) return { disconnected: true };
    const data = await api(origin, message.kind, message.payload, accessToken);
    return { data };
  })().then(reply, (error) => reply({
    disconnected: error.status === 401,
    expired: error.status === 404 && message.kind === 'save',
    error: error.message || '暂时无法连接，请重试',
  }));
  return true;
});
