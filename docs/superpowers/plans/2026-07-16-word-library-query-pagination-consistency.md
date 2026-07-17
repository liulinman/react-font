# Word Library Query and Pagination Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep word-library filters, pagination, and mutation results consistent during overlapping requests and changing totals.

**Architecture:** `useWordList` becomes the single owner of an immutable query state. One effect performs requests, ignores stale responses, and corrects invalid pages; the page component requests refreshes after mutations. The backend adds stable ordering and bounded DTO validation.

**Tech Stack:** React 18, TypeScript, Vitest, Ant Design 5, NestJS 10, Sequelize 6, Jest, class-validator.

## Global Constraints

- Preserve all pre-existing uncommitted work.
- Do not change mobile word-library behavior in this task.
- Do not add dependencies.
- Do not commit or push unless the user asks.

---

### Task 1: Make the list hook race-safe

**Files:**
- Modify: `apps/english-world/src/page/englishWorld/hooks/useWordList.ts`
- Test: `apps/english-world/src/page/englishWorld/hooks/useWordList.test.ts`

**Interfaces:**
- Consumes: `request<ListData>(wordFilter(params))`
- Produces: the existing `useWordList(initialPageSize)` result, with `search`, `reset`, `refresh`, and `changePage` updating one query state.

- [ ] Add hook tests proving an old response cannot overwrite a newer page, a query from page 2 makes one filtered request, changing page size selects page 1, and refresh after a reduced total requests the last valid page.
- [ ] Run `pnpm exec vitest run src/page/englishWorld/hooks/useWordList.test.ts` and confirm the new tests fail for the diagnosed behaviors.
- [ ] Replace direct request calls in `search` and `reset` with query-state updates; make one effect the request trigger and guard commits with a request sequence.
- [ ] Clamp an invalid page after receiving `total`, and reset page to 1 when `pageSize` changes.
- [ ] Re-run the hook test and confirm it passes.

### Task 2: Reapply filters after mastery mutations

**Files:**
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.tsx`
- Test: `apps/english-world/src/page/englishWorld/EnglishWorld.test.tsx`

**Interfaces:**
- Consumes: `refresh()` from `useWordList`.
- Produces: server-authoritative list and totals after single or batch mastery changes.

- [ ] Add a component test proving a successful mastery update triggers a new `/english/filterWordList` request.
- [ ] Run the focused component test and confirm it fails because no refresh occurs.
- [ ] Trigger `refresh()` after successful single updates and after batch settlement.
- [ ] Re-run the component test and confirm it passes.

### Task 3: Harden the backend pagination contract

**Files:**
- Modify: `../nestjs/src/interface/english/english.service.ts`
- Modify: `../nestjs/src/interface/english/dto/english.dto.ts`
- Test: `../nestjs/src/interface/english/english.service.spec.ts`
- Test: `../nestjs/src/interface/english/english.controller.spec.ts`

**Interfaces:**
- Consumes: `FilterWordList` request DTO.
- Produces: deterministic offset pagination ordered by creation time and id.

- [ ] Add a service test expecting `order: [['englishCreateTime', 'DESC'], ['id', 'DESC']]`.
- [ ] Add DTO tests rejecting page 0, fractional pages, pageSize 0, and pageSize above 500.
- [ ] Run the focused Jest suites and confirm the new assertions fail.
- [ ] Add the secondary id sort and `IsInt`, `Min(1)`, and `Max(500)` constraints.
- [ ] Re-run the Jest suites and confirm they pass.

### Task 4: Regression verification

**Files:**
- Verify only; no new files.

- [ ] Run the focused frontend suites for `EnglishWorld`, `useWordList`, and `wordFilters`.
- [ ] Run the focused backend English service and controller suites.
- [ ] Run frontend TypeScript build and backend build.
- [ ] Run `git diff --check` in both repositories and inspect `git diff` to ensure only scoped files changed.
