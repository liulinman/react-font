# English World Mobile PWA Release Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove complete mobile capability coverage, iOS/WebKit usability, offline/update safety, route-level performance, desktop non-regression, and remove the superseded mobile monolith.

**Architecture:** Add Playwright WebKit tests beside existing Cypress regression coverage, enforce measurable DOM/CSS contracts, validate built PWA artifacts, inspect bundle chunks, then delete only legacy mobile files with zero remaining imports. The final gate runs all unit, build, desktop E2E, and mobile WebKit suites.

**Tech Stack:** Playwright WebKit, Cypress, Vitest, Vite build output, manifest/service-worker validation scripts.

**Spec:** `docs/superpowers/specs/2026-08-17-english-world-mobile-pwa-full-redesign-design.md`

## Global Constraints

- Automated WebKit/responsive testing replaces formal physical-device certification.
- No test may disable zoom globally to make a layout pass.
- Desktop regression failures block release.
- Every capability in the manifest needs at least one mobile route assertion and primary create/read/update/delete coverage where applicable.
- Final production output must be installable and lazy-loaded.

---

### Task 1: Add Playwright WebKit mobile infrastructure

**Files:**
- Modify: `apps/english-world/package.json`
- Modify: `pnpm-lock.yaml`
- Create: `apps/english-world/playwright.config.ts`
- Create: `apps/english-world/playwright/fixtures/mobileApi.ts`
- Create: `apps/english-world/playwright/mobile/shell.spec.ts`

**Interfaces:**
- Produces: project `webkit-mobile` and reusable authenticated API fixtures.

- [ ] **Step 1: Install Playwright and define scripts**

Run: `pnpm --filter @font/english-world add -D @playwright/test`

Add:

~~~json
{
  "scripts": {
    "e2e:webkit": "playwright test --project=webkit-mobile",
    "e2e:webkit:install": "playwright install webkit"
  }
}
~~~

- [ ] **Step 2: Add config and first failing shell test**

~~~ts
export default defineConfig({
  testDir: "./playwright",
  webServer: { command: "vite --host 127.0.0.1 --port 5176 --strictPort", url: "http://127.0.0.1:5176", reuseExistingServer: !process.env.CI },
  projects: [{
    name: "webkit-mobile",
    use: { ...devices["iPhone 13"], baseURL: "http://127.0.0.1:5176", locale: "zh-CN", timezoneId: "Asia/Shanghai" },
  }],
});
~~~

~~~ts
test("uses four mobile tabs without desktop fallback", async ({ page }) => {
  await mockAuthenticatedMobileApi(page);
  await page.goto("/mobile");
  await expect(page.getByRole("tab")).toHaveCount(4);
  await expect(page.locator(".english-world-desktop-layout")).toHaveCount(0);
});
~~~

- [ ] **Step 3: Install WebKit, run, and commit**

~~~bash
pnpm --filter @font/english-world e2e:webkit:install
pnpm --filter @font/english-world e2e:webkit
git add apps/english-world/package.json apps/english-world/playwright.config.ts apps/english-world/playwright pnpm-lock.yaml
git commit -m "test: add WebKit mobile harness"
~~~

### Task 2: Enforce viewport, zoom, safe-area, keyboard, and accessibility contracts

**Files:**
- Create: `apps/english-world/playwright/mobile/mobile-contracts.spec.ts`
- Create: `apps/english-world/src/page/englishWorldMobile/testing/mobileDomContracts.ts`
- Create: `apps/english-world/src/page/englishWorldMobile/testing/mobileDomContracts.test.ts`

**Interfaces:**
- Produces: `collectMobileContractViolations(document)` for unit/E2E diagnostics.

- [ ] **Step 1: Write failing contract collector tests**

~~~ts
expect(collectMobileContractViolations(document)).toEqual([]);
document.body.innerHTML = '<input style="font-size:12px"><button style="width:20px;height:20px">x</button>';
expect(collectMobileContractViolations(document).map((item) => item.rule)).toEqual(["editable-font-size", "target-size"]);
~~~

