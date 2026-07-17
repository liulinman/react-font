# English World Focus Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the Gemini-designed Focus Studio desktop layout across the shared frame, Today route, word library surfaces, review studio, and learning statistics without changing routes or backend contracts.

**Architecture:** Keep `EnglishWorldLayout` as the shared shell and add a small pure context-label/date module plus a presentational context bar. Recompose the existing Today data into a main route card and support rail, polish review/result semantics in place, and drive ECharts from active theme tokens. Centralize the visual behavior in the existing semantic theme and English World CSS files.

**Tech Stack:** React 18, TypeScript 5.7, React Router 7, Ant Design 5, ECharts 6, CSS, Vitest, Testing Library, Vite

## Global Constraints

- Preserve all existing routes, APIs, authentication, database contracts, query behavior, and mobile views.
- Expanded desktop sidebar is `228px`; collapsed sidebar remains `72px`.
- Desktop content container is `1180px` maximum with `32px` horizontal padding.
- Keep the four primary navigation destinations and existing contextual tool entry points.
- No new backend request, metric, learning task, generated content, or dependency.
- Motion is restrained and disabled by `prefers-reduced-motion`.
- Do not remove existing error recovery, empty states, answer preservation, or optimistic-update rollback behavior.
- Preserve the baseline of 36 test files and 163 tests.

---

### Task 1: Shared context bar and deterministic desktop frame

**Files:**
- Create: `apps/english-world/src/page/englishWorld/layout/englishWorldContext.ts`
- Create: `apps/english-world/src/page/englishWorld/layout/englishWorldContext.test.ts`
- Create: `apps/english-world/src/page/englishWorld/layout/EnglishWorldContextBar.tsx`
- Modify: `apps/english-world/src/page/englishWorld/layout/EnglishWorldLayout.tsx`
- Modify: `apps/english-world/src/page/englishWorld/layout/EnglishWorldLayout.test.tsx`

**Interfaces:**
- Produces: `getEnglishWorldSectionLabel(activeKey: string): string`.
- Produces: `formatEnglishWorldDate(date: Date): string`.
- Produces: `EnglishWorldContextBar({ activeKey, now? })`.
- Consumes: existing `activeKey` from `EnglishWorldLayout`.

- [ ] **Step 1: Write failing pure helper tests**

```ts
expect(getEnglishWorldSectionLabel("cockpit")).toBe("今天");
expect(getEnglishWorldSectionLabel("memoryMap")).toBe("词库");
expect(getEnglishWorldSectionLabel("contextLab")).toBe("学习");
expect(formatEnglishWorldDate(new Date("2026-07-17T08:00:00+08:00"))).toBe(
  "7 月 17 日 · 星期五",
);
```

- [ ] **Step 2: Run the helper test and verify RED**

Run: `pnpm --filter @font/english-world test --run src/page/englishWorld/layout/englishWorldContext.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the pure mapping and formatter**

```ts
const PRIMARY_LABELS: Record<string, string> = {
  cockpit: "今天",
  words: "词库",
  recite: "学习",
  stats: "数据",
  aiWord: "词库",
  memoryMap: "词库",
  contextLab: "学习",
  setting: "设置",
};

export function getEnglishWorldSectionLabel(activeKey: string) {
  return PRIMARY_LABELS[activeKey] ?? "English World";
}

