import { parseArgs } from 'node:util';
import { randomUUID } from 'node:crypto';

const { values } = parseArgs({
  options: {
    'base-url': { type: 'string', default: 'http://127.0.0.1/api/' },
    concurrency: { type: 'string', default: '1,5,10,20' },
    requests: { type: 'string', default: '100' },
    'timeout-ms': { type: 'string', default: '5000' },
    'expected-items': { type: 'string' },
    'run-id': { type: 'string' },
    help: { type: 'boolean' },
  },
});

function integer(value, name, min = 1, max = Number.MAX_SAFE_INTEGER) {
  const number = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(number) || number < min || number > max) {
    throw new Error(`${name} 必须是 ${min} 到 ${max} 之间的整数`);
  }
  return number;
}

function percentile(sorted, fraction) {
  return Number(sorted[Math.ceil(sorted.length * fraction) - 1].toFixed(2));
}

async function run() {
  if (values.help) {
    console.log('EW_SESSION_TOKEN=<登录后的 token Cookie 值> node scripts/test-reading-concurrency.mjs\n  [--base-url http://127.0.0.1/api/] [--concurrency 1,5,10,20]\n  [--requests 100] [--timeout-ms 5000] [--expected-items 12] [--run-id UUID]\n--requests 为每档请求数，预检请求不计入统计。');
    return;
  }

  const token = process.env.EW_SESSION_TOKEN;
  if (!token || !/^(?:[A-Za-z0-9_.~+/=-]|%[0-9a-fA-F]{2})+$/.test(token)) throw new Error('请通过 EW_SESSION_TOKEN 提供有效的 token Cookie 值');
  const base = new URL(values['base-url']);
  if (!['https:', 'http:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) {
    throw new Error('--base-url 必须是 HTTP(S) API 基础地址');
  }
  if (base.protocol === 'http:' && !['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname)) {
    throw new Error('远程地址必须使用 HTTPS');
  }
  const url = new URL('reading-practices?page=1&pageSize=12&view=active', base.href.replace(/\/?$/, '/'));
  const requests = integer(values.requests, '--requests', 1, 100000);
  const levels = values.concurrency.split(',').map(value => integer(value, '--concurrency', 1, requests));
  const timeout = integer(values['timeout-ms'], '--timeout-ms', 1, 120000);
  const runId = values['run-id'] ?? randomUUID();
  if (!/^[A-Za-z0-9-]{1,64}$/.test(runId)) throw new Error('--run-id 只能包含字母、数字和连字符，最多 64 个字符');
  const expectedItems = values['expected-items'] === undefined
    ? undefined : integer(values['expected-items'], '--expected-items', 0, 12);

  async function request(url, signal) {
    try {
      const response = await fetch(url, {
        headers: { Cookie: `token=${token}`, Accept: 'application/json' },
        redirect: 'manual',
        signal,
      });
      if (response.status !== 200) {
        await response.body?.cancel();
        return `HTTP ${response.status}`;
      }
      const { code, data } = await response.json();
      if (code !== 200 || !Array.isArray(data?.list) || !Number.isInteger(data.total) ||
          data.page !== 1 || data.pageSize !== 12 || data.list.length !== Math.min(12, data.total) ||
          (expectedItems !== undefined && data.list.length !== expectedItems)) {
        return '响应不符合列表契约';
      }
      return 'OK';
    } catch (error) {
      if (signal.aborted) return '超时';
      if (error instanceof SyntaxError) return '响应不是有效 JSON';
      const networkCode = error.cause?.code;
      return typeof networkCode === 'string' ? `请求异常 ${networkCode}` : '请求异常';
    }
  }

  async function check(stage, sequence) {
    const target = new URL(url);
    if (stage !== undefined) {
      target.searchParams.set('loadRun', runId);
      target.searchParams.set('loadStage', stage);
      target.searchParams.set('loadSeq', sequence);
    }
    const controller = new AbortController();
    let timer;
    // Keep the event loop alive and settle the sample even if fetch stalls.
    const deadline = new Promise(resolve => {
      timer = setTimeout(() => {
        resolve('超时');
        controller.abort();
      }, timeout);
    });
    try {
      return await Promise.race([request(target, controller.signal), deadline]);
    } finally {
      clearTimeout(timer);
    }
  }

  const preflight = await check();
  if (preflight !== 'OK') throw new Error(`单请求预检失败：${preflight}`);

  console.log(JSON.stringify({ runId, url: url.href, requestsPerLevel: requests, timeoutMs: timeout }));
  for (const [index, concurrency] of levels.entries()) {
    const stage = index + 1;
    const started = performance.now();
    let scheduled = 0;
    const latencies = [];
    const successLatencies = [];
    const outcomes = {};
    async function worker() {
      while (scheduled < requests) {
        const sequence = ++scheduled;
        const start = performance.now();
        const outcome = await check(stage, sequence);
        const latency = performance.now() - start;
        latencies.push(latency);
        if (outcome === 'OK') successLatencies.push(latency);
        outcomes[outcome] = (outcomes[outcome] ?? 0) + 1;
      }
    }
    await Promise.all(Array.from({ length: concurrency }, worker));
    if (latencies.length !== requests) throw new Error(`第 ${stage} 档缺少请求统计`);
    latencies.sort((a, b) => a - b);
    successLatencies.sort((a, b) => a - b);
    const success = outcomes.OK ?? 0;
    console.log(JSON.stringify({
      stage, concurrency, requests, success, successRate: success / requests,
      timeouts: outcomes['超时'] ?? 0, outcomes,
      requestsPerSecond: Number((requests * 1000 / (performance.now() - started)).toFixed(2)),
      p50Ms: percentile(latencies, 0.5), p95Ms: percentile(latencies, 0.95),
      p99Ms: percentile(latencies, 0.99), maxMs: percentile(latencies, 1),
      successP95Ms: success ? percentile(successLatencies, 0.95) : null,
      successP99Ms: success ? percentile(successLatencies, 0.99) : null,
    }));
    if (success !== requests) process.exitCode = 1;
  }
}

try {
  await run();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