- [ ] **Step 2: Implement deterministic checks**

~~~ts
export type MobileContractViolation = { rule: "horizontal-overflow" | "editable-font-size" | "target-size"; selector: string; actual: number };
export function collectMobileContractViolations(doc: Document): MobileContractViolation[] {
  const violations: MobileContractViolation[] = [];
  if (doc.documentElement.scrollWidth > doc.documentElement.clientWidth) violations.push({ rule: "horizontal-overflow", selector: "html", actual: doc.documentElement.scrollWidth - doc.documentElement.clientWidth });
  doc.querySelectorAll("input,textarea,select").forEach((node) => { const size = parseFloat(getComputedStyle(node).fontSize); if (size < 16) violations.push({ rule: "editable-font-size", selector: node.tagName.toLowerCase(), actual: size }); });
  doc.querySelectorAll('button,[role="button"],[role="tab"]').forEach((node) => { const rect = node.getBoundingClientRect(); if (rect.width < 44 || rect.height < 44) violations.push({ rule: "target-size", selector: node.tagName.toLowerCase(), actual: Math.min(rect.width, rect.height) }); });
  return violations;
}
~~~

- [ ] **Step 3: Run every root/detail route at required sizes**

~~~ts
for (const viewport of [{ width: 320, height: 568 }, { width: 375, height: 812 }, { width: 390, height: 844 }, { width: 393, height: 852 }, { width: 430, height: 932 }, { width: 844, height: 390 }]) {
  test("mobile contracts " + viewport.width + "x" + viewport.height, async ({ page }) => {
    await page.setViewportSize(viewport);
    for (const path of acceptancePaths) {
      await page.goto(path);
      expect(await page.evaluate(() => window.__collectMobileContractViolations())).toEqual([]);
    }
  });
}
~~~

Also assert the viewport meta has neither `maximum-scale` nor `user-scalable=no`, focus each input without layout width change, tab through dialogs/sheets, run Reduced Motion, and check dark mode contrast classes/state text.

- [ ] **Step 4: Verify and commit**

~~~bash
pnpm --filter @font/english-world exec vitest run src/page/englishWorldMobile/testing
pnpm --filter @font/english-world e2e:webkit -- playwright/mobile/mobile-contracts.spec.ts
git add apps/english-world/src/page/englishWorldMobile/testing apps/english-world/playwright/mobile/mobile-contracts.spec.ts
git commit -m "test: enforce mobile usability contracts"
~~~

### Task 3: Prove offline and safe-update behavior

**Files:**
- Create: `apps/english-world/playwright/mobile/offline-update.spec.ts`
- Create: `apps/english-world/scripts/validate-pwa.mjs`
- Modify: `apps/english-world/package.json`

**Interfaces:**
- Verifies: manifest, service worker, shell cache, cached recent content, draft persistence, online-only boundaries, deferred activation.

- [ ] **Step 1: Add build-artifact validation**

~~~js
const manifest = JSON.parse(await readFile(new URL("../dist/manifest.webmanifest", import.meta.url), "utf8"));
assert.equal(manifest.start_url, "/mobile");
assert.equal(manifest.display, "standalone");
assert.ok(manifest.icons.some((icon) => icon.sizes === "192x192"));
assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512"));
const files = await readdir(new URL("../dist", import.meta.url));
assert.ok(files.some((file) => /^sw.*\.js$/.test(file)));
~~~

Add `"validate:pwa": "node scripts/validate-pwa.mjs"`.

- [ ] **Step 2: Add offline/update WebKit cases**

~~~ts
test("keeps recent content and drafts offline", async ({ page, context }) => {
  await page.goto("/mobile/words/new");
  await page.getByLabel("单词或短语").fill("resilient");
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByLabel("单词或短语")).toHaveValue("resilient");
  await expect(page.getByText("保存需要联网")).toBeVisible();
});
~~~

Add a service-worker update fixture that marks a new worker waiting while an activity lock exists; assert no reload, visible update-ready copy, then unlock and explicitly apply.

