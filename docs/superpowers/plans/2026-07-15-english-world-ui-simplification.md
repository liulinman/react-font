# English World UI Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify and simplify the authenticated English World UI without changing exercise or backend behavior.

**Architecture:** Keep all existing routes and domain components. Simplify persistent navigation, introduce one shared page-header component, and move page-level layout concerns into the existing English World shell and CSS. Page-specific business logic remains in place.

**Tech Stack:** React 18, TypeScript, React Router, Ant Design 5, Vitest, Testing Library, CSS.

## Global Constraints

- Do not change exercise-question rendering, backend APIs, authentication, or database contracts.
- Preserve all existing route paths.
- Preserve pre-existing uncommitted Context Lab, EditAddModal, and Login changes.
- Product-navigation copy is Chinese; English is limited to learning content or optional supporting copy.
- The `/englishWorld` route must remain usable at 390px viewport width.

---

### Task 1: Simplified Persistent Navigation

**Files:**
- Modify: `apps/english-world/src/page/englishWorld/component/EnglishHeader.test.tsx`
- Modify: `apps/english-world/src/page/englishWorld/component/EnglishHeader.tsx`
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.css`

**Interfaces:**
- Consumes: `getPathForNav(key: string): string`
- Produces: primary buttons `今天`, `词库`, `学习`, `数据`; user-menu item `系统设置`

- [ ] **Step 1: Write failing navigation tests**

Assert that internal copy is absent, exactly four primary destinations render, settings is absent from the persistent buttons, and clicking `学习` routes to `/englishWorld/recite`.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `pnpm --filter @font/english-world exec vitest run src/page/englishWorld/component/EnglishHeader.test.tsx`

Expected: FAIL because the current sidebar still renders eight buttons and `字段保留版`.

- [ ] **Step 3: Implement the simplified header**

Replace the grouped eight-item navigation with four items and add a user-menu settings entry that calls `navigate("/englishWorld/settings")`.

- [ ] **Step 4: Add responsive shell CSS**

At `max-width: 900px`, convert the fixed side rail into a fixed top bar and reset main content to full width. At `max-width: 560px`, visually hide button labels while preserving icon buttons and `title` attributes.

- [ ] **Step 5: Run the focused test and verify pass**

Run the command from Step 2. Expected: PASS.

### Task 2: Shared Page Header and Utility Pages

**Files:**
- Create: `apps/english-world/src/page/englishWorld/component/EnglishWorldPageHeader.tsx`
- Create: `apps/english-world/src/page/englishWorld/component/EnglishStats.test.tsx`
- Create: `apps/english-world/src/page/englishWorld/component/SystemSettingsPage.test.tsx`
- Modify: `apps/english-world/src/page/englishWorld/component/EnglishStats.tsx`
- Modify: `apps/english-world/src/page/englishWorld/component/SystemSettingsPage.tsx`
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.css`

**Interfaces:**
- Produces: `EnglishWorldPageHeader({ eyebrow, title, description, actions })`
- Produces: statistics empty state `还没有学习数据`
- Produces: settings page inside `.english-world-shell`

- [ ] **Step 1: Write failing statistics and settings tests**

Statistics zero-data test expects the empty-state message and no chart titles. Settings test expects `.english-world-shell`, the title `系统设置`, and action buttons.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `pnpm --filter @font/english-world exec vitest run src/page/englishWorld/component/EnglishStats.test.tsx src/page/englishWorld/component/SystemSettingsPage.test.tsx`

Expected: FAIL because the empty state and shared settings shell do not exist.

- [ ] **Step 3: Implement the shared page header and page states**

Add the shared component, local statistics loading/empty handling, and wrap settings with `EnglishWorldLayout`. Keep existing forms and chart calculations unchanged.

- [ ] **Step 4: Move settings layout styles into CSS**

Add `.system-settings-page` and `.system-settings-surface`; remove page-level background, top-padding, width, radius, and shadow inline styles.

- [ ] **Step 5: Run focused tests and verify pass**

Run the command from Step 2. Expected: PASS.

### Task 3: Word Library and Today Hierarchy

**Files:**
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.test.tsx`
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.tsx`
- Modify: `apps/english-world/src/page/englishWorld/cockpit/LearningCockpitPage.test.tsx`
- Modify: `apps/english-world/src/page/englishWorld/cockpit/LearningCockpitPage.tsx`
- Modify: `apps/english-world/src/page/englishWorld/dailyCoach/CoachSummaryPanel.tsx`
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.css`

**Interfaces:**
- Produces: Word Library page header with actions routing to `/englishWorld/ai-word` and `/englishWorld/memory-map`
- Produces: Chinese table empty state `词库还是空的`
- Produces: cockpit with one Daily Coach route and one Memory Map summary

- [ ] **Step 1: Write failing hierarchy tests**

Assert removal of implementation copy and duplicate cockpit cards, while preserving the primary review action and Memory Map summary.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `pnpm --filter @font/english-world exec vitest run src/page/englishWorld/EnglishWorld.test.tsx src/page/englishWorld/cockpit/LearningCockpitPage.test.tsx`

Expected: FAIL on the old implementation copy and duplicate Context Lab/tools cards.

- [ ] **Step 3: Implement the simplified page hierarchy**

Add the word-library header and contextual actions, configure the Table empty state, remove the cockpit's duplicate Context Lab/tools cards, and translate stage labels.

- [ ] **Step 4: Run focused tests and verify pass**

Run the command from Step 2. Expected: PASS.

### Task 4: Full Verification and Visual Review

**Files:**
- Verify all modified English World files.

**Interfaces:**
- Consumes: completed Tasks 1–3
- Produces: tested desktop and 390px responsive UI

- [ ] **Step 1: Run the complete English World test suite**

Run: `pnpm --filter @font/english-world exec vitest run`

Expected: all tests PASS.

- [ ] **Step 2: Run production build and diff checks**

Run: `pnpm --filter @font/english-world build && git diff --check`

Expected: exit code 0.

- [ ] **Step 3: Review the final diff**

Confirm no backend, exercise-question, authentication, or unrelated files changed and all pre-existing user edits remain present.

- [ ] **Step 4: Verify in the local browser**

Inspect `/englishWorld`, `/englishWorld/words`, `/englishWorld/stats`, and `/englishWorld/settings` at the default viewport and at 390x844. Confirm no sidebar overlap, no clipped settings title, and a clear primary action on each page.
