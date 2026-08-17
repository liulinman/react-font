# English World Mobile PWA Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the dedicated mobile route tree, iOS-safe shell, shared mobile primitives, user-scoped IndexedDB storage, and installable PWA lifecycle.

**Architecture:** Route every mobile screen through a lazy nested `/mobile` tree and a single `MobileAppShell`. Keep offline business data in a versioned IndexedDB repository and service-worker cache concerns separate. Expose activity locks so an already-downloaded update waits until the current form or learning activity is safe to leave.

**Tech Stack:** React Router, Ant Design Mobile, React Query, IndexedDB, Vite, service workers, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-17-english-world-mobile-pwa-full-redesign-design.md`

## Global Constraints

- Preserve all `/englishWorld/*` behavior.
- `/mobile` is the PWA start path; `/englishWorldMobile` redirects with `replace`.
- Four root tabs only: `学习`, `词库`, `工具`, `我的`.
- Inputs are `16px` minimum, controls `44px` minimum, safe areas reserved, no global `user-scalable=no`.
- Service worker caches static assets and navigation shell only; IndexedDB owns user data.
- Updates never force reload while an activity lock exists.

---

### Task 1: Freeze the mobile capability and route contract

**Files:**
- Create: `apps/english-world/src/page/englishWorldMobile/testing/mobileCapabilityManifest.ts`
- Create: `apps/english-world/src/page/englishWorldMobile/testing/mobileCapabilityManifest.test.ts`

**Interfaces:**
- Produces: `MOBILE_CAPABILITIES`, `MobileCapabilityId`, `MOBILE_ROUTE_PATHS`.
- Consumes: approved EXPERIENCE route table.

- [ ] **Step 1: Write the failing contract test**

```ts
import { describe, expect, it } from "vitest";
import { MOBILE_CAPABILITIES, MOBILE_ROUTE_PATHS } from "./mobileCapabilityManifest";

describe("mobile capability manifest", () => {
  it("maps every desktop capability to a mobile-only route", () => {
    expect(MOBILE_CAPABILITIES.map((item) => item.id)).toEqual([
      "home", "review", "learning-setup", "learning-session", "cockpit",
      "words", "word-detail", "word-new", "word-edit", "tools", "ai-word",
      "context-tasks", "context-create", "context-read", "context-answer",
      "context-result", "context-attempts", "ielts-core", "memory-map", "stats",
      "bulk-import", "overwrite-stats", "account", "notifications", "settings",
      "appearance", "pwa-status",
    ]);
    expect(MOBILE_CAPABILITIES.every((item) => item.mobilePath.startsWith("/mobile"))).toBe(true);
    expect(MOBILE_CAPABILITIES.some((item) => item.mobilePath.startsWith("/englishWorld"))).toBe(false);
    expect(new Set(MOBILE_ROUTE_PATHS)).toEqual(new Set(MOBILE_CAPABILITIES.map((item) => item.mobilePath)));
  });
});
```

- [ ] **Step 2: Verify the test fails**

Run: `pnpm --filter @font/english-world exec vitest run src/page/englishWorldMobile/testing/mobileCapabilityManifest.test.ts`

Expected: FAIL because the manifest module does not exist.

- [ ] **Step 3: Implement the manifest with all capability families**

```ts
export const MOBILE_CAPABILITIES = [
  { id: "home", desktopPath: "/englishWorld", mobilePath: "/mobile" },
  { id: "review", desktopPath: "/englishWorld/recite", mobilePath: "/mobile/review" },
  { id: "learning-setup", desktopPath: "/englishWorld/words", mobilePath: "/mobile/learn" },
  { id: "learning-session", desktopPath: "/englishWorld/learn/session/:sessionId", mobilePath: "/mobile/learn/session/:sessionId" },
  { id: "cockpit", desktopPath: "/englishWorld", mobilePath: "/mobile/cockpit" },
  { id: "words", desktopPath: "/englishWorld/words", mobilePath: "/mobile/words" },
  { id: "word-detail", desktopPath: "/englishWorld/words", mobilePath: "/mobile/words/:wordId" },
  { id: "word-new", desktopPath: "/englishWorld/words", mobilePath: "/mobile/words/new" },
  { id: "word-edit", desktopPath: "/englishWorld/words", mobilePath: "/mobile/words/:wordId/edit" },
  { id: "tools", desktopPath: "/englishWorld", mobilePath: "/mobile/tools" },
  { id: "ai-word", desktopPath: "/englishWorld/ai-word", mobilePath: "/mobile/tools/ai-word" },
  { id: "context-tasks", desktopPath: "/englishWorld/context-lab", mobilePath: "/mobile/tools/context-lab" },
  { id: "context-create", desktopPath: "/englishWorld/context-lab", mobilePath: "/mobile/tools/context-lab/new" },
  { id: "context-read", desktopPath: "/englishWorld/context-lab", mobilePath: "/mobile/tools/context-lab/:taskId/read" },
  { id: "context-answer", desktopPath: "/englishWorld/context-lab", mobilePath: "/mobile/tools/context-lab/:taskId/answer" },
  { id: "context-result", desktopPath: "/englishWorld/context-lab", mobilePath: "/mobile/tools/context-lab/:taskId/result/:attemptId" },
  { id: "context-attempts", desktopPath: "/englishWorld/context-lab", mobilePath: "/mobile/tools/context-lab/:taskId/attempts" },
  { id: "ielts-core", desktopPath: "/englishWorld/ielts-core", mobilePath: "/mobile/tools/ielts-core" },
  { id: "memory-map", desktopPath: "/englishWorld/memory-map", mobilePath: "/mobile/tools/memory-map" },
  { id: "stats", desktopPath: "/englishWorld/stats", mobilePath: "/mobile/tools/stats" },
  { id: "bulk-import", desktopPath: "/englishWorld/bulk-import", mobilePath: "/mobile/tools/bulk-import" },
  { id: "overwrite-stats", desktopPath: "/englishWorld/overwrite-stats", mobilePath: "/mobile/tools/overwrite-stats" },
  { id: "account", desktopPath: "/englishWorld", mobilePath: "/mobile/me" },
  { id: "notifications", desktopPath: "/englishWorld", mobilePath: "/mobile/me/notifications" },
  { id: "settings", desktopPath: "/englishWorld/settings", mobilePath: "/mobile/me/settings" },
  { id: "appearance", desktopPath: "/englishWorld", mobilePath: "/mobile/me/appearance" },
  { id: "pwa-status", desktopPath: "/englishWorldMobile", mobilePath: "/mobile/me/app" },
] as const;

export type MobileCapabilityId = (typeof MOBILE_CAPABILITIES)[number]["id"];
export const MOBILE_ROUTE_PATHS = MOBILE_CAPABILITIES.map((item) => item.mobilePath);
```

- [ ] **Step 4: Run the test and commit**

Run: `pnpm --filter @font/english-world exec vitest run src/page/englishWorldMobile/testing/mobileCapabilityManifest.test.ts`

Expected: PASS.

```bash
git add apps/english-world/src/page/englishWorldMobile/testing
git commit -m "test: lock mobile capability contract"
```

### Task 2: Add the lazy mobile route tree and four-tab shell

**Files:**
- Create: `apps/english-world/src/page/englishWorldMobile/app/MobileAppShell.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/app/MobileProtectedRoute.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/app/MobileRouteFallback.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/app/MobileAppShell.test.tsx`
- Create: `apps/english-world/src/router/router.test.tsx`
- Modify: `apps/english-world/src/router/router.tsx`

**Interfaces:**
- Produces: `mobileRouteConfig`, `MobileAppShell`, tab history through `location.state`.
- Consumes: `MOBILE_ROUTE_PATHS` from Task 1 and future lazy page exports.

- [ ] **Step 1: Write a failing shell test**

```tsx
render(
  <MemoryRouter initialEntries={["/mobile/words"]}>
    <Routes><Route path="/mobile" element={<MobileAppShell />}><Route path="words" element={<div>words</div>} /></Route></Routes>
  </MemoryRouter>,
);
expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["学习", "词库", "工具", "我的"]);
expect(screen.getByRole("tab", { name: "词库" })).toHaveAttribute("aria-selected", "true");
```

- [ ] **Step 2: Verify failure**

Run: `pnpm --filter @font/english-world exec vitest run src/page/englishWorldMobile/app/MobileAppShell.test.tsx`

Expected: FAIL because `MobileAppShell` does not exist.

- [ ] **Step 3: Implement shell and lazy routes**

```tsx
export const MOBILE_TABS = [
  { key: "learn", label: "学习", path: "/mobile" },
  { key: "words", label: "词库", path: "/mobile/words" },
  { key: "tools", label: "工具", path: "/mobile/tools" },
  { key: "me", label: "我的", path: "/mobile/me" },
] as const;

export function MobileAppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeKey = resolveMobileTab(location.pathname);
  return (
    <div className="mobile-app-shell">
      <main><Outlet /></main>
      <TabBar activeKey={activeKey} onChange={(key) => navigate(MOBILE_TABS.find((item) => item.key === key)!.path)}>
        {MOBILE_TABS.map((item) => <TabBar.Item key={item.key} itemKey={item.key} title={item.label} />)}
      </TabBar>
    </div>
  );
}
```

In `router.tsx`, add a protected nested `/mobile` branch whose leaf pages use React Router `lazy`, then replace the old mobile element:

```tsx
{ path: "/englishWorldMobile", element: <Navigate to="/mobile" replace /> },
{
  path: "/mobile",
  element: <MobileProtectedRoute><MobileRouteFallback><MobileAppShell /></MobileRouteFallback></MobileProtectedRoute>,
  children: mobileRouteConfig,
},
```

`MobileProtectedRoute` reads `useAuth`, renders a mobile skeleton while loading, and returns `<Navigate to="/login" state={{ from: location }} replace />` when unauthenticated. It must not import shared `ProtectedRoute`, Ant Design, or a desktop layout.

- [ ] **Step 4: Verify route and shell behavior**

Run: `pnpm --filter @font/english-world exec vitest run src/page/englishWorldMobile/app/MobileAppShell.test.tsx src/router/router.test.tsx`

Expected: PASS. Create `router.test.tsx` in this task to assert the compatibility redirect, the `/mobile` branch, and the absence of a desktop protected-route spinner.

- [ ] **Step 5: Commit**

```bash
git add apps/english-world/src/page/englishWorldMobile/app apps/english-world/src/router
git commit -m "feat: add mobile route shell"
```

### Task 3: Implement iOS-safe design tokens and shared mobile primitives

**Files:**
- Create: `apps/english-world/src/page/englishWorldMobile/styles/mobile-tokens.css`
- Create: `apps/english-world/src/page/englishWorldMobile/styles/mobile-shell.css`
- Create: `apps/english-world/src/page/englishWorldMobile/components/MobilePage.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/components/MobileStateView.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/components/SafeAreaActions.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/components/mobileContracts.test.tsx`
- Modify: `apps/english-world/src/page/englishWorldMobile/app/MobileAppShell.tsx`

**Interfaces:**
- Produces: `MobilePage`, `MobileStateView`, `SafeAreaActions` and CSS custom properties.

- [ ] **Step 1: Write failing DOM contract tests**

```tsx
render(<><input aria-label="draft" /><button type="button">save</button><SafeAreaActions><button>next</button></SafeAreaActions></>);
expect(getComputedStyle(screen.getByLabelText("draft")).fontSize).toBe("16px");
expect(Number.parseFloat(getComputedStyle(screen.getByRole("button", { name: "save" })).minHeight)).toBeGreaterThanOrEqual(44);
expect(screen.getByRole("region", { name: "页面操作" })).toHaveClass("mobile-safe-area-actions");
```

- [ ] **Step 2: Verify failure**

Run: `pnpm --filter @font/english-world exec vitest run src/page/englishWorldMobile/components/mobileContracts.test.tsx`

Expected: FAIL on missing primitives/contracts.

- [ ] **Step 3: Add the token and layout contract**

```css
:root {
  --mobile-surface-base: #f2f2f7;
  --mobile-surface-raised: #fff;
  --mobile-ink-primary: #000;
  --mobile-ink-secondary: #3c3c43;
  --mobile-accent: #007aff;
  --mobile-page-gutter: 16px;
  --mobile-target-min: 44px;
}
.mobile-app-shell { min-height: 100dvh; background: var(--mobile-surface-base); padding: env(safe-area-inset-top) 0 env(safe-area-inset-bottom); overflow-x: clip; }
.mobile-app-shell input, .mobile-app-shell textarea, .mobile-app-shell select { font-size: max(16px, 1rem); }
.mobile-app-shell button, .mobile-app-shell [role="button"], .mobile-app-shell [role="tab"] { min-width: var(--mobile-target-min); min-height: var(--mobile-target-min); }
.mobile-app-shell button, .mobile-app-shell [role="button"], .mobile-app-shell [role="tab"], .mobile-app-shell input { touch-action: manipulation; }
@media (prefers-reduced-motion: reduce) { .mobile-app-shell *, .mobile-app-shell *::before, .mobile-app-shell *::after { scroll-behavior: auto !important; transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; } }
```

Implement `MobileStateView` with explicit `loading | empty | offline | error` variants and `SafeAreaActions` as an accessible region.

- [ ] **Step 4: Run tests and commit**

Run: `pnpm --filter @font/english-world exec vitest run src/page/englishWorldMobile/components/mobileContracts.test.tsx`

```bash
git add apps/english-world/src/page/englishWorldMobile/components apps/english-world/src/page/englishWorldMobile/styles apps/english-world/src/page/englishWorldMobile/app/MobileAppShell.tsx
git commit -m "feat: add iOS mobile design primitives"
```

### Task 4: Add user-scoped IndexedDB and connectivity contracts

**Files:**
- Create: `apps/english-world/src/page/englishWorldMobile/offline/mobileStorage.ts`
- Create: `apps/english-world/src/page/englishWorldMobile/offline/mobileStorage.test.ts`
- Create: `apps/english-world/src/page/englishWorldMobile/offline/useConnectivity.ts`
- Create: `apps/english-world/src/page/englishWorldMobile/offline/useConnectivity.test.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/offline/MobileActivityLockContext.tsx`

**Interfaces:**
- Produces: `mobileStorage`, `useConnectivity()`, `useMobileActivityLock(key, active)`.
- Database: `english-world-mobile`, version `1`; stores `drafts`, `snapshots` with compound user keys.

- [ ] **Step 1: Write failing repository tests with a fake in-memory adapter**

```ts
const storage = createMobileStorage(createMemoryMobileDb());
await storage.putDraft({ key: "new", userId: 7, kind: "word-form", updatedAt: "2026-08-17T00:00:00.000Z", value: { word: "retain" } });
expect(await storage.getDraft(7, "word-form", "new")).toEqual({ word: "retain" });
await storage.clearUser(7);
expect(await storage.getDraft(7, "word-form", "new")).toBeNull();
```

- [ ] **Step 2: Verify failure**

Run: `pnpm --filter @font/english-world exec vitest run src/page/englishWorldMobile/offline`

Expected: FAIL because repository and connectivity hooks do not exist.

- [ ] **Step 3: Implement the stable storage interface**

```ts
export interface MobileStorage {
  getDraft<T>(userId: number, kind: MobileDraftKind, key: string): Promise<T | null>;
  putDraft<T>(record: MobileDraftRecord<T>): Promise<void>;
  deleteDraft(userId: number, kind: MobileDraftKind, key: string): Promise<void>;
  getSnapshot<T>(userId: number, key: string): Promise<T | null>;
  putSnapshot<T>(userId: number, key: string, value: T): Promise<void>;
  clearUser(userId: number): Promise<void>;
}
```

Open IndexedDB only in the browser, reject unknown record versions, and make storage failure degrade to in-memory drafts for the current page lifetime. `useConnectivity` listens to `online`/`offline`; it does not infer connectivity from failed business requests.

- [ ] **Step 4: Implement activity locks**

```tsx
type MobileActivityLockValue = { locked: boolean; lock(key: string): void; unlock(key: string): void };
export function useMobileActivityLock(key: string, active: boolean) {
  const activity = useContext(MobileActivityLockContext);
  useEffect(() => { active ? activity.lock(key) : activity.unlock(key); return () => activity.unlock(key); }, [activity, key, active]);
}
```

- [ ] **Step 5: Verify and commit**

Run: `pnpm --filter @font/english-world exec vitest run src/page/englishWorldMobile/offline`

```bash
git add apps/english-world/src/page/englishWorldMobile/offline
git commit -m "feat: add mobile offline storage contracts"
```

### Task 5: Make the application installable and updates safe

**Files:**
- Modify: `apps/english-world/package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `apps/english-world/vite.config.ts`
- Modify: `apps/english-world/index.html`
- Create: `apps/english-world/src/page/englishWorldMobile/pwa/PwaUpdateContext.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/pwa/PwaUpdateContext.test.tsx`
- Create: `apps/english-world/src/assets/pwa-icon.svg`
- Create: `apps/english-world/scripts/generate-pwa-icons.mjs`
- Create: generated assets under `apps/english-world/public/icons/`
- Modify: `apps/english-world/src/App.tsx`

**Interfaces:**
- Produces: manifest start URL `/mobile`, standalone display mode, `usePwaUpdate()`.
- Consumes: `MobileActivityLockContext.locked`.

- [ ] **Step 1: Add PWA tooling and a failing update-deferral test**

Run: `pnpm --filter @font/english-world add -D vite-plugin-pwa sharp`

```tsx
registration.updateAvailable();
render(<PwaUpdateProvider registration={registration} activityLocked><Probe /></PwaUpdateProvider>);
expect(screen.getByText("新版本已准备好")).toBeInTheDocument();
expect(registration.activate).not.toHaveBeenCalled();
```

- [ ] **Step 2: Verify failure**

Run: `pnpm --filter @font/english-world exec vitest run src/page/englishWorldMobile/pwa/PwaUpdateContext.test.tsx`

- [ ] **Step 3: Configure manifest and generated icons**

Create a square SVG using the approved blue semantic accent, white `EW` monogram, and a mask-safe 20% inset. Generate deterministic PNG assets:

```js
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const source = new URL("../src/assets/pwa-icon.svg", import.meta.url);
const output = new URL("../public/icons/", import.meta.url);
await mkdir(output, { recursive: true });
for (const [name, size] of [["apple-touch-icon-180x180.png", 180], ["pwa-192x192.png", 192], ["pwa-512x512.png", 512], ["pwa-512x512-maskable.png", 512]]) {
  await sharp(fileURLToPath(source)).resize(size, size).png().toFile(fileURLToPath(new URL(name, output)));
}
```

Add `"generate:pwa-icons": "node scripts/generate-pwa-icons.mjs"` and run `pnpm --filter @font/english-world generate:pwa-icons`.

```ts
VitePWA({
  registerType: "prompt",
  includeAssets: ["icons/apple-touch-icon-180x180.png"],
  manifest: {
    name: "English World",
    short_name: "English",
    start_url: "/mobile",
    scope: "/",
    display: "standalone",
    background_color: "#F2F2F7",
    theme_color: "#F2F2F7",
    icons: [
      { src: "/icons/pwa-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/pwa-512x512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/pwa-512x512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  },
  workbox: { navigateFallback: "/index.html", runtimeCaching: [] },
});
```

Add `apple-mobile-web-app-capable`, status bar, theme color, and apple touch icon tags to `index.html`; do not add `maximum-scale` or `user-scalable=no`.

- [ ] **Step 4: Implement prompt-based registration**

```ts
const updateSW = registerSW({ immediate: true, onNeedRefresh: () => setState({ status: "ready", apply: () => { if (!locked) void updateSW(true); } }) });
```

Mount the provider once in `App.tsx` outside the router. Expose deferred-ready state to the shell and `/mobile/me/app` without auto-refresh.

- [ ] **Step 5: Verify production output and commit**

Run: `pnpm --filter @font/english-world exec vitest run src/page/englishWorldMobile/pwa/PwaUpdateContext.test.tsx && pnpm --filter @font/english-world build`

Expected: PASS; `dist/manifest.webmanifest`, service-worker assets, and icons exist; manifest start URL is `/mobile`.

```bash
git add apps/english-world/package.json apps/english-world/vite.config.ts apps/english-world/index.html apps/english-world/public/icons apps/english-world/scripts/generate-pwa-icons.mjs apps/english-world/src/assets/pwa-icon.svg apps/english-world/src/App.tsx apps/english-world/src/page/englishWorldMobile/pwa pnpm-lock.yaml
git commit -m "feat: make mobile app installable PWA"
```

### Task 6: Add a mobile login surface with deep-link recovery

**Files:**
- Create: `apps/english-world/src/page/login/MobileLoginForm.tsx`
- Create: `apps/english-world/src/page/login/MobileLoginForm.test.tsx`
- Modify: `apps/english-world/src/page/login/Login.tsx`
- Modify: `apps/english-world/src/page/login/Login.css`
- Modify: `apps/english-world/src/page/login/Login.test.tsx`

**Interfaces:**
- Consumes: `useAuth`, `location.state.from`, display-mode state.
- Produces: mobile login/register form while retaining the desktop hero/card unchanged.

- [ ] **Step 1: Write failing mobile-source tests**

```tsx
renderLogin({ route: "/login", state: { from: { pathname: "/mobile/tools/context-lab" } } });
expect(screen.getByRole("main", { name: "English World 移动端登录" })).toBeVisible();
expect(screen.queryByText("把每个单词点亮成星图")).not.toBeInTheDocument();
await user.type(screen.getByLabelText("用户名"), "mobile-user");
await user.type(screen.getByLabelText("密码"), "secret12");
await user.click(screen.getByRole("button", { name: "登录" }));
expect(navigate).toHaveBeenCalledWith("/mobile/tools/context-lab", { replace: true });
```

- [ ] **Step 2: Verify failure**

Run: `pnpm --filter @font/english-world exec vitest run src/page/login/MobileLoginForm.test.tsx src/page/login/Login.test.tsx`

Expected: FAIL because the mobile form and surface selector do not exist.

- [ ] **Step 3: Implement surface selection and the mobile form**

```ts
export function isMobileLoginSurface(state: LocationState | null) {
  const from = state?.from?.pathname ?? "";
  return from.startsWith("/mobile") || window.matchMedia("(display-mode: standalone)").matches;
}
```

Use Ant Design Mobile controls with explicit labels, 16px inputs, 44px actions, safe-area padding, login/register validation, and busy state. A mobile session without a saved destination defaults to `/mobile`; desktop continues to default to `/englishWorld/recite`.

- [ ] **Step 4: Run desktop/mobile login tests and commit**

```bash
pnpm --filter @font/english-world exec vitest run src/page/login
git add apps/english-world/src/page/login
git commit -m "feat: add mobile PWA login"
```

### Task 7: Add foundation route and viewport acceptance coverage

**Files:**
- Modify: `apps/english-world/cypress/e2e/english-world-mobile-responsive.cy.ts`
- Create: `apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.test.tsx`

**Interfaces:**
- Verifies: deep links, compatibility redirect, four tabs, target/input/overflow contract.

- [ ] **Step 1: Replace legacy query-view assertions with route assertions**

```ts
[320, 375, 390, 393, 430].forEach((width) => {
  it(`keeps /mobile usable at ${width}px`, () => {
    cy.viewport(width, 844);
    cy.visit("/mobile/words");
    cy.get('[role="tab"]').should("have.length", 4);
    cy.document().then((doc) => expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth));
    cy.get("input, textarea, select").each(($el) => expect(Number.parseFloat(getComputedStyle($el[0]).fontSize)).to.be.at.least(16));
  });
});
```

- [ ] **Step 2: Run focused unit and E2E checks**

Run: `pnpm --filter @font/english-world exec vitest run src/page/englishWorldMobile/app src/page/englishWorldMobile/offline src/page/englishWorldMobile/pwa`

Run: `pnpm --filter @font/english-world e2e -- --spec cypress/e2e/english-world-mobile-responsive.cy.ts`

Expected: PASS at every width; no desktop navigation appears.

- [ ] **Step 3: Commit**

```bash
git add apps/english-world/cypress/e2e/english-world-mobile-responsive.cy.ts apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.test.tsx
git commit -m "test: cover mobile PWA foundation"
```
