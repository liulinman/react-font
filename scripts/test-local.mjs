import { spawn, execFileSync } from 'node:child_process';
import { mkdir, open, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';

const root = fileURLToPath(new URL('..', import.meta.url));
const backend = resolve(process.env.E2E_BACKEND_DIR || resolve(root, '../nestjs'));
const app = resolve(root, 'apps/english-world');
const reports = resolve(app, 'cypress/reports/integration');
const children = [];
const handles = [];
let cleanupPromise;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
function start(command, args, cwd, stdio = 'inherit') {
  if (cleanupPromise) throw new Error('Test run interrupted');
  const child = spawn(command, args, { cwd, stdio, detached: true,
    env: { ...process.env, E2E_BACKEND_DIR: backend } });
  child.on('error', (error) => { child.startError = error; });
  children.push(child);
  return child;
}
async function waitFor(url, child) {
  for (let attempt = 0; attempt < 240; attempt++) {
    if (child.startError || child.exitCode !== null || child.signalCode !== null) throw new Error(`Service exited; see ${reports}`);
    try { if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) return; } catch {}
    await pause(1000);
  }
  throw new Error(`Timed out waiting for ${url}`);
}
async function freePort(port) {
  await new Promise((accept, reject) => {
    const server = net.createServer();
    server.once('error', () => reject(new Error(`Port ${port} is occupied; stop the other test run first`)));
    server.listen(port, '127.0.0.1', () => server.close(accept));
  });
}
function cleanup() {
  if (cleanupPromise) return cleanupPromise;
  cleanupPromise = (async () => {
  for (const child of [...children].reverse()) {
    const target = child === children[0] ? child.pid : -child.pid;
    const alive = () => { try { process.kill(target, 0); return true; } catch { return false; } };
    // Backend runner owns its process tree and Docker teardown.
    try { process.kill(target, 'SIGTERM'); } catch {}
    for (let i = 0; i < 150 && alive(); i++) await pause(100);
    if (alive()) { try { process.kill(target, 'SIGKILL'); } catch {} }
  }
  for (const handle of handles) await handle.close();
  })();
  return cleanupPromise;
}
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await cleanup(); process.exit(130); });
try {
  await freePort(13317); await freePort(13318);
  await mkdir(reports, { recursive: true });
  const revision = (cwd) => ({
    commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' }).trim(),
    dirty: Boolean(execFileSync('git', ['status', '--porcelain'], { cwd, encoding: 'utf8' }).trim()),
  });
  await writeFile(resolve(reports, 'revisions.json'), JSON.stringify({ frontend: revision(root), backend: revision(backend), time: new Date().toISOString() }, null, 2));
  for (const name of ['backend.log', 'frontend.log']) handles.push(await open(resolve(reports, name), 'w'));
  const server = start('node', ['scripts/test-local.mjs', '--serve'], backend, ['ignore', handles[0].fd, handles[0].fd]);
  console.log('Starting MySQL, backend integration tests and NestJS. Logs:', reports);
  await waitFor('http://127.0.0.1:13317/__automation/ready', server);
  const vite = start('pnpm', ['exec', 'vite', '--config', 'vite.integration.config.ts'], app, ['ignore', handles[1].fd, handles[1].fd]);
  await waitFor('http://127.0.0.1:13318', vite);
  const cypress = start('pnpm', ['exec', 'cypress', 'run', '--config-file', 'cypress.integration.config.ts'], app);
  const code = await new Promise((accept, reject) => { cypress.once('exit', accept); cypress.once('error', reject); });
  if (code !== 0) throw new Error(`Cypress failed (${code}); report: ${reports}`);
  console.log('Backend integration + browser E2E passed. HTML report:', resolve(reports, 'html/index.html'));
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { await cleanup(); }
