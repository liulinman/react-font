import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';

const script = readFileSync(resolve(process.cwd(), '../browser-reading-extension/content.js'), 'utf8');
const boot = new Function('chrome', 'CSSStyleSheet', 'ResizeObserver', script);
const marker = globalThis as typeof globalThis & { englishWorldReadingCard?: boolean };

afterEach(() => {
  document.querySelectorAll('[data-test-extension-card]').forEach((node) => node.remove());
  document.body.replaceChildren();
  window.getSelection()?.removeAllRanges();
  delete marker.englishWorldReadingCard;
  vi.restoreAllMocks();
});

function openCard(html: string, selected = 'bank', tag = 'p') {
  const paragraph = document.createElement(tag);
  paragraph.innerHTML = html;
  document.body.append(paragraph);
  const range = document.createRange();
  range.selectNodeContents(paragraph.querySelector('b:last-child')!);
  range.getBoundingClientRect = () => new DOMRect(30, 50, 10, 10);
  window.getSelection()!.addRange(range);

  let show!: (message: { kind: string; selected: string }, sender: null, reply: () => void) => void;
  let root!: ShadowRoot;
  const attach = HTMLElement.prototype.attachShadow;
  vi.spyOn(HTMLElement.prototype, 'attachShadow').mockImplementation(function (this: HTMLElement, options) {
    this.setAttribute('data-test-extension-card', '');
    root = attach.call(this, options);
    return root;
  });
  const sendMessage = vi.fn();
  let resolveQuery!: (value: unknown) => void;
  sendMessage.mockImplementationOnce(() => new Promise((accept) => { resolveQuery = accept; }));
  boot({ runtime: { sendMessage, onMessage: { addListener: (callback: typeof show) => { show = callback; } } } },
    class { replaceSync() {} }, class { observe() {} disconnect() {} });
  show({ kind: 'read-selection', selected }, null, () => {});
  return { root, sendMessage, resolveQuery };
}

it('anchors the second visible word and excludes hidden text from the request', () => {
  const { root, sendMessage } = openCard('From the bank, we saw the <span hidden>private metadata </span>river <b>bank</b>.');
  expect(sendMessage).toHaveBeenCalledWith(expect.objectContaining({
    kind: 'explain',
    payload: expect.objectContaining({ context: 'From the bank, we saw the river <target>bank</target>.' }),
  }));
  root.querySelector('button')!.click();
});

it('separates words across a line break and ignores a query that completes after dismissal', async () => {
  const { root, sendMessage, resolveQuery } = openCard('We rested by the river<br><b>bank</b>.');
  expect(sendMessage).toHaveBeenCalledWith(expect.objectContaining({
    payload: expect.objectContaining({ context: 'We rested by the river <target>bank</target>.' }),
  }));
  root.querySelector('button')!.click();
  resolveQuery({ data: { meaning: '河岸' } });
  await Promise.resolve();
  expect(root.host.isConnected).toBe(false);
  expect(root.textContent).not.toContain('河岸');
});

it('marks a heading as a fragment and presents common meanings without a sentence translation', async () => {
  const { root, sendMessage, resolveQuery } = openCard('Key <b>Considerations</b>.', 'Considerations', 'h2');
  expect(sendMessage).toHaveBeenCalledWith(expect.objectContaining({
    payload: expect.objectContaining({ context: 'Key <target>Considerations</target>.', contextKind: 'fragment' }),
  }));
  resolveQuery({ data: { mode: 'dictionary', lemma: 'consideration', meaning: '考虑；注意事项',
    sentence: 'Key Considerations.', source: { url: 'https://example.test' }, wordExists: true, saved: false,
  } });
  await vi.waitFor(() => expect(root.textContent).toContain('常见释义'));
  expect(root.textContent).toContain('原文片段');
  expect(root.textContent).toContain('考虑；注意事项');
  expect(root.textContent).not.toContain('整句译文');
});

it('shows a Chinese retry message for an internal server error and lets the reader retry', async () => {
  const { root, sendMessage, resolveQuery } = openCard('We rested by the river <b>bank</b>.');
  resolveQuery({ error: 'Internal server error', status: 503 });
  await vi.waitFor(() => expect(root.textContent).toContain('暂时查不到这个词'));
  expect(root.textContent).not.toContain('Internal server error');
  const retry = [...root.querySelectorAll('button')].find(button => button.textContent === '重试查询');
  expect(retry).toBeDefined();
  sendMessage.mockResolvedValueOnce({ error: '测试查询失败' });
  retry!.click();
  expect(sendMessage).toHaveBeenCalledTimes(2);
});
