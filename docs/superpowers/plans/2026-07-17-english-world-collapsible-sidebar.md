# English World Collapsible Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent desktop sidebar collapse control that keeps a 72px icon rail and expands the content area.

**Architecture:** `EnglishWorldLayout` owns the persisted collapse state and applies a modifier class to the shared shell. `EnglishHeader` remains a controlled presentation component, while all desktop pages use the shared layout so width and content padding change together.

**Tech Stack:** React 18, TypeScript, Ant Design 5, CSS, Vitest, Testing Library, Vite

## Global Constraints

- Expanded desktop sidebar width remains 236px; collapsed width is 72px.
- The storage key is exactly `english-world-sidebar-collapsed`.
- Only the stored string `true` restores the collapsed state; missing, invalid, or inaccessible storage defaults to expanded.
- At viewport widths of 900px or less, preserve the existing top navigation and hide the collapse control.
- Do not introduce Ant Design `Layout.Sider` or server-side preference storage.
- Preserve all unrelated uncommitted user changes.

---

### Task 1: Controlled sidebar presentation

**Files:**
- Modify: `apps/english-world/src/page/englishWorld/component/EnglishHeader.tsx`
- Test: `apps/english-world/src/page/englishWorld/component/EnglishHeader.test.tsx`

**Interfaces:**
- Consumes: `collapsed: boolean` and `onCollapsedChange(collapsed: boolean): void` from the shared layout.
- Produces: an accessible toggle button named `收起侧栏` or `展开侧栏` and the `english-world-header-collapsed` class.

- [ ] **Step 1: Write the failing presentation test**

Add a test that renders `EnglishHeader` with `collapsed={false}`, clicks `收起侧栏`, expects `onCollapsedChange(true)`, rerenders with `collapsed={true}`, and expects the `english-world-header-collapsed` class plus an `展开侧栏` button. Also assert the four navigation buttons retain their accessible names.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm --filter @font/english-world test --run src/page/englishWorld/component/EnglishHeader.test.tsx`

Expected: FAIL because `EnglishHeaderProps` does not accept collapse props and no sidebar toggle exists.

- [ ] **Step 3: Implement the minimal controlled header**

Extend the props with:

```ts
collapsed?: boolean;
onCollapsedChange?: (collapsed: boolean) => void;
```

Import `LeftOutlined` and `RightOutlined`, apply the collapsed modifier class to `<aside>`, and add:

```tsx
<button
  type="button"
  className="english-world-sidebar-toggle"
  aria-label={collapsed ? "展开侧栏" : "收起侧栏"}
  title={collapsed ? "展开侧栏" : "收起侧栏"}
  onClick={() => onCollapsedChange?.(!collapsed)}
>
  {collapsed ? <RightOutlined /> : <LeftOutlined />}
</button>
```

Keep all navigation labels in the DOM so icon-only buttons retain accessible names.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `pnpm --filter @font/english-world test --run src/page/englishWorld/component/EnglishHeader.test.tsx`

Expected: all tests in the file PASS.

### Task 2: Shared persisted layout state

**Files:**
- Modify: `apps/english-world/src/page/englishWorld/layout/EnglishWorldLayout.tsx`
- Create: `apps/english-world/src/page/englishWorld/layout/EnglishWorldLayout.test.tsx`

**Interfaces:**
- Consumes: optional `onNavClick?: (key: string) => void` from pages.
- Produces: `english-world-shell-collapsed`, controlled `EnglishHeader` props, and persisted state under `english-world-sidebar-collapsed`.

- [ ] **Step 1: Write failing layout persistence tests**

Create tests that clear local storage after each case, then verify:

```tsx
render(
  <MemoryRouter>
    <EnglishWorldLayout activeKey="words">content</EnglishWorldLayout>
  </MemoryRouter>,
);
```

Clicking `收起侧栏` must add `english-world-shell-collapsed` and store `true`. A fresh render after setting `localStorage.setItem("english-world-sidebar-collapsed", "true")` must start collapsed. Invalid values must start expanded.

- [ ] **Step 2: Run the layout test and verify RED**

Run: `pnpm --filter @font/english-world test --run src/page/englishWorld/layout/EnglishWorldLayout.test.tsx`

Expected: FAIL because the layout does not own collapse state or persistence.

- [ ] **Step 3: Implement safe state initialization and persistence**

Add the exported constant and safe helpers:

```ts
export const SIDEBAR_COLLAPSED_STORAGE_KEY =
  "english-world-sidebar-collapsed";

function getInitialSidebarCollapsed() {
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}
```

Initialize state lazily, write changes inside the click handler under `try/catch`, apply the shell modifier class, and pass `collapsed`, `onCollapsedChange`, and `onNavClick` to `EnglishHeader`.

- [ ] **Step 4: Run layout and header tests and verify GREEN**

Run: `pnpm --filter @font/english-world test --run src/page/englishWorld/layout/EnglishWorldLayout.test.tsx src/page/englishWorld/component/EnglishHeader.test.tsx`

Expected: both test files PASS.

### Task 3: Adopt the shared layout on direct-shell pages

**Files:**
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.tsx`
- Modify: `apps/english-world/src/page/englishWorld/recite/RecitePage.tsx`
- Test: `apps/english-world/src/page/englishWorld/EnglishWorld.test.tsx`
- Test: `apps/english-world/src/page/englishWorld/recite/RecitePage.test.tsx`

