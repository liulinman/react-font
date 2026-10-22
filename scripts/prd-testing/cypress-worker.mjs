import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { cloudOptions, redact, normalizeBatch } from './model.mjs';

const [root, runDir] = process.argv.slice(2);
const plan = JSON.parse(await readFile(resolve(runDir, 'plan.json'), 'utf8'));
const app = resolve(root, 'apps/english-world');
const require = createRequire(resolve(app, 'package.json'));
const cloud = cloudOptions(plan.cloud, process.env);
await mkdir(resolve(runDir, 'execution'), { recursive: true });
let outputs;
try {
  const result = await require('cypress').run({
    project: app, configFile: resolve(app, 'cypress.prd.config.ts'),
    spec: plan.suites.map(s => resolve(app, s.spec)), browser: 'electron', reporter: 'spec',
    record: cloud.record,
    ...(cloud.record ? { group: plan.modules.map(m => m.id).join('-'), ciBuildId: plan.id, tag: plan.modules.map(m => m.id).join(',') } : {}),
    config: { ...(cloud.projectId ? { projectId: cloud.projectId } : {}), baseUrl: 'http://127.0.0.1:13318', specPattern: plan.suites.map(s => s.spec), screenshotsFolder: resolve(runDir, 'screenshots'), videosFolder: resolve(runDir, 'videos'), video: cloud.record },
  });
  outputs = normalizeBatch(plan.suites, result, app, runDir);
  if (result.status === 'failed' || result.totalFailed || outputs.some(r => !r.tests.length) || (cloud.record && !result.runUrl)) process.exitCode = 1;
} catch (error) {
  outputs = plan.suites.map(s => ({ suite: s.id, evidence: s.evidence, artifact: `execution/${s.id}.json`, tests: [], error: error.message })); process.exitCode = 1;
}
for (const output of outputs) await writeFile(resolve(runDir, output.artifact), redact(JSON.stringify(output, null, 2)) + '\n');
