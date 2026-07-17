# Word Card Mastery Quick Edit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add single-card and current-page batch mastery updates to the English World card view.

**Architecture:** A narrow authenticated backend endpoint updates only `englishLevel`. The frontend owns a focused dropdown component and uses optimistic updates in `EnglishWorld`, with a card-view-only batch toolbar that sends the same endpoint in parallel.

**Tech Stack:** React 18, TypeScript, Ant Design 5, Vitest, NestJS 10, Jest, class-validator.

## Global Constraints

- Card view only; list view and exercise-question UI remain unchanged.
- Mastery values are exactly `0`, `1`, `2`, and `3`.
- Batch selection is limited to the current page and resets on page, filter, reset, or view changes.
- Reuse existing dependencies and authenticated request helpers.

---

### Task 1: Expose the narrow mastery endpoint

**Files:**
- Modify: `../nestjs/src/interface/english/dto/english.dto.ts`
- Modify: `../nestjs/src/interface/english/english.controller.ts`
- Modify: `../nestjs/src/interface/english/english.service.spec.ts`

**Interfaces:**
- Consumes: `EnglishService.updateEnglishWordLevel(id: number, englishLevel: number, userId: number)`
- Produces: `POST /english/updateEnglishWordLevel` with `{ id: number; englishLevel: 0 | 1 | 2 | 3 }`

- [ ] **Step 1: Add a failing service test**

Extend the model mock with `findOne` and `update`, then assert that an owned word is updated with only `{ englishLevel }` and scoped by `{ id, userId }`.

- [ ] **Step 2: Run the focused backend test**

Run: `pnpm test -- english.service.spec.ts --runInBand`

Expected: the new update-level test fails until the mock and endpoint contract are complete.

- [ ] **Step 3: Add the validated DTO and controller route**

Add `UpdateEnglishWordLevel` with required numeric `id`, required numeric `englishLevel`, `@Min(0)`, and `@Max(3)`. Add a controller method that forwards the DTO and current user id to `updateEnglishWordLevel`.

- [ ] **Step 4: Verify backend test and build**

Run: `pnpm test -- english.service.spec.ts --runInBand && pnpm build`

Expected: all focused tests pass and Nest builds successfully.

### Task 2: Add the frontend level API and local patch helper

**Files:**
- Modify: `apps/english-world/src/server/word/word.ts`
- Modify: `apps/english-world/src/page/englishWorld/hooks/useWordList.ts`

**Interfaces:**
- Produces: `wordUpdateLevel(data: { id: number; englishLevel: number })`
- Produces: `updateWordLevels(updates: Array<{ id: number; englishLevel: number }>): void`

- [ ] **Step 1: Add the request factory**

Return a POST request to `/english/updateEnglishWordLevel` with the narrow payload.

- [ ] **Step 2: Add an immutable local patch helper**

Build an id-to-level map and update only matching `wordList` entries in one `setWordList` call. Return the helper from `useWordList`.

- [ ] **Step 3: Run TypeScript**

Run: `pnpm --filter @font/english-world exec tsc --noEmit`

Expected: exit code 0.

### Task 3: Build the accessible card-level dropdown

**Files:**
- Create: `apps/english-world/src/page/englishWorld/component/WordLevelQuickEdit.tsx`
- Create: `apps/english-world/src/page/englishWorld/component/WordLevelQuickEdit.test.tsx`
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.css`

**Interfaces:**
- Produces: `WORD_LEVEL_VALUES = [0, 1, 2, 3]`
- Produces: `WordLevelQuickEdit({ word, value, loading, onChange })`

- [ ] **Step 1: Write the failing component test**

Render a current `一般` value, click `修改 humor 的掌握程度，当前一般`, choose `熟练`, and expect `onChange(2)`.

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @font/english-world exec vitest run src/page/englishWorld/component/WordLevelQuickEdit.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the component**

Use Ant Design `Dropdown`, `Tag`, `CheckOutlined`, `DownOutlined`, and `LoadingOutlined`. Mark the current item and stop click propagation on the trigger.

- [ ] **Step 4: Verify GREEN**

Run the focused Vitest command again.

Expected: one test file passes.

### Task 4: Integrate single and batch updates

**Files:**
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.tsx`
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.test.tsx`
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.css`

**Interfaces:**
- Consumes: `wordUpdateLevel`, `updateWordLevels`, `WordLevelQuickEdit`, and `WORD_LEVEL_VALUES`
- Produces: card quick edit, `批量管理`, `全选当前页`, selection checkboxes, and four batch level actions.

- [ ] **Step 1: Write failing integration tests**

Add tests for:

1. selecting `熟练` from one card calls the narrow endpoint with `{ id: 1, englishLevel: 2 }` and updates the tag;
2. entering batch mode, selecting all current cards, and choosing `批量设为精通` calls the endpoint once per card;
3. a failed single request restores the previous level;
4. changing back to list view clears and hides batch selection.

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @font/english-world exec vitest run src/page/englishWorld/EnglishWorld.test.tsx`

Expected: the new interaction tests fail.

- [ ] **Step 3: Implement optimistic single updates**

Track updating ids, patch the local level before requesting, and roll back the previous value on false/rejection. Reuse one message key so rapid edits do not stack notifications.

- [ ] **Step 4: Implement current-page batch mode**

Track selected ids and batch loading. Render checkboxes in card headers and a batch toolbar above the grid. Send parallel requests with `Promise.allSettled`, roll back only failed ids, clear successful selections, and report one combined result.

- [ ] **Step 5: Reset selection at interaction boundaries**

Clear selection from search, reset, page change, view change, and batch-mode exit handlers.

- [ ] **Step 6: Add responsive styling**

Style clickable level tags, selected cards, the batch toolbar, and wrapped level actions. Keep the existing five-column desktop grid and one-column small-screen behavior.

- [ ] **Step 7: Verify focused and full frontend suites**

Run:

`pnpm --filter @font/english-world exec vitest run src/page/englishWorld/component/WordLevelQuickEdit.test.tsx src/page/englishWorld/EnglishWorld.test.tsx`

`pnpm --filter @font/english-world exec vitest run`

`pnpm --filter @font/english-world build`

Expected: all tests and the production build pass.

### Task 5: Browser verification

**Files:** No source changes expected.

- [ ] **Step 1: Verify card quick-edit states**

Open `/englishWorld/words`, switch to card view, open one mastery dropdown, and confirm all four options and the current check mark are visible.

- [ ] **Step 2: Verify batch mode without mutating data**

Enter batch mode, select two cards, confirm the selected count and four batch actions, then cancel batch mode.

- [ ] **Step 3: Verify responsive layout**

At 390px width, confirm the dropdown remains reachable, checkboxes do not overlap card metadata, and the batch toolbar wraps without horizontal overflow.