export function formatEnglishWorldDate(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    weekday: "long",
  })
    .format(date)
    .replace("月", " 月 ")
    .replace("日", " 日 · ");
}
```

- [ ] **Step 4: Add the context bar layout test**

Render `EnglishWorldLayout activeKey="words"` and assert a `banner` landmark contains `English World`, `词库`, and an element with class `english-world-context-date`.

- [ ] **Step 5: Run the layout test and verify RED**

Run: `pnpm --filter @font/english-world test --run src/page/englishWorld/layout/EnglishWorldLayout.test.tsx`

Expected: FAIL because no context bar exists.

- [ ] **Step 6: Implement and compose `EnglishWorldContextBar`**

```tsx
export function EnglishWorldContextBar({ activeKey, now = new Date() }: Props) {
  return (
    <header className="english-world-context-bar">
      <div className="english-world-context-path">
        <span>English World</span><span aria-hidden="true">/</span>
        <strong>{getEnglishWorldSectionLabel(activeKey)}</strong>
      </div>
      <time className="english-world-context-date" dateTime={now.toISOString()}>
        {formatEnglishWorldDate(now)}
      </time>
    </header>
  );
}
```

Wrap the context bar and existing `<main>` in `<div className="english-world-workspace">` inside `EnglishWorldLayout`.

- [ ] **Step 7: Run helper and layout tests and verify GREEN**

Run: `pnpm --filter @font/english-world test --run src/page/englishWorld/layout/englishWorldContext.test.ts src/page/englishWorld/layout/EnglishWorldLayout.test.tsx`

Expected: both files PASS.

- [ ] **Step 8: Commit the frame behavior**

```bash
git add apps/english-world/src/page/englishWorld/layout
git commit -m "feat(english-world): add desktop context bar"
```

### Task 2: Focused Today route and learning snapshot

**Files:**
- Create: `apps/english-world/src/page/englishWorld/cockpit/LearningSnapshot.tsx`
- Create: `apps/english-world/src/page/englishWorld/cockpit/LearningSnapshot.test.tsx`
- Modify: `apps/english-world/src/page/englishWorld/cockpit/LearningCockpitPage.tsx`
- Modify: `apps/english-world/src/page/englishWorld/cockpit/LearningCockpitPage.test.tsx`
- Modify: `apps/english-world/src/page/englishWorld/dailyCoach/CoachSummaryPanel.tsx`

**Interfaces:**
- Consumes: `DailyCoachSummary` already loaded by `LearningCockpitPage`.
- Produces: `LearningSnapshot({ summary })` with the accessible name `学习概览`.
- Keeps: `CoachSummaryPanel` callback signatures unchanged.

- [ ] **Step 1: Write the failing snapshot test**

```tsx
render(<LearningSnapshot summary={summary} />);
expect(screen.getByRole("region", { name: "学习概览" })).toBeInTheDocument();
expect(screen.getByText("513")).toBeInTheDocument();
expect(screen.getByText("4")).toBeInTheDocument();
expect(screen.getByText("84%")).toBeInTheDocument();
```

- [ ] **Step 2: Run the snapshot test and verify RED**

Run: `pnpm --filter @font/english-world test --run src/page/englishWorld/cockpit/LearningSnapshot.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the presentational snapshot**

Use one `section.learning-snapshot` and three plain metric cells labeled `词库总量`, `今日新增`, and `近期正确率`. Do not call hooks or request data.

- [ ] **Step 4: Update the cockpit composition test**

Change the route-first expectations to require `.learning-cockpit-support-rail`, the `学习概览` region inside it, and `记忆地图`. Assert `.learning-cockpit-status-strip` is absent and `requestMock` remains called exactly for `/daily-coach/summary` and `/memory-map/overview`.

- [ ] **Step 5: Run the cockpit test and verify RED**

Run: `pnpm --filter @font/english-world test --run src/page/englishWorld/cockpit/LearningCockpitPage.test.tsx`

Expected: FAIL because metrics still render as a full-width strip.

- [ ] **Step 6: Recompose the Today route**

Render `CoachSummaryPanel` in `.learning-cockpit-main-column`; render `LearningSnapshot` and `MemoryMapSummary` in `.learning-cockpit-support-rail`. Keep unavailable states in the same columns. Update the hero copy to `今天的学习重点` and `完成最重要的一步，再进入语境巩固。`.

- [ ] **Step 7: Simplify coach action semantics**

Add modifier class `learning-cockpit-task-item-primary` to index zero, keep only the first action button primary, and add `aria-current="step"` to the first action row. Keep the existing navigation callbacks and labels.

- [ ] **Step 8: Run focused tests and verify GREEN**

Run: `pnpm --filter @font/english-world test --run src/page/englishWorld/cockpit/LearningSnapshot.test.tsx src/page/englishWorld/cockpit/LearningCockpitPage.test.tsx`

Expected: both files PASS and no extra API call appears.

- [ ] **Step 9: Commit the Today route**

```bash
git add apps/english-world/src/page/englishWorld/cockpit apps/english-world/src/page/englishWorld/dailyCoach/CoachSummaryPanel.tsx
git commit -m "feat(english-world): focus the daily learning route"
```

### Task 3: Semantic surfaces, desktop grid, and restrained motion

