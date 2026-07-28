# English World Desktop Workspace Density Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand operational desktop pages to a 1560px workspace and remove redundant headings and explanatory copy without changing business behavior.

**Architecture:** Keep `EnglishWorldLayout` as the single responsive shell and change its desktop content width in `EnglishWorld.css`. Make the shared page header support compact title-only usage, then simplify each page at its existing component boundary; focused review and settings content retain their current internal width limits.

**Tech Stack:** React 18, TypeScript, Ant Design 5, CSS, Vitest, Testing Library, Vite

## Global Constraints

- Existing API calls, state transitions, routes, button handlers, and form behavior must not change.
- Desktop `.english-world-main` max width is exactly `1560px`.
- `recite-loop` remains `1120px`; `system-settings-page` remains `1080px`; `system-settings-form` remains `860px`.
- Remove only repeated headings, decorative English eyebrow labels, and capability descriptions.
- Preserve field help, status feedback, error reasons, empty states, and action labels.
- Existing mobile responsive behavior remains intact.
- Preserve all unrelated worktree changes.

---

### Task 1: Lock the Desktop Width Contract

**Files:**
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.visual.test.ts`
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.css`

**Interfaces:**
- Consumes: `.english-world-main`, `.recite-loop`, `.system-settings-page`, `.system-settings-form`
- Produces: a shared 1560px desktop workspace with unchanged focused-content limits

- [ ] **Step 1: Write the failing visual-style assertions**

```ts
expect(styles).toMatch(
  /\.english-world-main\s*\{[^}]*max-width:\s*1560px;[^}]*margin:\s*0 auto;/s,
);
expect(styles).toMatch(/\.recite-loop\s*\{[^}]*max-width:\s*1120px;/s);
expect(styles).toMatch(/\.system-settings-page\s*\{[^}]*max-width:\s*1080px;/s);
expect(styles).toMatch(/\.system-settings-form\s*\{[^}]*max-width:\s*860px;/s);
```

- [ ] **Step 2: Run the visual test and verify RED**

Run: `pnpm --filter @font/english-world test -- --run src/page/englishWorld/EnglishWorld.visual.test.ts`

Expected: FAIL because `.english-world-main` still declares `1180px`.

- [ ] **Step 3: Apply the shared width and stable cockpit columns**

```css
.english-world-main {
  width: 100%;
  max-width: 1560px;
}

.learning-cockpit-grid {
  grid-template-columns: minmax(0, 1fr) minmax(320px, 360px);
}
```

Remove the page-specific `:has(.bulk-import-page)` / `:has(.overwrite-stats-page)` width override because it becomes redundant.

- [ ] **Step 4: Run the visual test and verify GREEN**

Run: `pnpm --filter @font/english-world test -- --run src/page/englishWorld/EnglishWorld.visual.test.ts`

Expected: PASS.

---

### Task 2: Simplify Today and Word Library Entry Hierarchy

**Files:**
- Modify: `apps/english-world/src/page/englishWorld/cockpit/LearningCockpitPage.test.tsx`
- Modify: `apps/english-world/src/page/englishWorld/cockpit/LearningCockpitPage.tsx`
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.test.tsx`
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.tsx`
- Modify: `apps/english-world/src/page/englishWorld/component/EnglishWorldPageHeader.tsx`
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.css`

**Interfaces:**
- Consumes: existing `EnglishWorldPageHeader` title and actions
- Produces: optional `description?: string`, optional `compact?: boolean`, and a direct-to-task Today page

- [ ] **Step 1: Add failing copy-density tests**

```ts
expect(screen.queryByText("今天的学习重点")).not.toBeInTheDocument();
expect(screen.queryByText("完成最重要的一步，再进入语境巩固。")).not.toBeInTheDocument();
expect(await screen.findByText("今天先做这一步")).toBeInTheDocument();
```

```ts
expect(screen.getByRole("heading", { name: "词库" })).toBeInTheDocument();
expect(screen.queryByText("词汇资产")).not.toBeInTheDocument();
expect(
  screen.queryByText("集中管理释义、音标、掌握程度和学习来源。"),
).not.toBeInTheDocument();
```

- [ ] **Step 2: Run both component tests and verify RED**

Run: `pnpm --filter @font/english-world test -- --run src/page/englishWorld/cockpit/LearningCockpitPage.test.tsx src/page/englishWorld/EnglishWorld.test.tsx`

Expected: FAIL on the old Hero and page-header copy.

- [ ] **Step 3: Remove the Today Hero and compact the word-library header**

Delete the `learning-cockpit-hero` section from `LearningCockpitPage`.

Update the shared header contract:

```tsx
type EnglishWorldPageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  compact?: boolean;
};
```

Render the paragraph only when `description` is present, and append `english-world-page-header-compact` when `compact` is true.

Use it in the word library as:

```tsx
<EnglishWorldPageHeader
  compact
  title="词库"
  actions={/* existing buttons unchanged */}
