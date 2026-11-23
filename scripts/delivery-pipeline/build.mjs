import {
  readFile,
  readdir,
  realpath,
  lstat,
  mkdir,
  writeFile,
  rename,
  mkdtemp,
  rm,
} from "node:fs/promises";
import { resolve, sep, dirname, extname } from "node:path";
import { redact } from "../prd-testing/model.mjs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
const hash = (value) => createHash("sha256").update(value).digest("hex");
export async function safeRead(root, path, binary = false) {
  if (
    typeof path !== "string" ||
    path.startsWith("/") ||
    path.includes("\\") ||
    path.split("/").some((p) => !p || p === "." || p === "..")
  )
    throw new Error("Unsafe artifact path");
  const base = await realpath(root);
  let current = base;
  for (const part of path.split("/")) {
    current = resolve(current, part);
    if ((await lstat(current)).isSymbolicLink())
      throw new Error("Symbolic artifact path");
  }
  const target = await realpath(current);
  if (!target.startsWith(base + sep)) throw new Error("Artifact outside root");
  return readFile(target, binary ? undefined : "utf8");
}
const clean = (value) =>
  redact(String(value ?? ""))
    .replace(/ew_mcp_[\w-]+/g, "[redacted]")
    .replace(/Bearer\s+[\w.\-]+/gi, "Bearer [redacted]");
