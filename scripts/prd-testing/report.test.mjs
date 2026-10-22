import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { renderReport, writeAnalysisPack } from './report.mjs';
import { buildPlan } from './model.mjs';
import { fileURLToPath } from 'node:url';

const plan = { modules: [{ id: 'notes', name: '知识笔记', baselineStatus: 'partial' }], requirements: [{ id: 'notes/x/AC-1', text: '<script>alert(1)</script>', sourceHash: 'h' }], cases: [] };
test('report survives zero tests and archives analysis input without claiming pass', async () => {
  const dir = await mkdtemp(resolve(tmpdir(), 'prd-report-'));
  try {
    const run = { id: 'current', cloudStatus: '未连接' };
    await writeAnalysisPack(dir, run, plan, [], ['启动失败']);
    const result = await renderReport(dir, run, plan, [], ['启动失败']);
    assert.equal(result.status, 'failed');
    assert.equal(result.analysisStatus, 'pending');
    const html = await readFile(resolve(dir, 'report.html'), 'utf8');
    assert.ok(html.includes('&lt;script&gt;'));
    assert.ok(!html.includes('<script>alert(1)</script>'));
    assert.ok((await readFile(resolve(dir, 'analysis-input.json'), 'utf8')).includes('启动失败'));
    await writeFile(resolve(dir, 'analysis.json'), JSON.stringify({ runId: 'current', findings: [{ category: 'environment', conclusion: '启动失败证据已调查', nextStep: '修复配置再跑', evidence: ['../outside'] }] }));
    assert.equal((await renderReport(dir, run, plan, [], ['启动失败'])).analysisStatus, 'pending');
    await writeFile(resolve(dir, 'analysis.json'), JSON.stringify({ runId: 'current', findings: [{ category: 'environment', conclusion: '证据不足，未作产品根因判断', nextStep: '检查启动日志', evidence: ['analysis-input.json'] }] }));
    const final = await renderReport(dir, run, plan, [], ['启动失败']);
    assert.equal(final.analysisStatus, 'completed');
    assert.equal(final.status, 'failed');
  } finally { await rm(dir, { recursive: true, force: true }); }
});
test('real project selects all source specs once and closes cross-module Case dependencies', async () => {
  const root = fileURLToPath(new URL('../..', import.meta.url));
  const all = await buildPlan(root, null, true);
  assert.equal(all.modules.length, 9);
  assert.equal(new Set(all.suites.map(s => s.spec)).size, all.suites.length);
  assert.ok(all.requirements.length > 100);
  assert.ok(all.suites.every(s => /^cypress\/(e2e|integration)\//.test(s.spec)));
  const selected = await buildPlan(root, '词库', false);
  assert.ok(selected.suites.some(s => s.id === 'prd-notes'));
});
