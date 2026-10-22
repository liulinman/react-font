import test from 'node:test';
import assert from 'node:assert/strict';
import { selectModules, extractRequirements, assess, redact, cloudOptions, sourceBundleHash, normalizeBatch } from './model.mjs';

const modules = [{ id: 'notes', name: '知识笔记', baselineStatus: 'complete' }, { id: 'reading', name: '阅读练习', baselineStatus: 'complete' }];
test('Chinese selection, multi-module deduplication and all', () => {
  assert.deepEqual(selectModules(modules, '知识笔记,reading,notes').map(x => x.id), ['notes', 'reading']);
  assert.equal(selectModules(modules, null, true).length, 2);
  assert.throws(() => selectModules(modules, 'typo'), /未知模块/);
  assert.throws(() => selectModules(modules, 'notes', true), /同时/);
});
test('extract table ACs, heading FR bodies, plain ACs and unnumbered acceptance', () => {
  const rows = extractRequirements('# PRD\n#### FR-1：恢复\n刷新后恢复全部字段。\n## 验收\n| AC-01 | 刷新保留 |\n- AC-02：跨用户拒绝。\n- 删除后正文保留。\n', 'notes/folders');
  assert.equal(rows.length, 4);
  assert.match(rows[0].text, /全部字段/);
  assert.equal(rows[1].id, 'notes/folders/AC-01');
  assert.equal(new Set(rows.map(x => x.id)).size, 4);
});
const requirement = { id: 'notes/x/AC-01', sourceHash: 'current' };
test('references to FR IDs in metrics do not create duplicate requirements', () => {
  const rows = extractRequirements('#### FR-1：恢复\n真实正文\n## 成功指标\n- **SM-1** 验证 FR-1。\n', 'review/repair');
  assert.equal(rows.length, 1);
});
const binding = { suite: 'notes', title: 'creates note', evidence: 'real' };
const item = { id: 'CASE-1', status: 'ready', requirementIds: [requirement.id], sourceHash: 'current', bindings: [binding] };
const results = [{ suite: 'notes', tests: [{ title: 'creates note', state: 'passed' }], evidence: 'real', artifact: 'execution/notes.json' }];
test('complete real evidence passes; no tests and partial baseline do not', () => {
  assert.equal(assess({ modules: [modules[0]], requirements: [requirement], cases: [item] }, results).status, 'passed');
  assert.equal(assess({ modules: [modules[0]], requirements: [requirement], cases: [item] }, []).status, 'incomplete');
  assert.equal(assess({ modules: [{ ...modules[0], baselineStatus: 'partial' }], requirements: [requirement], cases: [item] }, results).status, 'incomplete');
});
test('mock, stale cases, skipped tests and missing bindings cannot certify PRD', () => {
  const plan = { modules: [modules[0]], requirements: [requirement], cases: [item] };
  assert.equal(assess(plan, [{ ...results[0], evidence: 'mock' }]).status, 'incomplete');
  assert.equal(assess({ ...plan, cases: [{ ...item, sourceHash: 'old' }] }, results).status, 'incomplete');
  assert.equal(assess(plan, [{ ...results[0], tests: [{ title: 'creates note', state: 'pending' }] }]).status, 'incomplete');
  assert.equal(assess({ ...plan, cases: [] }, results).status, 'incomplete');
});
test('a failure remains failure even if coverage is missing', () => {
  const r = assess({ modules, requirements: [requirement], cases: [] }, [{ suite: 'x', tests: [{ title: 'fails', state: 'failed', error: 'expected true' }], artifact: 'execution/x.json' }]);
  assert.equal(r.status, 'failed');
  assert.equal(r.failures.length, 1);
});
test('missing or misspelled ready status and mixed evidence cannot pass', () => {
  for (const status of [undefined, 'read', 'draft']) {
    assert.equal(assess({ modules: [modules[0]], requirements: [requirement], cases: [{ ...item, status }] }, results).status, 'incomplete');
  }
  assert.equal(assess({ modules: [modules[0]], requirements: [requirement], cases: [item] }, [{ ...results[0], evidence: 'mixed' }]).status, 'incomplete');
});
test('Cloud requires both credentials and key never appears in options', () => {
  assert.throws(() => cloudOptions(true, {}), /CYPRESS_PROJECT_ID/);
  assert.throws(() => cloudOptions(true, { CYPRESS_PROJECT_ID: 'abc123' }), /CYPRESS_RECORD_KEY/);
  assert.deepEqual(cloudOptions(false, {}), { record: false });
  assert.deepEqual(cloudOptions(true, { CYPRESS_PROJECT_ID: 'abc123', CYPRESS_RECORD_KEY: 'secret' }), { record: true, projectId: 'abc123' });
});
test('redacts credentials and escapes secrets containing regex characters', () => {
  assert.equal(redact('key=a.b+c bearer abc', ['a.b+c']), 'key=[REDACTED] bearer [REDACTED]');
});
test('changing a decision supplement invalidates the Case source bundle', () => {
  assert.notEqual(sourceBundleHash([{ path: 'prd.md', content: 'same PRD' }, { path: '.decision-log.md', content: 'old' }]), sourceBundleHash([{ path: 'prd.md', content: 'same PRD' }, { path: '.decision-log.md', content: 'new' }]));
});
test('credential redaction preserves JSON structure and covers quoted fields', () => {
  const value = JSON.parse(redact(JSON.stringify({ error: 'cookie token=abc', password: 'private', auth: 'Bearer xyz' }), []));
  assert.equal(value.error, 'cookie token=[REDACTED]');
  assert.equal(value.password, '[REDACTED]');
  assert.equal(value.auth, 'Bearer [REDACTED]');
});
test('one Cypress batch maps each actual spec to its own evidence and keeps missing specs pending', () => {
  const suites = [{ id: 'a', spec: 'cypress/e2e/a.cy.ts', evidence: 'real' }, { id: 'b', spec: 'cypress/e2e/b.cy.ts', evidence: 'mock' }];
  const raw = { runUrl: 'https://cloud.cypress.io/projects/x/runs/1', runs: [{ spec: { absolute: '/app/cypress/e2e/a.cy.ts' }, tests: [{ title: ['A', 'works'], state: 'passed', attempts: [] }], screenshots: [] }] };
  const rows = normalizeBatch(suites, raw, '/app', '/report');
  assert.equal(rows[0].tests[0].title, 'A > works');
  assert.equal(rows[0].runUrl, raw.runUrl);
  assert.equal(rows[1].tests.length, 0);
  assert.ok(rows[1].error);
  assert.throws(() => normalizeBatch([], raw, '/app', '/report'), /计划外/);
});
test('a spec-level runtime error survives normalization and cannot certify its passed tests', () => {
  const normalized = normalizeBatch([{ id: 'notes', spec: 'cypress/integration/notes.cy.ts', evidence: 'real' }], { runs: [{ spec: { absolute: '/app/cypress/integration/notes.cy.ts' }, tests: [{ title: ['creates note'], state: 'passed' }], error: 'Browser disconnected' }] }, '/app', '/report');
  assert.equal(normalized[0].error, 'Browser disconnected');
  const result = assess({ modules: [modules[0]], requirements: [requirement], cases: [item] }, normalized);
  assert.notEqual(result.rows[0].status, 'passed');
  assert.equal(result.status, 'failed');
});