**Files:**
- Modify: `apps/english-world/src/theme/theme.css`
- Modify: `apps/english-world/src/theme/theme.visual.test.ts`
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.css`
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.visual.test.ts`
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.sidebar.visual.test.ts`

**Interfaces:**
- Produces CSS tokens: `--ew-success`, `--ew-warning`, `--ew-danger`, `--ew-shadow-soft`, `--ew-shadow-lifted`, `--ew-radius-sm`, `--ew-radius-md`, and `--ew-radius-lg`.
- Consumes the class names produced by Tasks 1 and 2.

- [ ] **Step 1: Add failing CSS contract assertions**

Assert the exact contracts below:

```ts
expect(themeStyles).toContain("--ew-shadow-soft:");
expect(styles).toMatch(/\.english-world-header\s*\{[^}]*width:\s*228px;/s);
expect(styles).toMatch(/\.english-world-main-inner|\.english-world-main\s*>/);
expect(styles).toContain("max-width: 1180px");
expect(styles).toMatch(/\.learning-cockpit-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1\.55fr\) minmax\(280px, 0\.7fr\);/s);
expect(styles).toContain("@keyframes english-world-enter");
expect(styles).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*animation:\s*none/);
```

- [ ] **Step 2: Run visual tests and verify RED**

Run: `pnpm --filter @font/english-world test --run src/theme/theme.visual.test.ts src/page/englishWorld/EnglishWorld.visual.test.ts src/page/englishWorld/EnglishWorld.sidebar.visual.test.ts`

Expected: FAIL on missing tokens, `228px`, container, grid, or entrance animation.

- [ ] **Step 3: Add semantic tokens**

Add the specified semantic colors, two shadows, and three radii to `:root`. Override colors and shadows under the existing dark-theme root. Accent variants continue to override `--ew-accent` and `--ew-accent-soft` only.

- [ ] **Step 4: Implement the frame and context bar CSS**

Set the expanded sidebar to `228px`, main offset to `228px`, workspace to `min-width: 0`, context bar to sticky `64px`, and the main content to a centered `1180px` container with `32px` horizontal padding. Preserve the `72px` collapsed rail and the existing `900px` responsive guard.

- [ ] **Step 5: Implement Today, surface, and motion CSS**

Use the specified two-column grid, `24px` gap, 18px primary radius, soft shadows, divider-based coach task rows, and quiet support rail. Apply `english-world-enter 220ms cubic-bezier(0.2, 0.8, 0.2, 1)` to route roots and `160ms` hover transitions with at most `translateY(-1px)`.

- [ ] **Step 6: Implement reduced motion**

Within `prefers-reduced-motion`, disable new route, card, progress, and question animations/transitions and reset transforms to `none`.

- [ ] **Step 7: Run visual contracts and focused component tests**

Run: `pnpm --filter @font/english-world test --run src/theme/theme.visual.test.ts src/page/englishWorld/EnglishWorld.visual.test.ts src/page/englishWorld/EnglishWorld.sidebar.visual.test.ts src/page/englishWorld/layout/EnglishWorldLayout.test.tsx src/page/englishWorld/cockpit/LearningCockpitPage.test.tsx`

Expected: all selected files PASS.

- [ ] **Step 8: Commit the visual system**

```bash
git add apps/english-world/src/theme/theme.css apps/english-world/src/theme/theme.visual.test.ts apps/english-world/src/page/englishWorld/EnglishWorld.css apps/english-world/src/page/englishWorld/EnglishWorld.visual.test.ts apps/english-world/src/page/englishWorld/EnglishWorld.sidebar.visual.test.ts
git commit -m "style(english-world): apply focus studio visual system"
```

### Task 4: Review Studio motion and supportive result hierarchy

**Files:**
- Modify: `apps/english-world/src/page/englishWorld/recite/RecitePage.tsx`
- Modify: `apps/english-world/src/page/englishWorld/recite/RecitePage.test.tsx`
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.css`

**Interfaces:**
- Keeps existing start, submit, retry, repair, history, and statistics contracts.
- Produces `.recite-question-stage` keyed by `currentQuestion.wordId`.
- Produces `.recite-result-actions` with one primary recovery action.

- [ ] **Step 1: Add failing review semantics tests**

After starting a session, assert `.recite-question-stage` exists. After submitting one wrong answer, assert `再练错词` is the only primary button in `.recite-result-actions`, it does not have Ant Design danger styling, and `回到今日路线` remains a secondary button.

- [ ] **Step 2: Run the review test and verify RED**

Run: `pnpm --filter @font/english-world test --run src/page/englishWorld/recite/RecitePage.test.tsx`

Expected: FAIL because the stage and result-action classes do not exist and repair is marked danger.

- [ ] **Step 3: Add the keyed question stage**

Wrap the prompt and answer dock in:

```tsx
<div className="recite-question-stage" key={currentQuestion.wordId}>
  {/* existing prompt and answer dock */}
</div>
```

This remounts only the visual stage when the question changes; input values remain controlled by `answers`.

- [ ] **Step 4: Calm the result hierarchy**

Remove `danger` from the repair button, apply `className="recite-result-actions"` to its `Space`, and change the recovery copy to `优先巩固本轮没记牢的词，完成后再回到今日路线。`. Keep the result ordering and handlers unchanged.

- [ ] **Step 5: Add review CSS**

Use a quiet surface, integrated answer divider, subtle accent focus ring, `recite-question-enter 160ms`, smooth progress-dot transitions, soft semantic result backgrounds, and the global reduced-motion override.

- [ ] **Step 6: Run review and visual tests and verify GREEN**

Run: `pnpm --filter @font/english-world test --run src/page/englishWorld/recite/RecitePage.test.tsx src/page/englishWorld/EnglishWorld.visual.test.ts`