const strings = (value) => (Array.isArray(value) ? value.map(clean) : []);
async function json(root, path, fallback = null) {
  try {
    return JSON.parse(await safeRead(root, path));
  } catch (e) {
    if (e.code === "ENOENT") return fallback;
    throw e;
  }
}
async function files(root, path, extension) {
  let entries;
  try {
    entries = await readdir(resolve(root, path), { withFileTypes: true });
  } catch (e) {
    if (e.code === "ENOENT") return [];
    throw e;
  }
  const out = [];
  for (const e of entries) {
    if (e.isSymbolicLink()) throw new Error("Symbolic artifact directory");
    if (e.isDirectory())
      out.push(...(await files(root, path + "/" + e.name, extension)));
    else if (e.name.endsWith(extension)) out.push(path + "/" + e.name);
  }
  return out.sort();
}
const cloud = (value) => {
  try {
    const u = new URL(value);
    return u.protocol === "https:" &&
      u.hostname === "cloud.cypress.io" &&
      !u.username &&
      !u.password
      ? u.href
      : null;
  } catch {
    return null;
  }
};
export async function buildPipeline(root, { assetRoot } = {}) {
  const index = await json(root, "docs/prd/index.json");
  const deliveries = await json(root, "docs/delivery/index.json", {
    deliveries: [],
  });
  const casePaths = await files(root, "docs/testing/cases", ".json");
  const allCases = (
    await Promise.all(casePaths.map((p) => json(root, p)))
  ).flatMap((d) => d?.cases || []);
  const changes = [];
  for (const ref of deliveries.deliveries) {
    const p =
      typeof ref.deliveryRef === "string"
        ? ref.deliveryRef
        : ref.deliveryRef?.path;
    if (p) {
      const d = await json(root, p);
      if (d) changes.push(d);
    }
  }
  const runPaths = await files(root, "test-results/prd", "result.json");
  const runs = [];
  for (const p of runPaths) {
    if (!/^test-results\/prd\/[^/]+\/result\.json$/.test(p)) continue;
    const data = await json(root, p);
    const base = dirname(p);
    const manifest = await json(root, base + "/run-manifest.json", {});
    const plan = await json(root, base + "/plan.json", {});
    runs.push({ data, manifest, plan, base });
  }
  const features = [];
  for (const f of index.features) {
    const id = f.primaryModule + "/" + f.id,
      prdPath = "docs/prd/" + f.prd;
    const content = await safeRead(root, prdPath);
    const prdHash = hash(content);
    const specs = [];
    for (const d of changes.filter((d) => d.featureId === id))
      for (const a of d.artifacts || []) {
        if (
          a.type !== "spec" ||
          a.locator?.repository !== "react-font" ||
          !/^specs\/[^/]+\/spec\.md$/.test(a.locator.path)
        )
          continue;
        if (specs.some((s) => s.path === a.locator.path)) continue;
        try {
          const body = await safeRead(root, a.locator.path);
          const trace = await json(
            root,
            dirname(a.locator.path) + "/traceability.json",
            {},
          );
          specs.push({
            path: a.locator.path,
            sha256: hash(body),
            content: clean(body),
            revision: clean(a.revision),
            stale:
              a.sha256 !== hash(body) ||
              trace.sources?.some(
                (s) => s.path === prdPath && s.sha256 !== prdHash,
              ) ||
              false,
            links: (trace.links || []).map((l) => ({
              requirement: clean(l.requirement),
              scenario: clean(l.scenario),
              manualRequired: !!l.manualRequired,
              caseIds: (l.cases || []).map((c) => clean(c.id)),
            })),
          });
        } catch (e) {
          if (e.code !== "ENOENT") throw e;
        }
      }
    const cases = allCases
      .filter((c) => c.id?.startsWith(id + "/"))
      .map((c) => ({
        id: clean(c.id),
        title: clean(c.title),
        status: clean(c.status),
        requirementIds: strings(c.requirementIds),
        steps: strings(c.steps),
        expectedResults: strings(c.expectedResults),
        bindings: (c.bindings || []).map((b) => ({
          suite: clean(b.suite),
          title: clean(b.title),
        })),
      }));
    const featureRuns = [];
    for (const { data, manifest, plan, base } of runs) {
      const rows = (data.rows || []).filter((row) =>
        row.id?.startsWith(id + "/"),
      );
      if (!rows.length) continue;
      const frozenSources = (plan.sources || []).filter((s) =>
        s.path.startsWith(dirname(prdPath) + "/"),
      );
      const frozen = (plan.sources || []).find((s) => s.path === prdPath)?.hash;
      let freshness = frozen ? "current" : "unknown";
      const currentPaths = (await readdir(resolve(root, dirname(prdPath))))
        .filter((n) => n.endsWith(".md"))
        .map((n) => dirname(prdPath) + "/" + n);
      if (
        frozen &&
        currentPaths.some((path) => !frozenSources.some((s) => s.path === path))
      )
        freshness = "stale";
      for (const source of frozenSources) {
        try {
          if (hash(await safeRead(root, source.path)) !== source.hash)
            freshness = "stale";
        } catch (e) {
          if (e.code === "ENOENT") freshness = "stale";
          else throw e;
        }
      }
      const historicalCases = (plan.cases || [])
        .filter((c) => c.id?.startsWith(id + "/"))
        .map((c) => ({
          id: clean(c.id),
          title: clean(c.title),
          status: clean(c.status),
          requirementIds: strings(c.requirementIds),
          steps: strings(c.steps),
          expectedResults: strings(c.expectedResults),
          bindings: (c.bindings || []).map((b) => ({
            suite: clean(b.suite),
            title: clean(b.title),
          })),
        }));
      const runId = clean(data.id || base.split("/").pop());
      const suites = new Set(
        historicalCases.flatMap((c) => c.bindings.map((b) => b.suite)),
      );
      const results = (data.results || []).filter((s) => suites.has(s.suite));
      const images = [];
      for (const s of results)
        for (const img of s.screenshots || []) {
          if (
            !img.startsWith("screenshots/") ||
            ![".png", ".webp"].includes(extname(img))
          )
            continue;
          try {
            const bytes = await safeRead(root, base + "/" + img, true);
            const name = hash(bytes) + extname(img);
            if (assetRoot) {
              await mkdir(assetRoot, { recursive: true });
              await writeFile(resolve(assetRoot, name), bytes);
            }
            images.push({
              name: clean(img.split("/").pop()),
              path: "pipeline-evidence/" + name,
            });
          } catch (e) {
            if (e.code !== "ENOENT") throw e;
          }
        }
      featureRuns.push({
        id: runId,
        createdAt: clean(data.createdAt),
        status: rows.some((r) => r.status === "failed")
          ? "failed"
          : rows.some((r) => r.status === "blocked")
            ? "blocked"
            : rows.every((r) => r.status === "passed")
              ? "passed"
              : "incomplete",
        overallStatus: clean(data.status || "unknown"),
        executionIssues: strings(data.errors),
        sourceHashes: frozenSources.map((s) => ({
          path: s.path,
          hash: s.hash,
        })),
        freshness,
        prdSha256: frozen || null,
        cases: historicalCases,
        specVersion: "unknown",
        rerunOf: clean(manifest.rerunOf) || null,
        codeVersions: ["frontend", "backend"].map((k) => ({
          repository: k,
          commit: clean(data[k]?.commit),
          dirty: !!data[k]?.dirty,
        })),
        cloudUrls: [
          ...new Set(
            [manifest.cloudUrl, ...results.map((s) => s.runUrl)]
              .map(cloud)
              .filter(Boolean),
          ),
        ],
        rows: rows.map((row) => ({
          id: clean(row.id),
          text: clean(row.text),
          status: clean(row.status),
          reason: clean(row.reason),
          caseIds: strings(row.caseIds),
        })),
        tests: results.flatMap((s) =>
          (s.tests || []).map((t) => ({
            suite: clean(s.suite),
            title: clean(t.title),
            state: clean(t.state),
            evidence: clean(s.evidence),
            error: clean(t.error?.message || t.error),
          })),
        ),
        analysis: (data.analysis?.findings || []).map((a) => ({
          category: clean(a.category),
          conclusion: clean(a.conclusion),
          nextStep: clean(a.nextStep),
        })),
        images,
      });
    }
    // An explicit reference without readable results remains visible as a gap.
    for (const d of changes.filter((d) => d.featureId === id))
      for (const ref of d.runRefs || [])
        if (!featureRuns.some((r) => r.id === ref.runId))
          featureRuns.push({
            id: clean(ref.runId),
            createdAt: "",
            status: "missing",
            freshness: "missing",
            prdSha256: null,
            cases: [],
            specVersion: "unknown",
            rerunOf: null,
            codeVersions: [],
            cloudUrls: [],
            rows: [],
            tests: [],
            analysis: [],
            images: [],
          });
    featureRuns.sort(
      (a, b) =>
        b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id),
    );
    features.push({
      id,
      moduleId: f.primaryModule,
      title: clean(f.title),
      prd: {
        path: prdPath,
        sha256: prdHash,
        route: f.prd.replace(/\.md$/, ".html"),
      },
      specs,
      cases,
      runs: featureRuns,
    });
  }
  return {
    schemaVersion: 1,
    modules: index.modules.map((m) => ({ id: m.id, name: clean(m.name) })),
    features,
  };
}
export async function mergeArchive(root, current, prior) {
  if (!prior) return current;
  for (const feature of current.features) {
    const old = prior.features.find((f) => f.id === feature.id);
    if (!old) continue;
    for (const previous of old.runs) {
      const next = feature.runs.find((r) => r.id === previous.id);
      if (!next || next.status === "missing") {
        if (next) feature.runs = feature.runs.filter((r) => r !== next);
        const saved = structuredClone(previous);
        const sources = saved.sourceHashes || [];
        saved.freshness = saved.prdSha256
          ? saved.prdSha256 === feature.prd.sha256
            ? "current"
            : "stale"
          : "unknown";
        for (const source of sources) {
          try {
            if (hash(await safeRead(root, source.path)) !== source.hash)
              saved.freshness = "stale";
          } catch (e) {
            if (e.code === "ENOENT") saved.freshness = "stale";
            else throw e;
          }
        }
        feature.runs.push(saved);
      } else {
        const digest = (r) =>
          hash(JSON.stringify({ rows: r.rows, tests: r.tests }));
        if (digest(previous) !== digest(next)) {
          const saved = {
            ...previous,
            id: previous.id + "@" + digest(previous).slice(0, 12),
          };
          if (!feature.runs.some((r) => r.id === saved.id))
            feature.runs.push(saved);
        }
        // Keep already archived media even after local runner cleanup.
        for (const image of previous.images || [])
          if (!next.images.some((i) => i.path === image.path))
            next.images.push(image);
      }
    }
    for (const saved of feature.runs) {
      if (saved.status === "missing") {
        saved.freshness = "missing";
        continue;
      }
      saved.freshness = !saved.prdSha256
        ? "unknown"
        : saved.prdSha256 !== feature.prd.sha256
          ? "stale"
          : saved.sourceHashes?.length
            ? "current"
            : "unknown";
      for (const source of saved.sourceHashes || []) {
        try {
          if (hash(await safeRead(root, source.path)) !== source.hash)
            saved.freshness = "stale";
        } catch (error) {
          if (error.code === "ENOENT") saved.freshness = "stale";
          else throw error;
        }
      }
    }
    feature.runs.sort(
      (a, b) =>
        b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id),
    );
  }
  return current;
}
export async function verifyEvidence(snapshot, archiveRoot, copyTo) {
  const paths = new Set(
    snapshot.features.flatMap((f) =>
      f.runs.flatMap((r) => (r.images || []).map((i) => i.path)),
    ),
  );
  for (const path of paths) {
    if (!/^pipeline-evidence\/[a-f0-9]{64}\.(png|webp)$/.test(path))
      throw new Error("Unsafe evidence reference");
    const bytes = await safeRead(archiveRoot, path, true);
    if (hash(bytes) !== path.split("/")[1].split(".")[0])
      throw new Error("Evidence hash mismatch");
    if (copyTo) {
      await mkdir(resolve(copyTo, "pipeline-evidence"), { recursive: true });
      await writeFile(resolve(copyTo, path), bytes);
    }
  }
}
async function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const target = resolve(root, "../nestjs/private-pipeline");
  const check = process.argv.includes("--check");
  const prior = await json(target, "pipeline.json");
  const stage = check
    ? null
    : await mkdtemp(resolve(dirname(target), ".pipeline-stage-"));
  try {
    if (prior) await verifyEvidence(prior, target, stage);
    const data = await mergeArchive(
      root,
      await buildPipeline(root, {
        assetRoot: stage ? resolve(stage, "pipeline-evidence") : undefined,
      }),
      prior,
    );
    if (check) {
      if (JSON.stringify(prior) !== JSON.stringify(data))
        throw new Error("Pipeline snapshot stale; run pnpm pipeline:sync");
    } else {
      await verifyEvidence(data, stage);
      await writeFile(resolve(stage, "pipeline.json"), JSON.stringify(data));
      const backup = target + ".previous";
      await rm(backup, { recursive: true, force: true });
      try {
        await rename(target, backup);
      } catch (e) {
        if (e.code !== "ENOENT") throw e;
      }
      try {
        await rename(stage, target);
      } catch (e) {
        try {
          await rename(backup, target);
        } catch {}
        throw e;
      }
      await rm(backup, { recursive: true, force: true });
    }
    console.log(
      `Private pipeline: ${data.features.length} features; ${data.features.reduce((n, f) => n + f.runs.length, 0)} feature runs; ${check ? "verified" : "archived"}`,
    );
  } finally {
    if (stage) await rm(stage, { recursive: true, force: true });
  }
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await main();
