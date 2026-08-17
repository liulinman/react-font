# PWA Safe Bootstrap Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the installable mobile PWA shell below Workbox's default 2 MiB guard, exclude desktop lazy chunks from precache, and restore Node 18 compatibility for deterministic icon generation.

**Architecture:** Desktop route modules and `@font/ui`'s desktop `ProtectedRoute` move behind React Router `lazy` callbacks while the existing mobile route tree remains in the startup graph. The entry chunk receives a stable `app-shell-*` filename, Workbox matches only shell assets, and a build-artifact verifier checks the entry, Vite manifest, and generated service worker. Sharp is pinned to metadata-compatible `0.32.6` without changing repository Node policy.

**Tech Stack:** React 18, React Router 7 lazy routes, Vite 6, vite-plugin-pwa/Workbox, Vitest, pnpm, Sharp.

**Spec:** `.superpowers/sdd/2026-08-17-mobile-pwa-foundation/task-5-brief.md` plus Task 5 fix round 1 Important findings I1-I2.

## Global Constraints

- Preserve every desktop and mobile path, desktop `ProtectedRoute` auth mapping, and `EnglishWorldLayout activeKey` composition.
- Keep `registerType: "prompt"` and `runtimeCaching: []`; never cache API or mutation traffic.
- Remove the 4 MiB override and pass Workbox's default 2 MiB maximum.
- Precache only `index.html`, manifest/icons, mobile app-shell entry CSS/JS, and the required Workbox registration chunk.
- Keep root `engines.node` at `>=18`; Sharp must support Node 18.
- Do not delegate or run physical-device tests.

---

### Task 1: Add artifact and route regression evidence

**Files:**
- Create: `apps/english-world/scripts/verify-pwa-build.mjs`
- Modify: `apps/english-world/package.json`
- Modify: `apps/english-world/src/router/router.test.tsx`

**Interfaces:**
- Consumes: production files under `apps/english-world/dist/`.
- Produces: `pnpm --filter @font/english-world verify:pwa-build` and desktop route composition coverage.

- [ ] **Step 1: Add a build verifier that asserts the HTML entry is below 2 MiB, every HTML bootstrap asset is precached, all Vite dynamic entries are excluded except Workbox registration, and SW source has no API/mutation routes.**

```js
assert.ok(entryBytes < 2 * 1024 * 1024, `app shell is ${entryBytes} bytes`);
assert.ok(bootstrapUrls.every((url) => precacheUrls.has(url)));
assert.ok(dynamicAssets.every((url) => !precacheUrls.has(url)));
assert.doesNotMatch(serviceWorker, /\/api|mutation|POST|PUT|PATCH|DELETE/);
```

- [ ] **Step 2: Run the verifier against the existing Task 5 build.**

Run: `node apps/english-world/scripts/verify-pwa-build.mjs`
Expected: FAIL because the current startup entry is 2,999,539 bytes, above 2 MiB.

- [ ] **Step 3: Add router tests for plain desktop pages, layout routes, session parameters, and unauthenticated redirect state.**

```tsx
await router.navigate("/englishWorld/ai-word");
expect(await screen.findByTestId("desktop-layout")).toHaveAttribute("data-active-key", "aiWord");
expect(screen.getByText("ai-word-page")).toBeInTheDocument();
```

- [ ] **Step 4: Run the route tests before changing production routes.**

Run: `pnpm --filter @font/english-world exec vitest run src/router/router.test.tsx`
Expected: existing route behavior passes; these tests become the preservation gate for the lazy refactor.

### Task 2: Split desktop routes and constrain shell precache

**Files:**
- Modify: `apps/english-world/src/router/router.tsx`
- Modify: `apps/english-world/vite.config.ts`

**Interfaces:**
- Consumes: `useAuth()` and lazy imports of desktop page modules and `@font/ui`.
- Produces: React Router `lazy` callbacks returning `{ Component }`, plus `app-shell-[hash].js` startup naming.

