import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPipeline, safeRead } from "./build.mjs";
import { mkdtemp, mkdir, writeFile, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
test("real catalog preserves missing specs, case assertions, history and source uncertainty", async () => {
  const data = await buildPipeline(new URL("../../", import.meta.url).pathname);
  const notes = data.features.find((f) => f.id === "notes/mcp-notes");
  assert(notes.specs.some((s) => s.path === "specs/003-mcp-notes/spec.md"));
  assert(notes.cases.some((c) => c.expectedResults.length));
  assert(notes.runs.length >= 2);
  assert(notes.runs.some((r) => r.rows.some((row) => row.status !== "passed")));
  assert(
    notes.runs.every((r) =>
      ["current", "stale", "unknown", "missing"].includes(r.freshness),
    ),
  );
  assert(data.features.some((f) => !f.specs.length));
  assert(!JSON.stringify(data).includes("changedFiles"));
});
test("file reader refuses traversal, absolute paths and symlink escape", async () => {
  const root = await mkdtemp(join(tmpdir(), "pipeline-"));
  try {
    await mkdir(join(root, "docs"));
    await writeFile(join(root, "docs/a.md"), "safe");
    assert.equal(await safeRead(root, "docs/a.md"), "safe");
    for (const p of ["../package.json", "/etc/passwd", "docs/../docs/a.md"])
      await assert.rejects(() => safeRead(root, p));
    await symlink("/etc/passwd", join(root, "docs/link.md"));
    await assert.rejects(() => safeRead(root, "docs/link.md"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("archive merge preserves a cleaned-up failed run and its media; media corruption fails validation", async () => {
  const { mergeArchive, verifyEvidence } = await import("./build.mjs");
  const { createHash } = await import("node:crypto");
  const root = await mkdtemp(join(tmpdir(), "pipeline-archive-"));
  const image = Buffer.from("synthetic-png");
  const digest = createHash("sha256").update(image).digest("hex");
  const path = "pipeline-evidence/" + digest + ".png";
  const previous = {
    features: [
      {
        id: "a/b",
        runs: [
          {
            id: "failed-first",
            createdAt: "2026",
            prdSha256: "old",
            status: "failed",
            rows: [{ id: "AC-01", status: "failed" }],
            images: [{ path }],
          },
        ],
      },
    ],
  };
  try {
    const current = {
      features: [{ id: "a/b", prd: { sha256: "new" }, runs: [] }],
    };
    const merged = await mergeArchive(root, current, previous);
    assert.equal(merged.features[0].runs[0].status, "failed");
    assert.equal(merged.features[0].runs[0].freshness, "stale");
    await mkdir(join(root, "pipeline-evidence"));
    await writeFile(join(root, path), image);
    await verifyEvidence(merged, root);
    await writeFile(join(root, path), "tampered");
    await assert.rejects(() => verifyEvidence(merged, root), /hash mismatch/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("backend packaging exports only referenced evidence and rejects symlinks", async () => {
  const { copyPrivatePipeline } =
    await import("../../../nestjs/scripts/copy-private-pipeline.mjs");
  const root = await mkdtemp(join(tmpdir(), "pipeline-package-"));
  const out = await mkdtemp(join(tmpdir(), "pipeline-out-"));
  try {
    await writeFile(
      join(root, "pipeline.json"),
      JSON.stringify({ schemaVersion: 1, features: [] }),
    );
    await writeFile(join(root, "debug.json"), "private raw data");
    await copyPrivatePipeline(root, out);
    await assert.rejects(() =>
      import("node:fs/promises").then((fs) =>
        fs.readFile(join(out, "debug.json")),
      ),
    );
    await rm(join(root, "pipeline.json"));
    await symlink("/etc/passwd", join(root, "pipeline.json"));
    await assert.rejects(() => copyPrivatePipeline(root, out), /Symbolic/);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(out, { recursive: true, force: true });
  }
});

test("feature status follows only its own rows and retains overall run status separately", async () => {
  const data = await buildPipeline(new URL("../../", import.meta.url).pathname);
  for (const feature of data.features)
    for (const run of feature.runs) {
      if (run.status === "missing") continue;
      const expected = run.rows.some((r) => r.status === "failed")
        ? "failed"
        : run.rows.some((r) => r.status === "blocked")
          ? "blocked"
          : run.rows.every((r) => r.status === "passed")
            ? "passed"
            : "incomplete";
      assert.equal(run.status, expected);
      assert(run.overallStatus);
    }
});
test("a rewritten run outcome keeps its previous failure as a distinct archived revision", async () => {
  const { mergeArchive } = await import("./build.mjs");
  const previous = {
    features: [
      {
        id: "a/b",
        runs: [
          {
            id: "run1",
            createdAt: "2026",
            status: "failed",
            rows: [{ status: "failed" }],
            tests: [],
            images: [],
          },
        ],
      },
    ],
  };
  const current = {
    features: [
      {
        id: "a/b",
        prd: { sha256: "x" },
        runs: [
          {
            id: "run1",
            createdAt: "2026",
            status: "passed",
            rows: [{ status: "passed" }],
            tests: [],
            images: [],
          },
        ],
      },
    ],
  };
  const data = await mergeArchive("/tmp", current, previous);
  assert.equal(data.features[0].runs.length, 2);
  assert(
    data.features[0].runs.some(
      (r) => r.status === "failed" && r.id.startsWith("run1@"),
    ),
  );
});

test("all preserved revisions become stale after PRD changes", async () => {
  const { mergeArchive } = await import("./build.mjs");
  const previous = {
    features: [
      {
        id: "a/b",
        runs: [
          {
            id: "run1",
            createdAt: "2026",
            prdSha256: "old",
            freshness: "current",
            status: "failed",
            rows: [{ status: "failed" }],
            tests: [],
            images: [],
          },
        ],
      },
    ],
  };
  const current = {
    features: [
      {
        id: "a/b",
        prd: { sha256: "new" },
        runs: [
          {
            id: "run1",
            createdAt: "2026",
            prdSha256: "old",
            freshness: "stale",
            status: "passed",
            rows: [{ status: "passed" }],
            tests: [],
            images: [],
          },
        ],
      },
    ],
  };
  const merged = await mergeArchive("/tmp", current, previous);
  assert(merged.features[0].runs.every((r) => r.freshness === "stale"));
});
