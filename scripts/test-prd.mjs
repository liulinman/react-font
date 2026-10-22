import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { resolve, relative } from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { buildPlan, cloudOptions, hash, inside, redact } from './prd-testing/model.mjs';
import { execute } from './prd-testing/execute.mjs';
import { renderReport, writeAnalysisPack } from './prd-testing/report.mjs';
import { loadCloudEnv } from './prd-testing/cloud-env.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const { values } = parseArgs({ options: { module: { type: 'string' }, all: { type: 'boolean' }, list: { type: 'boolean' }, plan: { type: 'boolean' }, cloud: { type: 'boolean' }, finalize: { type: 'string' }, help: { type: 'boolean' } } });
const revision = cwd => {
  try {
    const git = args => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    const status = git(['status', '--porcelain']);
    return { commit: git(['rev-parse', 'HEAD']), branch: git(['branch', '--show-current']), dirty: Boolean(status), changedFiles: status.split('\n').filter(Boolean), diffHash: hash(git(['diff', 'HEAD', '--binary'])) };
  } catch { return { unavailable: true }; }
};
try {
  await loadCloudEnv(root);
  if (values.help) {
    console.log('pnpm test:prd --module 阅读[,知识笔记] [--plan] [--cloud]\npnpm test:prd --all [--plan] [--cloud]\npnpm test:prd --list\npnpm test:prd --finalize test-results/prd/<run-id>\n退出码：0=执行与验收均通过（或计划完成），1=执行失败，2=验收覆盖不完整。');
  } else if (values.list) {
    const registry = JSON.parse(await readFile(resolve(root, 'docs/prd/index.json'), 'utf8'));
    for (const m of registry.modules) console.log(`${m.id}\t${m.name}\t需求基线：${m.baselineStatus}`);
  } else if (values.finalize) {
    const dir = inside(resolve(root, 'test-results/prd'), relative(resolve(root, 'test-results/prd'), resolve(root, values.finalize)));
    const run = JSON.parse(await readFile(resolve(dir, 'run.json'), 'utf8'));
    const plan = JSON.parse(await readFile(resolve(dir, 'plan.json'), 'utf8'));
    const execution = JSON.parse(await readFile(resolve(dir, 'execution.json'), 'utf8'));
    const result = await renderReport(dir, run, plan, execution.results, execution.errors);
    if (result.analysisStatus !== 'completed') throw new Error(`AI 分析未通过校验：${result.analysisError || '缺少 analysis.json'}`);
    console.log(`报告已更新：${resolve(dir, 'report.html')}`);
  } else {
    const id = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`;
    const dir = resolve(root, 'test-results/prd', id);
    const plan = { ...await buildPlan(root, values.module, values.all), id, all: Boolean(values.all), cloud: Boolean(values.cloud) };
    await mkdir(dir, { recursive: true });
    const run = { id, createdAt: new Date().toISOString(), frontend: revision(root), backend: revision(resolve(process.env.E2E_BACKEND_DIR || resolve(root, '../nestjs'))), cloudStatus: values.cloud ? '要求记录，尚未确认上传' : '未启用记录（可加 --cloud）', mode: values.plan ? 'plan' : 'execute' };
    await writeFile(resolve(dir, 'plan.json'), JSON.stringify(plan, null, 2) + '\n');
    await writeFile(resolve(dir, 'run.json'), JSON.stringify(run, null, 2) + '\n');
    console.log(`运行目录：${dir}`);
    console.log(`模块：${plan.modules.map(m => m.name).join('、')}；需求 ${plan.requirements.length}；Case ${plan.cases.length}；测试脚本 ${plan.suites.length}`);
    let execution = { results: [], errors: [] };
    if (!values.plan) {
      try {
        cloudOptions(plan.cloud);
        if (!plan.suites.length) throw new Error('没有可执行测试脚本');
        execution = await execute(root, dir, plan, suite => console.log(`执行：${suite}（日志见运行目录）`));
      } catch (error) { execution.errors.push(redact(error.message)); }
      run.finishedAt = new Date().toISOString();
      if (plan.cloud) run.cloudStatus = execution.results.length && execution.results.every(r => r.runUrl) ? '已返回云端运行链接' : '未完成 Cloud 上传';
    }
    await writeFile(resolve(dir, 'run.json'), JSON.stringify(run, null, 2) + '\n');
    await writeFile(resolve(dir, 'execution.json'), redact(JSON.stringify(execution, null, 2)) + '\n');
    await writeAnalysisPack(dir, run, plan, execution.results, execution.errors);
    const result = await renderReport(dir, run, plan, execution.results, execution.errors);
    console.log(`报告：${resolve(dir, 'report.html')}\n结果：${result.status}；需求待验证 ${result.counts.pending}；AI 分析待完成。`);
    if (!values.plan) process.exitCode = result.status === 'passed' ? 0 : result.status === 'failed' ? 1 : 2;
  }
} catch (error) { console.error(redact(error.message)); process.exitCode = 1; }
