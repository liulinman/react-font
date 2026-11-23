import { api, connection, siteOrigin } from './connection.js';

const form = document.querySelector('form');
const field = document.querySelector('#origin');
const status = document.querySelector('#status');
const disconnect = document.querySelector('#disconnect');
const submit = form.querySelector('button[type=submit]');
const base64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
const random = () => base64url(crypto.getRandomValues(new Uint8Array(32)));

async function refresh() {
  const { origin, accessToken } = await connection();
  if (origin) field.value = origin;
  field.readOnly = Boolean(accessToken);
  disconnect.hidden = !accessToken;
  submit.textContent = accessToken ? '重新授权' : '连接账号';
  status.textContent = accessToken ? '已连接，可以回到网页查词。' : '尚未连接账号。';
}

function busy(value) {
  submit.disabled = value;
  disconnect.disabled = value;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  busy(true);
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
  } catch (error) {
    status.textContent = error.message || '连接失败，请重试。';
  } finally {
    busy(false);
  }
});

disconnect.addEventListener('click', async () => {
  busy(true);
  try {
    const { origin, accessToken } = await connection();
    if (accessToken) await api(origin, 'revoke', {}, accessToken);
    await chrome.storage.session.remove('readingSession');
    await refresh();
  } catch (error) {
    status.textContent = error.message || '断开失败，请重试。';
  } finally {
    busy(false);
  }
});

void refresh();