- [ ] **Step 3: Verify and commit**

~~~bash
pnpm --filter @font/english-world build
pnpm --filter @font/english-world validate:pwa
pnpm --filter @font/english-world e2e:webkit -- playwright/mobile/offline-update.spec.ts
git add apps/english-world/playwright/mobile/offline-update.spec.ts apps/english-world/scripts/validate-pwa.mjs apps/english-world/package.json
git commit -m "test: verify mobile offline and update safety"
~~~

### Task 4: Enforce route-level lazy loading and bundle budgets

**Files:**
- Create: `apps/english-world/scripts/check-mobile-bundles.mjs`
- Create: `apps/english-world/src/router/desktopRouteConfig.tsx`
- Modify: `apps/english-world/package.json`
- Modify: `apps/english-world/vite.config.ts`
- Modify: `apps/english-world/src/router/router.tsx`
- Modify: `apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.tsx`

**Interfaces:**
- Produces: `check:mobile-bundles`.
- Budget: initial mobile entry dependency closure gzip ≤ 600 KiB; each feature route chunk gzip ≤ 350 KiB; ECharts loads only on statistics routes. The existing full eager bundle is approximately 1.09 MiB gzip, so this gate requires a material reduction without claiming a native-app-sized bundle.

- [ ] **Step 1: Add the failing build inspection script**

~~~js
const manifest = JSON.parse(await readFile(new URL("../dist/.vite/manifest.json", import.meta.url), "utf8"));
const entry = Object.values(manifest).find((item) => item.isEntry);
assert.ok(entry.dynamicImports.length >= 8, "mobile features must be route-split");
assert.ok(!entry.imports.some((id) => id.toLowerCase().includes("echarts")), "ECharts cannot be eager");
~~~

Compute gzip sizes from emitted files with `gzipSync` and fail above the locked budgets.

Enable `build.manifest: true` in `vite.config.ts`. Move the unchanged desktop route elements into `desktopRouteConfig.tsx` using route-level lazy imports for `/englishWorld`, words, stats, settings, AI word, bulk import, overwrite statistics, Context Lab, IELTS core, memory map, recite, and mixed-learning session. Keep their paths and rendered components identical; this prevents desktop modules from entering the mobile startup closure.

- [ ] **Step 2: Ensure every feature route is a dynamic import**

~~~ts
const route = (exportName: string) => (module: Record<string, React.ComponentType>) => {
  const Component = module[exportName];
  if (!Component) throw new Error("Missing mobile route export: " + exportName);
  return { Component };
};

