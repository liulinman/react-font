import { spawn } from 'node:child_process';
import { open, readFile, writeFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import net from 'node:net';
import { redact } from './model.mjs';

export async function execute(root, dir, plan, onProgress) {
  const backend = resolve(process.env.E2E_BACKEND_DIR || resolve(root, '../nestjs'));
  const children = [], handles = [], results = [], errors = [];
  const startedAt = Date.now();
  let stopped = false;
  const stop = () => { stopped = true; for (const c of children) { if (c.exitCode !== null || c.signalCode !== null) continue; try { process.kill(c.backend ? c.pid : -c.pid, 'SIGTERM'); } catch {} } };
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
  const start = async (command, args, cwd, name, extra = {}) => {
    if (stopped) throw new Error('用户中断测试');
    const handle = await open(resolve(dir, `${name}.log`), 'w'); handles.push(handle);
    const env = { ...process.env, E2E_BACKEND_DIR: backend, ADMIN_USERNAME: 'automation_admin', ADMIN_PASSWORD: 'AutomationAdmin123!' };
    if (extra.backend && !plan.all) {
      const specs = ['core'];
      if (plan.modules.some(m => m.id === 'intensive-reading')) specs.push('intensive-reading');
      if (plan.modules.some(m => m.id === 'reading' || m.id === 'notifications')) specs.push('reading-practice', 'reading-review', 'reading-recipients', 'reading-analytics');
      env.E2E_BACKEND_TEST_SPECS = specs.map(s => `test/integration/${s}.integration-spec.ts`).join(',');
    } else if (extra.backend) delete env.E2E_BACKEND_TEST_SPECS;
    for (const key of Object.keys(env)) if (/API_KEY/i.test(key)) delete env[key];
    if (!extra.cloud) delete env.CYPRESS_RECORD_KEY;
    const child = spawn(command, args, { cwd, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
    child.backend = Boolean(extra.backend);
    // Redact full lines, so a secret split across stream chunks cannot leak.
    for (const stream of [child.stdout, child.stderr]) {
      let tail = '';
      stream.setEncoding('utf8');
      stream.on('data', chunk => { tail += chunk; const parts = tail.split('\n'); tail = parts.pop(); for (const line of parts) handle.write(redact(line) + '\n').catch(() => {}); });
      stream.on('end', () => { if (tail) handle.write(redact(tail)).catch(() => {}); });
    }
    child.done = new Promise(accept => { child.once('error', error => { child.startError = error; accept(1); }); child.once('close', code => accept(code ?? 1)); });
    children.push(child); return child;
  };
  const wait = async (url, child) => {
    for (let attempt = 0; attempt < 240; attempt++) {
      if (stopped || child.startError || child.exitCode !== null || child.signalCode !== null) throw new Error(`服务启动失败/中断：${url}，查看服务日志`);
      try { if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) return; } catch {}
      await new Promise(r => setTimeout(r, 1000));
    }
    throw new Error(`服务启动超时：${url}`);
  };
  try {
    for (const port of [13317, 13318, 5176]) await new Promise((accept, reject) => {
      const server = net.createServer(); server.once('error', () => reject(new Error(`端口 ${port} 已占用；未触碰现有服务`))); server.listen(port, '127.0.0.1', () => server.close(accept));
    });
    const api = await start('node', ['scripts/test-local.mjs', '--serve'], backend, 'backend', { backend: true });
    await wait('http://127.0.0.1:13317/__automation/ready', api);
    const admin = await start('pnpm', ['exec', 'vite', '--config', 'vite.prd.config.ts'], resolve(root, 'apps/admin'), 'admin');
    await wait('http://127.0.0.1:5176/admin/', admin);
    const frontend = await start('pnpm', ['exec', 'vite', '--config', 'vite.prd.config.ts'], resolve(root, 'apps/english-world'), 'frontend');
    await wait('http://127.0.0.1:13318', frontend);
      onProgress(plan.suites.map(s => s.id).join(', '));
      // One Cloud group holds all specs; before:spec performs guarded seed resets.
      const worker = await start('node', [resolve(root, 'scripts/prd-testing/cypress-worker.mjs'), root, dir], root, 'cypress-batch', { cloud: true });
      let workerTimer;
      const code = await Promise.race([worker.done, new Promise(accept => {
        workerTimer = setTimeout(() => {
          errors.push('浏览器批次超过 45 分钟执行时限');
          try { process.kill(-worker.pid, 'SIGTERM'); } catch {}
          accept(1);
        }, 45 * 60 * 1000);
      })]);
      clearTimeout(workerTimer);
      for (const suite of plan.suites) try {
        const result = JSON.parse(await readFile(resolve(dir, `execution/${suite.id}.json`), 'utf8')); results.push(result);
        if (result.error || (!result.tests.length) || (plan.cloud && !result.runUrl)) errors.push(`${suite.id}: ${result.error || '无测试结果或缺少 Cloud 上传确认'}`);
      } catch { errors.push(`${suite.id}: 进程退出 ${code}，缺少结果；查看 cypress-batch.log`); }
      if (code && !results.some(r => r.tests.some(t => t.state === 'failed') || r.error)) errors.push(`浏览器批次异常退出 ${code}`);
  } catch (error) { errors.push(error.message); }
  finally {
    stop();
    for (const child of [...children].reverse()) {
      if (child.exitCode !== null || child.signalCode !== null) continue;
      let timer;
      const completed = await Promise.race([child.done.then(() => true), new Promise(r => { timer = setTimeout(() => r(false), 30000); })]);
      clearTimeout(timer);
      if (!completed) { try { process.kill(child.backend ? child.pid : -child.pid, 'SIGKILL'); } catch {} errors.push('进程清理超时，请检查 Docker 测试容器与锁'); }
    }
    await Promise.all(handles.map(h => h.close()));
    try {
      const path = resolve(backend, 'test/reports/integration.json');
      if ((await stat(path)).mtimeMs >= startedAt) await writeFile(resolve(dir, 'backend-integration.json'), redact(await readFile(path, 'utf8')));
    } catch { /* The service may have failed before Jest generated a result. */ }
    process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop);
  }
  return { results, errors };
}
