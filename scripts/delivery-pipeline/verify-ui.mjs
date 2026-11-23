// Focused synthetic UI checks; real controller/permissions run separately in Jest.
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import {
  buildPlan,
  normalizeBatch,
  redact,
  cloudOptions,
} from "../prd-testing/model.mjs";
import { loadCloudEnv } from "../prd-testing/cloud-env.mjs";
import { renderReport, writeAnalysisPack } from "../prd-testing/report.mjs";
const root = fileURLToPath(new URL("../../", import.meta.url));
await loadCloudEnv(root);
const cloud = cloudOptions(true, process.env);
const id = new Date().toISOString().replace(/[:.]/g, "-") + "-pipeline-ui";
const dir = resolve(root, "test-results/prd", id);
await mkdir(resolve(dir, "execution"), { recursive: true });
const all = await buildPlan(root, "settings");
const plan = {
  ...all,
  id,
  cloud: true,
  all: false,
  scope:
    "settings/prd-browser AC-06–10, synthetic UI only; permissions verified separately",
  features: all.features.filter((f) => f.id === "prd-browser"),
  requirements: all.requirements.filter((r) =>
    /^settings\/prd-browser\/(FR-0[6-9]|AC-(0[6-9]|10))$/.test(r.id),
  ),
  cases: all.cases.filter((c) => c.id.startsWith("settings/prd-browser/")),
  suites: all.suites.filter((s) => s.id === "delivery-pipeline"),
};
const version = (path) => ({
  commit: execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: path,
    encoding: "utf8",
  }).trim(),
  dirty: !!execFileSync("git", ["status", "--porcelain"], {
    cwd: path,
    encoding: "utf8",
  }).trim(),
});
const run = {
  id,
  createdAt: new Date().toISOString(),
  frontend: version(root),
  backend: version(resolve(root, "../nestjs")),
  mode: "execute",
  cloudStatus: "待上传",
};
await writeFile(resolve(dir, "plan.json"), JSON.stringify(plan, null, 2));
await writeFile(resolve(dir, "run.json"), JSON.stringify(run, null, 2));
console.log("Focused UI run: " + dir);
const app = resolve(root, "apps/english-world");
const require = createRequire(resolve(app, "package.json"));
const result = await require("cypress").run({
  project: app,
  configFile: resolve(app, "cypress.config.ts"),
  spec: plan.suites.map((s) => resolve(app, s.spec)),
  browser: "electron",
  reporter: "spec",
  record: cloud.record,
  group: "delivery-pipeline-ui",
  ciBuildId: id,
  tag: "synthetic-ui",
  config: {
    baseUrl: "http://127.0.0.1:5176",
    supportFile: false,
    projectId: cloud.projectId,
    screenshotsFolder: resolve(dir, "screenshots"),
    videosFolder: resolve(dir, "videos"),
    video: true,
  },
});
const results = normalizeBatch(plan.suites, result, app, dir);
const errors = !result.runUrl ? ["Cloud 未返回运行链接"] : [];
for (const r of results)
  await writeFile(resolve(dir, r.artifact), redact(JSON.stringify(r, null, 2)));
run.finishedAt = new Date().toISOString();
run.cloudStatus = result.runUrl ? "已返回云端运行链接" : "未完成上传";
await writeFile(resolve(dir, "run.json"), JSON.stringify(run, null, 2));
await writeFile(
  resolve(dir, "execution.json"),
  JSON.stringify({ results, errors }, null, 2),
);
await writeAnalysisPack(dir, run, plan, results, errors);
await renderReport(dir, run, plan, results, errors);
console.log(
  JSON.stringify({
    id,
    runUrl: result.runUrl,
    passed: result.totalPassed,
    failed: result.totalFailed,
    errors,
  }),
);
if (result.totalFailed || errors.length) process.exitCode = 1;