export const mobileRouteConfig: RouteObject[] = [
  { index: true, lazy: () => import("../features/home/MobileHomePage").then(route("MobileHomePage")) },
  { path: "review", lazy: () => import("../features/review/MobileReviewPage").then(route("MobileReviewPage")) },
  { path: "learn", lazy: () => import("../features/learning/MobileLearningSetupPage").then(route("MobileLearningSetupPage")) },
  { path: "learn/session/:sessionId", lazy: () => import("../features/learning/MobileLearningSessionPage").then(route("MobileLearningSessionPage")) },
  { path: "cockpit", lazy: () => import("../features/cockpit/MobileLearningCockpitPage").then(route("MobileLearningCockpitPage")) },
  { path: "words", lazy: () => import("../features/words/MobileWordLibraryPage").then(route("MobileWordLibraryPage")) },
  { path: "words/new", lazy: () => import("../features/words/MobileWordFormPage").then(route("MobileWordFormPage")) },
  { path: "words/:wordId", lazy: () => import("../features/words/MobileWordDetailPage").then(route("MobileWordDetailPage")) },
  { path: "words/:wordId/edit", lazy: () => import("../features/words/MobileWordFormPage").then(route("MobileWordFormPage")) },
  { path: "tools", lazy: () => import("../features/tools/MobileToolsPage").then(route("MobileToolsPage")) },
  { path: "tools/ai-word", lazy: () => import("../features/aiWord/MobileAiWordPage").then(route("MobileAiWordPage")) },
  { path: "tools/context-lab", lazy: () => import("../features/contextLab/MobileContextTaskListPage").then(route("MobileContextTaskListPage")) },
  { path: "tools/context-lab/new", lazy: () => import("../features/contextLab/MobileContextCreatePage").then(route("MobileContextCreatePage")) },
  { path: "tools/context-lab/:taskId/read", lazy: () => import("../features/contextLab/MobileContextReaderPage").then(route("MobileContextReaderPage")) },
  { path: "tools/context-lab/:taskId/answer", lazy: () => import("../features/contextLab/MobileContextAnswerPage").then(route("MobileContextAnswerPage")) },
  { path: "tools/context-lab/:taskId/result/:attemptId", lazy: () => import("../features/contextLab/MobileContextResultPage").then(route("MobileContextResultPage")) },
  { path: "tools/context-lab/:taskId/attempts", lazy: () => import("../features/contextLab/MobileContextAttemptsPage").then(route("MobileContextAttemptsPage")) },
  { path: "tools/ielts-core", lazy: () => import("../features/ieltsCore/MobileIeltsCorePage").then(route("MobileIeltsCorePage")) },
  { path: "tools/memory-map", lazy: () => import("../features/memoryMap/MobileMemoryMapPage").then(route("MobileMemoryMapPage")) },
  { path: "tools/stats", lazy: () => import("../features/stats/MobileStatsPage").then(route("MobileStatsPage")) },
  { path: "tools/bulk-import", lazy: () => import("../features/bulkImport/MobileBulkImportPage").then(route("MobileBulkImportPage")) },
  { path: "tools/overwrite-stats", lazy: () => import("../features/coverageStats/MobileCoverageStatsPage").then(route("MobileCoverageStatsPage")) },
  { path: "me", lazy: () => import("../features/account/MobileAccountPage").then(route("MobileAccountPage")) },
  { path: "me/notifications", lazy: () => import("../features/notifications/MobileNotificationsPage").then(route("MobileNotificationsPage")) },
  { path: "me/settings", lazy: () => import("../features/account/MobileSettingsPage").then(route("MobileSettingsPage")) },
  { path: "me/appearance", lazy: () => import("../features/account/MobileAppearancePage").then(route("MobileAppearancePage")) },
  { path: "me/app", lazy: () => import("../features/account/MobilePwaStatusPage").then(route("MobilePwaStatusPage")) },
];
~~~

The helper `route(exportName)` returns `{ Component: module[exportName] }` and throws during development when the named export is missing. Do not create a barrel that eagerly imports feature pages.

- [ ] **Step 3: Verify and commit**

~~~bash
pnpm --filter @font/english-world build
pnpm --filter @font/english-world check:mobile-bundles
git add apps/english-world/scripts/check-mobile-bundles.mjs apps/english-world/package.json apps/english-world/vite.config.ts apps/english-world/src/router apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.tsx
git commit -m "perf: enforce mobile route splitting"
~~~

### Task 5: Prove capability CRUD and desktop non-regression

**Files:**
- Create: `apps/english-world/playwright/mobile/capability-matrix.spec.ts`
- Modify: `apps/english-world/src/page/englishWorldMobile/testing/mobileCapabilityManifest.ts`
- Modify: existing Cypress desktop specs only when selectors need stable semantic labels.

**Interfaces:**
- Extends each manifest entry with `acceptancePath` and `primaryAction`.
- Verifies all manifest IDs exactly once.

- [ ] **Step 1: Make the manifest executable**

~~~ts
export type MobileCapability = {
  id: MobileCapabilityId;
  desktopPath: string;
  mobilePath: string;
  acceptancePath: string;
  primaryAction: "read" | "create" | "update" | "delete" | "practice";
};
~~~

- [ ] **Step 2: Add parameterized acceptance tests**