Expected: both files PASS, including keyboard and answer-preservation tests.

- [ ] **Step 7: Commit the review experience**

```bash
git add apps/english-world/src/page/englishWorld/recite/RecitePage.tsx apps/english-world/src/page/englishWorld/recite/RecitePage.test.tsx apps/english-world/src/page/englishWorld/EnglishWorld.css
git commit -m "style(english-world): refine review studio feedback"
```

### Task 5: Theme-aware statistics

**Files:**
- Modify: `apps/english-world/src/page/englishWorld/component/EnglishStats.tsx`
- Modify: `apps/english-world/src/page/englishWorld/component/EnglishStats.test.tsx`

**Interfaces:**
- Consumes `theme.useToken()` from Ant Design.
- Produces bar, data-zoom, summary, label, border, and pie colors from the active token set.
- Keeps `englishStats` request and response mapping unchanged.

- [ ] **Step 1: Capture chart options in the test**

Replace the chart mock with a hoisted `chartOptions` array and push each `option` received. Mock `theme.useToken()` only if the default ConfigProvider is unavailable in the test. Assert the bar series color equals the active `colorPrimary`, axis text equals `colorTextSecondary`, and pie border equals `colorBgContainer`.

- [ ] **Step 2: Run the statistics test and verify RED**

Run: `pnpm --filter @font/english-world test --run src/page/englishWorld/component/EnglishStats.test.tsx`

Expected: FAIL because chart options still contain fixed colors.

- [ ] **Step 3: Implement theme-aware options**

```tsx
const { token } = theme.useToken();
const semanticColors = [
  token.colorPrimary,
  token.colorSuccess,
  token.colorWarning,
  token.colorInfo,
  token.colorError,
  token.colorCyan,
  token.colorOrange,
  token.colorMagenta,
  token.colorTextSecondary,
];
```

Use these tokens for summary values, part-of-speech series, data zoom, axes, labels, borders, and background-dependent pie separators. Preserve the same data and chart shapes.

- [ ] **Step 4: Run statistics tests and verify GREEN**

Run: `pnpm --filter @font/english-world test --run src/page/englishWorld/component/EnglishStats.test.tsx`

Expected: both existing behavior tests and the theme assertion PASS.

- [ ] **Step 5: Commit statistics integration**

```bash
git add apps/english-world/src/page/englishWorld/component/EnglishStats.tsx apps/english-world/src/page/englishWorld/component/EnglishStats.test.tsx
git commit -m "style(english-world): align charts with active theme"
```

### Task 6: Full verification, browser evidence, and Gemini approval loop

**Files:**
- Verify all files changed in Tasks 1–5.
- Store browser screenshots under ignored `apps/english-world/cypress/screenshots/` or `/tmp`.

**Interfaces:**
- Produces fresh unit, build, lint, diff, screenshot, and Gemini-review evidence.

- [ ] **Step 1: Run the complete test suite**

Run: `pnpm --filter @font/english-world test --run`

Expected: 36 files and at least 163 tests PASS with zero failures.

- [ ] **Step 2: Run the production build**

Run: `pnpm --filter @font/english-world build`

Expected: TypeScript and Vite exit `0`.

- [ ] **Step 3: Run focused lint**

Run ESLint over every modified `.ts` and `.tsx` file from Tasks 1–5.

Expected: exit `0` with no errors.

- [ ] **Step 4: Verify the diff**

Run: `git diff --check HEAD~5..HEAD && git status --short --branch && git diff --stat cc0f1f4..HEAD`

Expected: no whitespace errors and no mobile, backend, API, or unrelated file changes.

- [ ] **Step 5: Capture the desktop UI**

Start Vite on an available localhost port. Use the existing Cypress fixtures/intercepts or the local browser to capture Today, word library, Review Studio, and result state at `1440×900`, including one expanded and one collapsed sidebar view.

- [ ] **Step 6: Ask Gemini for a strict review**

Provide Gemini the design spec, changed-file diff, test/build/lint summaries, and screenshots. Require exactly one verdict line: `VERDICT: PASS` or `VERDICT: FAIL`, followed by blocking findings only. The rubric is layout hierarchy, visual coherence, motion restraint, accessibility, responsive safety, feature preservation, and evidence quality.

- [ ] **Step 7: Correct every Gemini blocking finding with TDD**

For each `FAIL` finding, add or adjust a failing test/visual contract first, run it to confirm RED, implement the smallest correction, rerun focused verification, capture refreshed evidence, and resubmit to Gemini.

- [ ] **Step 8: Stop only on explicit approval**

The loop completes only when Gemini returns `VERDICT: PASS` and the fresh full test/build/lint/diff checks remain green.
