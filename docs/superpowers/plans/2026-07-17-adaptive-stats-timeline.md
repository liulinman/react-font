# Adaptive Statistics Timeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the all-time new-word chart readable by automatically aggregating long histories and allowing explicit day, week, or month views.

**Architecture:** Keep the API response as daily data. Add a pure timeline aggregation module that selects a default granularity from the number of days and converts daily points into day, calendar-week, or calendar-month buckets. `EnglishStats` owns the selected granularity and builds ECharts options from the aggregated points; the existing data zoom remains available only when the selected view has more than 14 points.

**Tech Stack:** React 18, TypeScript, Ant Design Segmented, ECharts, Vitest, Testing Library.

## Global Constraints

- Preserve the existing statistics API and all summary/pie-chart behavior.
- Long histories default to month view; 61–180 days default to week; up to 60 days default to day.
- The user can always switch among day, week, and month.
- Show no more than approximately 14 points initially when zoom is needed.
- Use existing theme tokens and support dark mode.
- Do not commit or push from this side task.

---

### Task 1: Timeline aggregation model

**Files:**
- Create: `apps/english-world/src/page/englishWorld/component/statsTimeline.ts`
- Test: `apps/english-world/src/page/englishWorld/component/statsTimeline.test.ts`

**Interfaces:**
- Consumes: `DailyStat[]` where each item has ISO `date` and numeric `count`.
- Produces: `StatsGranularity`, `getDefaultStatsGranularity(stats)`, and `aggregateDailyStats(stats, granularity)`.

- [ ] **Step 1: Write failing tests** for automatic threshold selection, monthly totals, and Monday-based weekly totals.
- [ ] **Step 2: Run** `pnpm exec vitest run src/page/englishWorld/component/statsTimeline.test.ts` and confirm failure because behavior is absent.
- [ ] **Step 3: Implement** ISO-date-safe aggregation without local-time conversion.
- [ ] **Step 4: Re-run the focused test** and confirm all aggregation cases pass.

### Task 2: Adaptive chart controls and zoom

**Files:**
- Modify: `apps/english-world/src/page/englishWorld/component/EnglishStats.tsx`
- Modify: `apps/english-world/src/page/englishWorld/component/EnglishStats.test.tsx`
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.css`

**Interfaces:**
- Consumes: aggregation helpers from Task 1.
- Produces: a `日 / 周 / 月` segmented control, adaptive axis labels, date-range tooltip, and conditional data zoom.

- [ ] **Step 1: Write a failing component test** proving a one-year history defaults to `月`, renders 12 chart points, and exposes all three switches.
- [ ] **Step 2: Run** `pnpm exec vitest run src/page/englishWorld/component/EnglishStats.test.tsx` and confirm the missing controls cause failure.
- [ ] **Step 3: Implement** selected granularity state, the segmented control, aggregated chart data, conditional zoom, and compact token-based styling.
- [ ] **Step 4: Re-run both focused test files** and confirm they pass.
- [ ] **Step 5: Run** focused ESLint and `pnpm build`; then inspect the live desktop page in dark mode for label overlap and horizontal overflow.
