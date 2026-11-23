export async function connection() {
  const [{ origin }, { readingSession }] = await Promise.all([
    chrome.storage.local.get('origin'),
    chrome.storage.session.get('readingSession'),
  ]);
  return readingSession ?? { origin };
}

export function siteOrigin(value) {
  const url = new URL(value.trim());
  const loopback = ['localhost', '127.0.0.1'].includes(url.hostname);
  if (url.username || url.password || (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback))) {
    throw new Error('请输入 HTTPS 网站地址，本地调试可使用 HTTP');
  }
  return url.origin;
}

export async function api(origin, action, payload, token) {
  const response = await fetch(`${origin}/api/browser-reading/${action}`, {
    method: 'POST',
    credentials: 'omit',
    redirect: 'error',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(70000),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.code !== 200) {
    const error = new Error(typeof result?.message === 'string' ? result.message : '请求失败，请重试');
    error.status = response.status;
    throw error;
  }
  return result.data;
}
