import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';

export const hash = text => createHash('sha256').update(text).digest('hex');
export const sourceBundleHash = sources => hash(JSON.stringify(sources.map(s => ({ path: s.path, hash: hash(s.content) })).sort((a, b) => a.path.localeCompare(b.path))));
export async function featureSources(root, prd) {
  const base = resolve(root, 'docs/prd');
  const parent = resolve(inside(base, prd), '..');
  const sources = [];
  for (const name of (await readdir(parent)).sort()) {
    if (!['prd.md', 'addendum.md', 'interaction.md', '.decision-log.md'].includes(name)) continue;
    const path = relative(base, resolve(parent, name));
    sources.push({ path, content: await readFile(inside(base, path), 'utf8') });
  }
  return sources;
}
export function redact(text, secrets = [process.env.CYPRESS_RECORD_KEY, process.env.OPENAI_API_KEY, process.env.DEEPSEEK_API_KEY, process.env.PRD_AI_PROVIDER_KEY]) {
  let value = String(text);
  for (const secret of secrets.filter(Boolean)) value = value.split(secret).join('[REDACTED]');
  return value.replace(/(bearer\s+)[^\s,"'\\}]+/gi, '$1[REDACTED]')
    .replace(/(["']?(?:password|token|secret|recordKey)["']?\s*[=:]\s*["']?)[^\s,"'\\}]+/gi, '$1[REDACTED]');
}
export function selectModules(modules, selection, all = false) {
  if (all && selection) throw new Error('不能同时指定 --all 和 --module');
  if (all) return modules;
  if (!selection) throw new Error('请指定 --module <模块> 或 --all');
  const aliases = { '笔记': 'notes', '阅读': 'reading', '词库': 'vocabulary', '单词': 'vocabulary', '复习': 'review', '学习': 'review', '通知': 'notifications', '设置': 'settings', '账号': 'auth', '登录': 'auth', '单词册': 'word-books', '语境': 'context', 'Context Lab': 'context' };
  const ids = selection.split(/[,，]/).map(x => x.trim()).filter(Boolean).map(x => {
    const item = modules.find(m => m.id === x || m.name === x || m.id === aliases[x]);
    if (!item) throw new Error(`未知模块：${x}`);
    return item.id;
  });
  if (!ids.length) throw new Error('模块不能为空');
  return modules.filter(m => ids.includes(m.id));
}

// IDs in the source stay intact. Unnumbered normative paragraphs get content-based IDs.
export function extractRequirements(text, namespace) {
  const lines = text.split('\n');
  const rows = [];
  let heading = '', block = null;
  const add = (id, value, line) => rows.push({ id: `${namespace}/${id}`, text: value.trim(), line });
  const flush = () => { if (block) { add(block.id, block.lines.join('\n'), block.line); block = null; } };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const numbered = line.match(/^(?:#{1,6}\s*|[-*]\s*(?:\*\*)?|\|\s*)((?:FR|AC)-\d+)\b/);
    if (/^#{1,6}\s/.test(line)) {
      flush();
      if (numbered) block = { id: numbered[1], lines: [line], line: i + 1 };
      else heading = line.replace(/^#+\s*/, '');
      continue;
    }
    if (numbered && (/^\s*[-*|]/.test(line))) {
      flush();
      add(numbered[1], line.replace(/^\s*[-*]\s*/, ''), i + 1);
      continue;
    }
    if (block) { block.lines.push(line); continue; }
    if (/验收|功能要求|功能需求|质量|兼容|非功能|权限|字段规则|统计口径|实施细化|覆盖修订/.test(heading) && line.trim() && !/^\|\s*[-:]+/.test(line)) {
      add(`REQ-${hash(`${heading}\n${line.trim()}`).slice(0, 10)}`, line, i + 1);
    }
  }
  flush();
  if (new Set(rows.map(x => x.id)).size !== rows.length) throw new Error(`重复需求编号：${namespace}`);
  return rows;
}
export function cloudOptions(enabled, env = process.env) {
  if (!enabled) return { record: false };
  for (const key of ['CYPRESS_PROJECT_ID', 'CYPRESS_RECORD_KEY']) if (!env[key]) throw new Error(`Cloud 未连接：缺少 ${key}`);
  return { record: true, projectId: env.CYPRESS_PROJECT_ID };
}
export function normalizeBatch(suites, raw, app, dir) {
  const pathOf = run => run.spec?.absolute || resolve(app, run.spec?.relative || '');
  for (const run of raw.runs ?? []) if (!suites.some(s => resolve(app, s.spec) === pathOf(run))) throw new Error('Cypress 返回计划外的 spec');
  return suites.map(suite => {
    const run = (raw.runs ?? []).find(r => pathOf(r) === resolve(app, suite.spec));
    return {
      suite: suite.id, evidence: suite.evidence, artifact: `execution/${suite.id}.json`, runUrl: raw.runUrl || null,
      tests: (run?.tests ?? []).map(t => ({ title: t.title.join(' > '), state: t.state, error: t.displayError || t.attempts?.at(-1)?.error?.message || null, attempts: t.attempts?.length ?? 0 })),
      screenshots: (run?.screenshots ?? []).map(s => relative(dir, s.path)),
      error: !run ? raw.message || '没有当前 spec 的执行结果' : run.error || (raw.status === 'failed' ? raw.message || 'Cypress 运行未完成' : null),
      startedAt: run?.stats?.startedAt, endedAt: run?.stats?.endedAt,
    };
  });
}
export function inside(root, path) {
  const target = resolve(root, path);
  const rel = relative(root, target);
  if (rel === '..' || rel.startsWith(`..${sep}`) || rel.startsWith(sep)) throw new Error(`路径超出目录：${path}`);
  return target;
}
export async function buildPlan(root, selection, all) {
  const registry = JSON.parse(await readFile(resolve(root, 'docs/prd/index.json'), 'utf8'));
  const modules = selectModules(registry.modules, selection, all);
  const ids = modules.map(x => x.id);
  const features = registry.features.filter(f => [f.primaryModule, ...f.relatedModules].some(id => ids.includes(id)));
  const sources = [], requirements = [], cases = [];
  const sourcePaths = new Set(['index.json', ...modules.map(m => m.entry)]);
  for (const feature of features) {
    sourcePaths.add(feature.prd);
    const parent = resolve(root, 'docs/prd', feature.prd, '..');
    for (const name of await readdir(parent)) if (name.endsWith('.md')) sourcePaths.add(relative(resolve(root, 'docs/prd'), resolve(parent, name)));
    const bundle = await featureSources(root, feature.prd);
    const text = bundle.find(s => s.path === feature.prd).content;
    const sourceHash = sourceBundleHash(bundle);
    requirements.push(...extractRequirements(text, `${feature.primaryModule}/${feature.id}`).map(r => ({ ...r, feature: feature.id, source: `docs/prd/${feature.prd}`, sourceHash })));
    try {
      const doc = JSON.parse(await readFile(resolve(root, `docs/testing/cases/${feature.primaryModule}/${feature.id}.json`), 'utf8'));
      cases.push(...doc.cases.map(c => ({ ...c, sourceHash: doc.sourceHash })));
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  for (const path of sourcePaths) {
    const content = await readFile(inside(resolve(root, 'docs/prd'), path), 'utf8');
    sources.push({ path: `docs/prd/${path}`, hash: hash(content), content });
  }
  const catalog = JSON.parse(await readFile(resolve(root, 'docs/testing/suites.json'), 'utf8'));
  const boundSuites = new Set(cases.flatMap(c => (c.bindings ?? []).map(b => b.suite)));
  const suites = catalog.suites.filter(s => s.modules.some(id => ids.includes(id)) || boundSuites.has(s.id));
  if (new Set(suites.map(s => s.id)).size !== suites.length) throw new Error('重复 suite ID');
  if (new Set(cases.map(c => c.id)).size !== cases.length) throw new Error('重复 Case ID');
  for (const suite of suites) {
    if (!/^[a-z0-9-]+$/.test(suite.id)) throw new Error('非法 suite ID');
    if (!/^cypress\/(?:e2e|integration)\/.+\.cy\.ts$/.test(suite.spec)) throw new Error('测试入口必须来自 Cypress 源码目录');
    await readFile(inside(root, `apps/english-world/${suite.spec}`));
  }
  const scope = new Set(requirements.map(r => r.id));
  for (const c of cases) {
    if (!['draft', 'ready'].includes(c.status)) throw new Error(`Case 状态必须为 draft 或 ready：${c.id}`);
    if (!c.steps?.length || !c.expectedResults?.length || !c.preconditions?.length || !c.cleanup) throw new Error(`Case 缺少步骤、预期、前置条件或清理：${c.id}`);
    if (!c.requirementIds?.length || c.requirementIds.some(id => !scope.has(id))) throw new Error(`Case 引用了不存在的需求：${c.id}`);
    for (const b of c.bindings ?? []) if (!b.title || !suites.some(s => s.id === b.suite)) throw new Error(`Case 引用了未选择的 suite 或缺标题：${c.id}/${b.suite}`);
  }
  return { modules, features, requirements, cases, sources, suites };
}
export function assess(plan, results = [], errors = []) {
  errors = [...new Set([...errors, ...results.filter(r => r.error).map(r => `${r.suite}: ${r.error}`)])];
  const failures = results.flatMap(r => (r.tests ?? []).filter(t => t.state === 'failed').map(t => ({ ...t, suite: r.suite, artifact: r.artifact })));
  const rows = plan.requirements.map(req => {
    const matches = plan.cases.filter(c => c.requirementIds.includes(req.id));
    const bindings = matches.flatMap(c => c.bindings ?? []);
    let reason = !matches.length ? '缺少 Case' : matches.some(c => c.sourceHash !== req.sourceHash) ? 'PRD 已变化，Case 待 AI 更新' : matches.some(c => c.status !== 'ready') ? 'Case 待 AI 细化与审查' : matches.some(c => !c.bindings?.length) ? 'Case 待实现自动化脚本' : '';
    const evidence = [];
    let failed = false;
    if (!reason) for (const b of bindings) {
      const run = results.find(r => r.suite === b.suite);
      const tests = run?.tests?.filter(t => t.title === b.title) ?? [];
      if (tests.some(t => t.state === 'failed')) failed = true;
      if (tests.length !== 1 || tests[0].state !== 'passed' || run.error || run.evidence !== 'real' || !run.artifact) reason ||= '缺少真实成功执行证据（含运行异常、跳过、mock 或名称未匹配）';
      if (tests.length) evidence.push({ suite: b.suite, title: b.title, artifact: run.artifact, level: run.evidence });
    }
    return { ...req, caseIds: matches.map(c => c.id), status: failed ? 'failed' : reason ? 'pending' : 'passed', reason, evidence };
  });
  const gaps = plan.modules.filter(m => m.baselineStatus !== 'complete').map(m => `${m.name}：需求基线${m.baselineStatus === 'missing' ? '缺失' : '尚不完整'}`);
  const empty = !results.length || results.some(r => !(r.tests?.length));
  const status = failures.length || errors.length || rows.some(r => r.status === 'failed') ? 'failed' : gaps.length || empty || !rows.length || rows.some(r => r.status !== 'passed') ? 'incomplete' : 'passed';
  return { status, rows, failures, gaps, errors, counts: { passed: rows.filter(r => r.status === 'passed').length, failed: rows.filter(r => r.status === 'failed').length, pending: rows.filter(r => r.status === 'pending').length }, tests: { passed: results.flatMap(r => r.tests ?? []).filter(t => t.state === 'passed').length, failed: failures.length, skipped: results.flatMap(r => r.tests ?? []).filter(t => !['passed', 'failed'].includes(t.state)).length } };
}
