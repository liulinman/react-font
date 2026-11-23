import { api, connection, siteOrigin } from './connection.js';

const form = document.querySelector('form');
const field = document.querySelector('#origin');
const status = document.querySelector('#status');
const statusTitle = document.querySelector('#status-title');
const statusDetail = document.querySelector('#status-detail');
const originHint = document.querySelector('#origin-hint');
const feedback = document.querySelector('#feedback');
const disconnect = document.querySelector('#disconnect');
const submit = form.querySelector('button[type=submit]');
const base64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
const random = () => base64url(crypto.getRandomValues(new Uint8Array(32)));

async function refresh() {
  const { origin, accessToken } = await connection();
  const connected = Boolean(accessToken);
  if (origin) field.value = origin;
  field.readOnly = connected;
  disconnect.hidden = !connected;
  submit.textContent = connected ? '重新授权' : '连接账号';
  originHint.textContent = connected ? '如需切换站点，请先断开连接。' : '填写 English World 的网页地址。';
  status.dataset.state = connected ? 'connected' : 'disconnected';
  statusTitle.textContent = connected ? '已连接' : '尚未连接';
  statusDetail.textContent = connected ? '可以回到网页查词。' : '登录并授权后即可在网页查词。';
}

function showFeedback(message = '', isError = false) {
  feedback.dataset.error = String(isError);
  feedback.textContent = message;
}

function busy(value) {
  field.disabled = value;
  submit.disabled = value;
  disconnect.disabled = value;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  busy(true);
  showFeedback('正在请求授权…');
  try {
    const origin = siteOrigin(field.value);
    const pattern = new URL(origin);
    const granted = await chrome.permissions.request({ origins: [`${pattern.protocol}//${pattern.hostname}/*`] });
    if (!granted) throw new Error('需要授予访问该网站的权限');
    const verifier = random();
    const state = random();
    const challenge = base64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
    const redirect = chrome.identity.getRedirectURL('english-world');
    const page = new URL('/englishWorld/browser-reading/connect', origin);
    page.search = new URLSearchParams({ redirect, challenge, state });
    const final = new URL(await chrome.identity.launchWebAuthFlow({ url: page.href, interactive: true }));
    if (final.origin + final.pathname !== redirect || final.searchParams.get('state') !== state) {
      throw new Error('扩展授权响应无效');
    }
    const previous = await connection();
    const { accessToken } = await api(origin, 'exchange', { code: final.searchParams.get('code'), verifier });
    if (previous.accessToken) {
      try {
        await api(previous.origin, 'revoke', {}, previous.accessToken);
      } catch (error) {
        await api(origin, 'revoke', {}, accessToken).catch(() => {});
        throw error;
      }
    }
    await chrome.storage.local.set({ origin });
    await chrome.storage.session.set({ readingSession: { origin, accessToken } });
    await refresh();
    showFeedback();
  } catch (error) {
    showFeedback(error.message || '连接失败，请重试。', true);
  } finally {
    busy(false);
  }
});

disconnect.addEventListener('click', async () => {
  busy(true);
  showFeedback('正在断开连接…');
  try {
    const { origin, accessToken } = await connection();
    if (accessToken) await api(origin, 'revoke', {}, accessToken);
    await chrome.storage.session.remove('readingSession');
    await refresh();
    showFeedback();
  } catch (error) {
    showFeedback(error.message || '断开失败，请重试。', true);
  } finally {
    busy(false);
  }
});

refresh().then(() => busy(false), () => {
  status.dataset.state = 'unknown';
  statusTitle.textContent = '暂时无法读取连接状态';
  statusDetail.textContent = '刷新此页后重试。';
});