/>
```

- [ ] **Step 4: Add compact spacing styles**

```css
.english-world-page-header-compact {
  min-height: 40px;
  align-items: center;
  padding-block: 0;
}

.english-world-page-header-compact h1 {
  font-size: 24px;
}
```

- [ ] **Step 5: Re-run both tests and verify GREEN**

Run: `pnpm --filter @font/english-world test -- --run src/page/englishWorld/cockpit/LearningCockpitPage.test.tsx src/page/englishWorld/EnglishWorld.test.tsx`

Expected: PASS.

---

### Task 3: Simplify Context Lab and AI Lookup

**Files:**
- Modify: `apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.test.tsx`
- Modify: `apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.tsx`
- Modify: `apps/english-world/src/page/englishWorld/component/WordAgentTab.test.tsx`
- Modify: `apps/english-world/src/page/englishWorld/component/WordAgentTab.tsx`
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.css`

**Interfaces:**
- Consumes: existing Context Lab and Word Agent controls
- Produces: compact page titles without changing query, generation, refresh, or download handlers

- [ ] **Step 1: Add failing copy-density assertions**

```ts
expect(screen.queryByText("Create")).not.toBeInTheDocument();
expect(screen.queryByText("Tasks")).not.toBeInTheDocument();
expect(
  screen.queryByText("创建练习包，在弹窗中完成阅读、答题与复盘"),
).not.toBeInTheDocument();
expect(
  screen.queryByText("选择一组词，生成一套可阅读、可做题、可复盘的练习包。"),
).not.toBeInTheDocument();
```

```ts
expect(screen.getByRole("heading", { name: "查词" })).toBeInTheDocument();
expect(screen.queryByText("AI 单词查询")).not.toBeInTheDocument();
expect(
  screen.queryByText("输入单词、短语或一组薄弱词，返回释义、音标、例句和雅思语境。"),
).not.toBeInTheDocument();
```

- [ ] **Step 2: Run Context Lab and Word Agent tests and verify RED**

Run: `pnpm --filter @font/english-world test -- --run src/page/englishWorld/contextLab/ContextLabPage.test.tsx src/page/englishWorld/component/WordAgentTab.test.tsx`

Expected: FAIL because the redundant labels still render.

- [ ] **Step 3: Remove duplicate descriptions and English labels**

Keep “AI 语境实验室”, “生成练习”, and “练习包”; remove the utility subtitle, `Create`, `Tasks`, and the generator capability sentence. Keep source controls, search, filters, task statuses, and empty-state text unchanged.

Keep the Word Agent `<h1>查词</h1>` and remove `word-agent-kicker` plus the Hero paragraph.

- [ ] **Step 4: Rebalance the Word Agent workspace**

```css
.word-agent-page {
  max-width: 1180px;
  padding-top: 0;
}

.word-agent-hero {
  align-items: flex-start;
  text-align: left;
}

.word-agent-hero h1 {
  font-size: 24px;
}
```

- [ ] **Step 5: Re-run both tests and verify GREEN**

Run: `pnpm --filter @font/english-world test -- --run src/page/englishWorld/contextLab/ContextLabPage.test.tsx src/page/englishWorld/component/WordAgentTab.test.tsx`

Expected: PASS.

---

### Task 4: Compact Analytics, Settings, and IELTS Core

**Files:**
- Modify: `apps/english-world/src/page/englishWorld/component/EnglishStats.test.tsx`
- Modify: `apps/english-world/src/page/englishWorld/component/EnglishStats.tsx`
- Modify: `apps/english-world/src/page/englishWorld/component/SystemSettingsPage.test.tsx`
- Modify: `apps/english-world/src/page/englishWorld/component/SystemSettingsPage.tsx`
- Modify: `apps/english-world/src/page/englishWorld/ieltsCore/IeltsCoreReviewPage.test.tsx`
- Modify: `apps/english-world/src/page/englishWorld/ieltsCore/IeltsCoreReviewPage.tsx`
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.css`

**Interfaces:**
- Consumes: the compact `EnglishWorldPageHeader` from Task 2
- Produces: title-only analytics/settings headers and a compact IELTS title row

- [ ] **Step 1: Add failing tests for removed labels**

```ts
expect(screen.queryByText("学习反馈")).not.toBeInTheDocument();
expect(screen.queryByText("偏好设置")).not.toBeInTheDocument();
expect(screen.queryByText("IELTS Core Review")).not.toBeInTheDocument();
expect(screen.queryByText("Filter")).not.toBeInTheDocument();
expect(screen.queryByText("Queue")).not.toBeInTheDocument();
```

- [ ] **Step 2: Run the three test files and verify RED**

Run: `pnpm --filter @font/english-world test -- --run src/page/englishWorld/component/EnglishStats.test.tsx src/page/englishWorld/component/SystemSettingsPage.test.tsx src/page/englishWorld/ieltsCore/IeltsCoreReviewPage.test.tsx`

Expected: FAIL on existing eyebrow labels.

- [ ] **Step 3: Use title-only compact headers**

```tsx
<EnglishWorldPageHeader compact title="学习数据" />
```

```tsx
<EnglishWorldPageHeader
  compact
  title="系统设置"
  actions={/* existing reset/save actions unchanged */}