~~~ts
for (const capability of MOBILE_CAPABILITIES) {
  test(capability.id, async ({ page }) => {
    await page.goto(capability.acceptancePath);
    await expect(page.locator("[data-mobile-capability='" + capability.id + "']")).toBeVisible();
    await runPrimaryCapabilityAction(page, capability.primaryAction);
  });
}
~~~

Cover word add/edit/delete, import conflict, review submit/retry, mixed-learning submit, Context Lab create/submit/delete, settings save, notification mark-read, mastery update, and coverage-statistics paging with isolated API fixtures.

- [ ] **Step 3: Run desktop and mobile gates and commit**

~~~bash
pnpm --filter @font/english-world exec vitest run
pnpm --filter @font/english-world e2e
pnpm --filter @font/english-world e2e:webkit -- playwright/mobile/capability-matrix.spec.ts
git add apps/english-world/playwright/mobile/capability-matrix.spec.ts apps/english-world/src/page/englishWorldMobile/testing
git commit -m "test: prove mobile capability parity"
~~~

### Task 6: Remove the legacy monolith and complete release verification

**Files:**
- Delete: `apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.tsx`
- Delete: `apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.css`
- Delete: `apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.test.tsx`
- Delete when unreferenced: `apps/english-world/src/page/englishWorldMobile/ExerciseAgentTabMobile.tsx`
- Delete when unreferenced: `apps/english-world/src/page/englishWorldMobile/WordAgentTabMobile.tsx`
- Delete when unreferenced: `apps/english-world/src/page/englishWorldMobile/MobileContextLabPage.tsx`
- Delete when unreferenced: `apps/english-world/src/page/englishWorldMobile/MobileMorePage.tsx`
- Modify: `apps/english-world/src/page/englishWorldMobile/README.md`
- Modify: `docs/superpowers/specs/2026-08-17-english-world-mobile-pwa-full-redesign-design.md`

**Interfaces:**
- Leaves `/englishWorldMobile` redirect, all `/mobile/*` routes, and shared pronunciation/view-model helpers still referenced by the new implementation.

- [ ] **Step 1: Prove legacy files have no runtime imports**

Run:

~~~bash
rg -n "EnglishWorldMobile|ExerciseAgentTabMobile|WordAgentTabMobile|MobileContextLabPage|MobileMorePage" apps/english-world/src --glob '!page/englishWorldMobile/*.test.*'
~~~

Expected before deletion: only legacy files themselves or explicitly retained shared helpers. Move any still-required pure helper into its consuming feature with its existing tests before deletion.

- [ ] **Step 2: Delete only zero-reference legacy files and update documentation**

Use `apply_patch` deletions. Update README with route map, offline boundaries, test commands, update policy, and Safari Add-to-Home-Screen steps. Mark the design implementation status complete only after the final gate.

```diff
*** Begin Patch
*** Delete File: apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.tsx
*** Delete File: apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.css
*** Delete File: apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.test.tsx
*** End Patch
```

Apply equivalent explicit `Delete File` entries to `ExerciseAgentTabMobile.tsx`, `WordAgentTabMobile.tsx`, `MobileContextLabPage.tsx`, and `MobileMorePage.tsx` only when Step 1 reports zero imports. Do not use a recursive deletion command.

- [ ] **Step 3: Run the complete release gate**

~~~bash
pnpm --filter @font/english-world lint
pnpm --filter @font/english-world exec vitest run
pnpm --filter @font/english-world build
pnpm --filter @font/english-world validate:pwa
pnpm --filter @font/english-world check:mobile-bundles
pnpm --filter @font/english-world e2e
pnpm --filter @font/english-world e2e:webkit
git status --short
~~~

Expected: all commands exit `0`; Git status contains only the intentional Task 6 deletions/documentation edits before commit.

- [ ] **Step 4: Commit the completed migration**

~~~bash
git add apps/english-world/src/page/englishWorldMobile apps/english-world/src/router/router.tsx docs/superpowers/specs/2026-08-17-english-world-mobile-pwa-full-redesign-design.md
git commit -m "refactor: complete mobile PWA migration"
~~~
