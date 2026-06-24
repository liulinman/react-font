# English World Route-First Cockpit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the English World homepage feel like one daily learning route instead of a crowded set of equal-weight entries.

**Architecture:** Keep the existing cockpit, Daily Coach, Memory Map, and navigation contracts. Change only presentation hierarchy: compact status strip, Daily Coach as the primary card, and side-column tools as lower-priority support.

**Tech Stack:** React 18, TypeScript, Ant Design, Vitest, existing English World CSS.

## Global Constraints

- Do not change backend APIs or route paths.
- Do not change login screens or mobile pages.
- Preserve Daily Coach action navigation to review and Context Lab.
- Keep card radius at 8px or less and avoid nested cards.

---

### Task 1: Route-First Cockpit Structure

**Files:**
- Modify: `apps/english-world/src/page/englishWorld/cockpit/LearningCockpitPage.test.tsx`
- Modify: `apps/english-world/src/page/englishWorld/cockpit/LearningCockpitPage.tsx`
- Modify: `apps/english-world/src/page/englishWorld/dailyCoach/CoachSummaryPanel.tsx`

**Interfaces:**
- Consumes: `DailyCoachSummary`, `DailyCoachAction`, `MemoryMapOverview`
- Produces: homepage title text `今日学习路线`, status strip labelled `今日学习状态`, and existing review/context navigation behavior

- [x] **Step 1: Write the failing test**

Assert that the cockpit renders `今日学习路线`, exposes `aria-label="今日学习状态"`, and no longer renders `.learning-cockpit-stats`.

- [x] **Step 2: Run the focused test and verify it fails**

Run: `pnpm --filter @font/english-world exec vitest run src/page/englishWorld/cockpit/LearningCockpitPage.test.tsx`

Expected: FAIL because the old homepage still renders `AI Learning Cockpit` and `.learning-cockpit-stats`.

- [x] **Step 3: Update cockpit structure**

Replace the old title with `今日学习路线`, replace three large `Statistic` cards with a compact status strip, rename the Context Lab card label to a supporting next-step, and move word library/statistics into a lower-priority tools card.

- [x] **Step 4: Remove duplicate Daily Coach CTAs**

When suggested actions exist, keep the route action buttons and remove the extra bottom `开始今日复习` / `进入语境练习` pair. When no suggested actions exist, keep one fallback `开始今日复习` button.

- [x] **Step 5: Run the focused test and verify it passes**

Run: `pnpm --filter @font/english-world exec vitest run src/page/englishWorld/cockpit/LearningCockpitPage.test.tsx`

Expected: PASS.

### Task 2: Visual Hierarchy Styling

**Files:**
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.css`

**Interfaces:**
- Consumes: `.learning-cockpit-status-strip`, `.learning-cockpit-card-primary`, `.learning-cockpit-context-card`, `.learning-cockpit-side-heading`
- Produces: a lower-noise route-first layout that stays responsive under 980px

- [x] **Step 1: Replace large stats styling**

Remove `.learning-cockpit-stats` styling and add `.learning-cockpit-status-strip` with compact inline rows.

- [x] **Step 2: Lower secondary card weight**

Keep Daily Coach visually primary with a subtle shadow. Change Context Lab from a dark high-emphasis card to a quieter supporting card.

- [x] **Step 3: Update responsive rules**

Replace the old `.learning-cockpit-stats` responsive selector with `.learning-cockpit-status-strip`.

- [x] **Step 4: Run production verification**

Run: `pnpm --filter @font/english-world build`

Expected: PASS.