/>
```

For IELTS Core, keep “雅思核心复习” and “核心词优先”, remove the Hero paragraph and `IELTS Core Review`, `Filter`, `Queue`, and `Audit` labels. Keep Chinese card titles and helper text.

- [ ] **Step 4: Re-run the three tests and verify GREEN**

Run: `pnpm --filter @font/english-world test -- --run src/page/englishWorld/component/EnglishStats.test.tsx src/page/englishWorld/component/SystemSettingsPage.test.tsx src/page/englishWorld/ieltsCore/IeltsCoreReviewPage.test.tsx`

Expected: PASS.

---

### Task 5: Integrate Memory Map and Review Into the Shared Density

**Files:**
- Modify: `apps/english-world/src/page/englishWorld/memoryMap/MemoryMapPage.test.tsx`
- Modify: `apps/english-world/src/page/englishWorld/memoryMap/MemoryMapPage.tsx`
- Modify: `apps/english-world/src/page/englishWorld/recite/RecitePage.test.tsx`
- Modify: `apps/english-world/src/page/englishWorld/recite/RecitePage.tsx`
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.css`

**Interfaces:**
- Consumes: the shared 1560px shell and existing Memory Map / review state
- Produces: a shell-integrated Memory Map and a review studio without decorative English kicker copy

- [ ] **Step 1: Add failing presentation tests**

```ts
expect(screen.getByRole("heading", { name: "记忆地图" })).toBeInTheDocument();
expect(screen.queryByText("词汇关联")).not.toBeInTheDocument();
expect(container.querySelector(".memory-map-page")).toBeInTheDocument();
```

```ts
expect(screen.queryByText("REVIEW STUDIO")).not.toBeInTheDocument();
expect(screen.getByRole("heading", { name: "默写训练舱" })).toBeInTheDocument();
```

- [ ] **Step 2: Run Memory Map and review tests and verify RED**

Run: `pnpm --filter @font/english-world test -- --run src/page/englishWorld/memoryMap/MemoryMapPage.test.tsx src/page/englishWorld/recite/RecitePage.test.tsx`

Expected: FAIL because the old eyebrow labels and root styling remain.

- [ ] **Step 3: Simplify the Memory Map root**

Replace:

```tsx
<div className="min-h-screen bg-[#f0f2f5] p-6 lg:p-10 text-slate-700">
```

with:

```tsx
<div className="memory-map-page text-slate-700">
```

Remove “词汇关联” and the introductory paragraph; retain the “记忆地图” heading and all metrics/workspace content.

```css
.memory-map-page {
  min-height: 100%;
  padding: 0;
}

.memory-map-page > section:first-child {
  margin-bottom: 16px;
}
```

- [ ] **Step 4: Remove only the review studio kicker**

Delete `<Text className="recite-session-kicker">REVIEW STUDIO</Text>` and keep “默写训练舱”, direction guidance, question counters, progress, history, and result actions.

- [ ] **Step 5: Re-run both tests and verify GREEN**

Run: `pnpm --filter @font/english-world test -- --run src/page/englishWorld/memoryMap/MemoryMapPage.test.tsx src/page/englishWorld/recite/RecitePage.test.tsx`

Expected: PASS.

---

### Task 6: Full Regression and Visual Acceptance

**Files:**
- Review only: all modified files above

**Interfaces:**
- Consumes: Tasks 1-5
- Produces: verified desktop and mobile presentation with no business regressions

- [ ] **Step 1: Check the final diff and whitespace**

Run: `git diff --check`

Expected: no output and exit code 0.

- [ ] **Step 2: Run the full English World test suite**

Run: `pnpm --filter @font/english-world test -- --run`

Expected: all test files and tests pass.

- [ ] **Step 3: Build the production bundle**

Run: `pnpm --filter @font/english-world build`

Expected: exit code 0.

- [ ] **Step 4: Inspect the application at 1920x1080**

Open every desktop navigation page and confirm:

```text
Today: no redundant Hero; task card starts near the top.
Word library: compact title row; filter and table use the wider canvas.
Bulk import / overwrite stats: unchanged behavior and aligned width.
Context Lab: full-width shell; no duplicate English labels.
IELTS Core / Memory Map / Analytics: wider data workspace without overlap.
AI lookup: compact title and readable 1180px command/results width.
Review / Settings: focused inner width remains centered.
```

- [ ] **Step 5: Inspect responsive behavior at 390x844**

Check Today, Word Library, and Context Lab for horizontal overflow, clipped buttons, overlapping text, and preserved navigation behavior.

- [ ] **Step 6: Report residual warnings separately**

Report existing Browserslist, chunk-size, Ant Design, or jsdom warnings only if they appear; do not describe them as failures when commands exit successfully.