**Interfaces:**
- Consumes: `EnglishWorldLayout({ activeKey, onNavClick, children })` from Task 2.
- Produces: consistent persisted collapse behavior on the word library, cockpit, stats, recite, and other routes.

- [ ] **Step 1: Add failing shared-layout assertions**

Update the existing page tests to assert that both direct-shell pages expose the `收起侧栏` button and that clicking it adds `english-world-shell-collapsed` to the shell without hiding page content.

- [ ] **Step 2: Run both page test files and verify RED**

Run: `pnpm --filter @font/english-world test --run src/page/englishWorld/EnglishWorld.test.tsx src/page/englishWorld/recite/RecitePage.test.tsx`

Expected: FAIL because these pages still render `EnglishHeader` and `<main>` directly.

- [ ] **Step 3: Replace duplicate shell markup with the shared layout**

In `EnglishWorld.tsx`, replace the outer shell/header/main trio with:

```tsx
<EnglishWorldLayout activeKey={activeNav} onNavClick={handleNavClick}>
  {/* existing active-page content */}
</EnglishWorldLayout>
```

In `RecitePage.tsx`, replace the outer shell/header/main trio with:

```tsx
<EnglishWorldLayout activeKey="recite">
  <div className="recite-loop">{/* existing content */}</div>
</EnglishWorldLayout>
```

Remove only now-unused `EnglishHeader` imports.

- [ ] **Step 4: Run both page tests and verify GREEN**

Run: `pnpm --filter @font/english-world test --run src/page/englishWorld/EnglishWorld.test.tsx src/page/englishWorld/recite/RecitePage.test.tsx`

Expected: both test files PASS.

### Task 4: Desktop styling and responsive guard

**Files:**
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.css`
- Test: `apps/english-world/src/page/englishWorld/EnglishWorld.visual.test.ts`

**Interfaces:**
- Consumes: `english-world-header-collapsed` and `english-world-shell-collapsed` from Tasks 1–2.
- Produces: 72px icon rail, 102px content offset, transition, and unchanged mobile navigation.

- [ ] **Step 1: Add failing visual contract assertions**

Extend the CSS contract test to read `EnglishWorld.css` and assert exact declarations for collapsed width (`72px`), collapsed main padding (`102px` left), hidden brand/user copy, centered icon buttons, toggle positioning, the `max-width: 900px` rule that hides the toggle, and the reduced-motion override.

- [ ] **Step 2: Run the visual contract test and verify RED**

Run: `pnpm --filter @font/english-world test --run src/page/englishWorld/EnglishWorld.visual.test.ts`

Expected: FAIL because collapsed CSS selectors do not exist.

- [ ] **Step 3: Implement the CSS states**

Add width/padding transitions, position the toggle at the sidebar edge, hide `.english-world-brand-copy` and `.english-world-user-name` when collapsed, center navigation/user controls, and set:

```css
.english-world-header-collapsed { width: 72px; }
.english-world-shell-collapsed .english-world-main {
  padding-left: 102px;
}
```

Inside `@media (max-width: 900px)`, force the existing full-width top header and hide `.english-world-sidebar-toggle`. Inside `@media (prefers-reduced-motion: reduce)`, disable the new transitions.

- [ ] **Step 4: Run the visual contract test and verify GREEN**

Run: `pnpm --filter @font/english-world test --run src/page/englishWorld/EnglishWorld.visual.test.ts`

Expected: PASS.

### Task 5: Full verification

**Files:**
- Verify all files changed in Tasks 1–4.

**Interfaces:**
- Consumes: completed sidebar feature.
- Produces: test, type/build, lint, and browser evidence.

- [ ] **Step 1: Run all related tests**

Run:

```bash
pnpm --filter @font/english-world test --run \
  src/page/englishWorld/component/EnglishHeader.test.tsx \
  src/page/englishWorld/layout/EnglishWorldLayout.test.tsx \
  src/page/englishWorld/EnglishWorld.test.tsx \
  src/page/englishWorld/recite/RecitePage.test.tsx \
  src/page/englishWorld/EnglishWorld.visual.test.ts
```

Expected: all selected tests PASS with zero failures.

- [ ] **Step 2: Run the production build**

Run: `pnpm --filter @font/english-world build`

Expected: TypeScript and Vite exit with code 0.

- [ ] **Step 3: Run focused lint**

Run: `pnpm --filter @font/english-world exec eslint src/page/englishWorld/component/EnglishHeader.tsx src/page/englishWorld/layout/EnglishWorldLayout.tsx src/page/englishWorld/layout/EnglishWorldLayout.test.tsx src/page/englishWorld/EnglishWorld.tsx src/page/englishWorld/recite/RecitePage.tsx`

Expected: exit code 0 with no errors.

- [ ] **Step 4: Inspect the desktop UI in a browser**

Start Vite on an available local port, open the word-library page at desktop width, click the toggle, and verify the sidebar becomes an icon rail, content expands without overlap, navigation remains usable, and refresh restores the collapsed state. Resize below 900px and verify the existing top navigation remains unchanged and no collapse button is shown.

- [ ] **Step 5: Review the final diff**

Run: `git diff --check` and `git diff -- apps/english-world/src/page/englishWorld`.

Expected: no whitespace errors and no unrelated changes introduced by this feature.