- [ ] **Step 1: Replace top-level desktop imports with lazy loaders while retaining the auth adapter.**

```tsx
function protectedDesktopRoute(loadPage: DesktopPageLoader) {
  return async () => {
    const [{ ProtectedRoute }, { default: Page }] = await Promise.all([
      import("@font/ui"),
      loadPage(),
    ]);
    function ProtectedDesktopRoute() {
      const auth = useAuth();
      return <ProtectedRoute auth={{ isAuthenticated: auth.isAuthenticated, loading: auth.loading, checkAuth: auth.checkAuth }}><Page /></ProtectedRoute>;
    }
    return { Component: ProtectedDesktopRoute };
  };
}
```

- [ ] **Step 2: Convert login and every desktop path to `lazy`, using a layout page loader for the exact active keys `aiWord`, `bulkImport`, `overwriteStats`, `contextLab`, `ieltsCore`, and `memoryMap`.**

- [ ] **Step 3: Name the entry `assets/app-shell-[hash].js`, emit Vite's build manifest, remove the maximum-size override, and set exact shell glob patterns.**

```ts
build: { manifest: true, rollupOptions: { output: { entryFileNames: "assets/app-shell-[hash].js" } } },
workbox: {
  globPatterns: ["index.html", "manifest.webmanifest", "icons/*.png", "assets/app-shell-*.js", "assets/index-*.css", "assets/workbox-window*.js"],
  navigateFallback: "/index.html",
  runtimeCaching: [],
},
```

- [ ] **Step 4: Run router tests, TypeScript, production build, and artifact verifier.**

Run: `pnpm --filter @font/english-world exec vitest run src/router/router.test.tsx && pnpm --filter @font/english-world exec tsc -b && pnpm --filter @font/english-world build && pnpm --filter @font/english-world verify:pwa-build`
Expected: all pass with the default Workbox guard and no desktop dynamic chunks in precache.

### Task 3: Restore Node 18 icon-tool compatibility

**Files:**
- Modify: `apps/english-world/package.json`
- Modify: `pnpm-lock.yaml`
- Regenerate: `apps/english-world/public/icons/*.png`

**Interfaces:**
- Consumes: root `engines.node: ">=18"`.
- Produces: Sharp `0.32.6`, whose registry metadata declares `node: ">=14.15.0"`.

- [ ] **Step 1: Record RED metadata evidence for installed Sharp 0.35.3.**

Run: `node -e 'const assert=require("assert"); const p=require("./apps/english-world/node_modules/sharp/package.json"); assert(!p.engines.node.includes(">=20"), p.engines.node)'`
Expected: FAIL with `>=20.9.0`.

- [ ] **Step 2: Pin Sharp exactly and regenerate twice.**

Run: `pnpm --filter @font/english-world add -D -E sharp@0.32.6 && pnpm --filter @font/english-world generate:pwa-icons`
Expected: installed Sharp metadata is `>=14.15.0`; two generations have identical SHA-256 hashes.

- [ ] **Step 3: Re-run PWA/router tests, TypeScript, build, and artifact verification.**

Run: `pnpm --filter @font/english-world exec vitest run src/page/englishWorldMobile/pwa/PwaUpdateContext.test.tsx src/router/router.test.tsx && pnpm --filter @font/english-world exec tsc -b && pnpm --filter @font/english-world build && pnpm --filter @font/english-world verify:pwa-build`
Expected: all pass.

### Task 4: Report and commit

**Files:**
- Modify ignored handoff: `.superpowers/sdd/2026-08-17-mobile-pwa-foundation/task-5-report.md`

- [ ] **Step 1: Append both findings, RED/GREEN evidence, exact build/precache results, Sharp metadata, files, and attention points to the report.**

- [ ] **Step 2: Verify staged scope and commit.**

Run: `git diff --check && git status --short`
Expected: only I1/I2 covering files are modified.

Commit: `fix: keep PWA bootstrap within cache guard`
