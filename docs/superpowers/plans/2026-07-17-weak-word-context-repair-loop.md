# English World Weak-Word Context Repair Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a recoverable desktop loop from real Recite mistakes to a three-question micro-context exercise and next-day priority review.

**Architecture:** Extend the existing Context Lab task JSON contracts with an optional `micro` mode and optional `targetWord`, validate every micro request against its owned Recite session, and keep old tasks/standard IELTS generation compatible. Add a read-only previous-day mistake query plus one additive `learning_loop_event` table for durable, idempotent funnel measurement, then connect the Recite result page to Context Lab through deterministic URL state.

**Tech Stack:** NestJS 10, Sequelize 6, class-validator, Jest 29, React 18, React Router 7, Ant Design 5, Vitest 4, TypeScript 5, pnpm workspaces.

## Global Constraints

- Work in both `/Users/liulin/Desktop/font/english/nestjs` and `/Users/liulin/Desktop/font/english/react-font` without touching unrelated dirty files.
- Micro mode accepts exactly 1–3 custom words, produces 120–180 English words and exactly 3 questions.
- Every micro question has one `targetWord`; every supplied word is targeted at least once.
- Standard Context Lab request behavior and historical tasks remain compatible.
- One additive event-table migration is allowed; no learning-state table or new dependency.
- Micro requests are rejected before task creation unless the owned Recite session produces exactly the same ordered repair words.
- Funnel events are persisted with a stable event UID and minimum metadata; never store answers, questions, articles or explanations.
- AI failure never removes or invalidates an already submitted Recite result.
- New UI follows Focus Studio tokens, visible focus, semantic icons and `prefers-reduced-motion`.

---

## File Map

### Backend `/Users/liulin/Desktop/font/english/nestjs`

- `src/interface/exercise-agent/dto/generate-exercise.dto.ts` — optional exercise mode and mode-specific validation surface.
- `src/interface/exercise-agent/dto/exercise-task.dto.ts` — optional webhook target word.
- `src/interface/exercise-agent/exercise-agent.types.ts` — target word on question and result models.
- `src/interface/exercise-agent/exercise-agent.service.ts` — separate prompts, micro validation, task mode mapping and exact result attribution.
- `src/interface/exercise-agent/exercise-agent.service.spec.ts` — micro generation, validation, compatibility and attribution tests.
- `src/interface/recite/recite.service.ts` — previous-day real-mistake query.
- `src/interface/recite/recite.controller.ts` — owned session-result endpoint.
- `src/interface/recite/dto/recite-session-result.dto.ts` — positive session ID contract.
- `src/interface/recite/recite.service.spec.ts` — timezone, latest-answer and user-isolation tests.
- `src/interface/daily-coach/daily-coach.service.ts` — previous-day mistake prioritization with fallback.
- `src/interface/daily-coach/daily-coach.service.spec.ts` — priority, merge and fallback tests.
- `src/database/learning-loop-event.ts` and `migrations/create-learning-loop-event.sql` — minimal 180-day funnel event storage.
- `src/interface/learning-loop-event/*` — authenticated, idempotent event write API with ownership validation.
- `src/database/init-models.ts` and `src/app.module.ts` — register the event model/module.

### Frontend `/Users/liulin/Desktop/font/english/react-font`

- `apps/english-world/src/page/englishWorld/recite/reviewExperience.ts` — deterministic repair word extraction and URL builder.
- `apps/english-world/src/page/englishWorld/recite/reviewExperience.test.ts` — order, dedupe, cap and URL tests.
- `apps/english-world/src/page/englishWorld/recite/RecitePage.tsx` — result-page micro-context action.
- `apps/english-world/src/page/englishWorld/recite/RecitePage.test.tsx` — action visibility and navigation tests.
- `apps/english-world/src/server/recite/recite.ts` — session-result request.
- `apps/english-world/src/server/recite/recite.type.ts` — owned session-result request/response types.
- `apps/english-world/src/page/englishWorld/contextLab/microContext.ts` — pure query parsing and micro request construction.
- `apps/english-world/src/page/englishWorld/contextLab/microContext.test.ts` — valid/invalid query and request tests.
- `apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.tsx` — micro entry, automatic task creation and focused presentation.
- `apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.test.tsx` — micro-mode integration and standard-mode regression.
- `apps/english-world/src/page/englishWorld/types/learning.ts` — `mode` and `targetWord` contracts.
- `apps/english-world/src/server/exerciseAgent/exerciseAgent.ts` — shared result `targetWord` type.
- `apps/english-world/src/page/englishWorld/analytics/learningEvents.ts` — typed, answer-free persisted event adapter.
- `apps/english-world/src/page/englishWorld/analytics/learningEvents.test.ts` — event ID, request and privacy payload tests.
- `apps/english-world/src/page/englishWorld/cockpit/LearningCockpitPage.tsx` — next-day repair start event.
- `apps/english-world/src/page/englishWorld/EnglishWorld.css` — only append micro-mode/result-action selectors; preserve current user edits.

---

### Task 0: Durable Learning Funnel Events

**Files:**

- Create: `/Users/liulin/Desktop/font/english/nestjs/migrations/create-learning-loop-event.sql`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/database/learning-loop-event.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/database/init-models.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-loop-event/learning-loop-event.module.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-loop-event/learning-loop-event.controller.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-loop-event/learning-loop-event.service.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-loop-event/dto/create-learning-loop-event.dto.ts`
- Test: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-loop-event/learning-loop-event.service.spec.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/app.module.ts`

- [ ] Write failing tests for `(userId,eventUid)` idempotency, ownership/relationship validation, 180-day expiry, and rejection of unsupported event names or text payload fields.
- [ ] Add the isolated event table with `event_uid`, `flow_id`, optional owned relation IDs, counts/status, `create_time`, `expire_time`, and a unique user/event key.
- [ ] Implement `POST /learning-loop/events`; duplicate event UIDs return the existing record and event write failure never participates in the learning transaction.
- [ ] Register the model/module and run the focused suite green.

---

### Task 1: Backend Micro-Context Contract and Output Validation

**Files:**

- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/exercise-agent/dto/generate-exercise.dto.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/exercise-agent/dto/exercise-task.dto.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/exercise-agent/exercise-agent.types.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/exercise-agent/exercise-agent.service.ts`
- Test: `/Users/liulin/Desktop/font/english/nestjs/src/interface/exercise-agent/exercise-agent.service.spec.ts`

**Interfaces:**

- Produces: `ExerciseMode.STANDARD | ExerciseMode.MICRO`, `targetWord?: string`, task response `mode` and `reciteSessionId`.
- Preserves: requests with no `mode` use standard behavior.

- [ ] **Step 1: Write failing tests for micro word counts and the dedicated prompt**

Add tests that assert one custom word is accepted only in micro mode, four micro words are rejected, the model request contains `120-180 words`, `exactly 3 questions`, and `targetWord`, while the existing standard prompt still contains `700-900 words`.

Also assert that micro creation loads the current user's Recite session, derives the ordered first three unique wrong words, rejects missing/foreign sessions as 404, and rejects stale or tampered word lists with `MICRO_REQUEST_INVALID` before any task row is created.

```ts
it('accepts one to three custom words only in micro mode', async () => {
  const service = new ExerciseAgentService();

  await expect(service.getWordsForExercise(7, {
    sourceType: ExerciseSourceType.CUSTOM,
    mode: ExerciseMode.MICRO,
    words: ['fragile'],
  })).resolves.toEqual(['fragile']);

  await expect(service.getWordsForExercise(7, {
    sourceType: ExerciseSourceType.CUSTOM,
    mode: ExerciseMode.MICRO,
    words: ['one', 'two', 'three', 'four'],
  })).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
cd /Users/liulin/Desktop/font/english/nestjs
pnpm test --runInBand src/interface/exercise-agent/exercise-agent.service.spec.ts
```

Expected: FAIL because `ExerciseMode` and micro behavior do not exist.

- [ ] **Step 3: Add the mode and question contracts**

Use optional mode and target word fields so old requests remain valid:

```ts
export enum ExerciseMode {
  STANDARD = 'standard',
  MICRO = 'micro',
}

export class GenerateExerciseDto {
  @IsOptional()
  @IsEnum(ExerciseMode)
  mode?: ExerciseMode;
  @IsOptional()
  @IsInt()
  @Min(1)
  reciteSessionId?: number;
  // existing fields remain unchanged
}

export interface ExerciseQuestionItem {
  id: string;
  stem: string;
  options: string[];
  targetWord?: string;
}

export interface ExerciseResultItem {
  questionId: string;
  correct: boolean;
  correctIndex: number;
  userSelectedIndex: number;
  explanation: string;
  targetWord?: string;
}
```

Add optional `targetWord` with `@IsOptional() @IsString()` to `ExerciseTaskWebhookQuestionDto`.

- [ ] **Step 4: Implement mode-specific prompt, normalization and validation**

Keep `GEN_SYSTEM` for standard mode and add `MICRO_GEN_SYSTEM`. Pass the mode through `runGenerationTask → generateArticleWithWords`. Normalize `targetWord` case-insensitively against source words.

```ts
private getGenerationSystem(mode = ExerciseMode.STANDARD) {
  return mode === ExerciseMode.MICRO ? MICRO_GEN_SYSTEM : GEN_SYSTEM;
}

private normalizeTargetWord(value: unknown, sourceWords: string[]) {
  const candidate = String(value ?? '').trim().toLowerCase();
  return sourceWords.find((word) => word.toLowerCase() === candidate);
}
```

For micro output, reject unless the owned reciteSessionId exists, article whitespace-token count is 120–180, there are exactly three valid questions, all target words belong to source words, and every source word is covered. For three words require one-to-one mapping; for two words require 2+1 coverage; for one word all questions target it. For standard output retain the current minimum-question behavior. `mapTask` parses `requestJson` and returns `mode` and `reciteSessionId`, defaulting old tasks to `standard` with no source session.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run the same Jest command. Expected: all exercise-agent focused tests PASS.

- [ ] **Step 6: Commit backend contract changes**

```bash
cd /Users/liulin/Desktop/font/english/nestjs
git add src/interface/exercise-agent/dto/generate-exercise.dto.ts src/interface/exercise-agent/dto/exercise-task.dto.ts src/interface/exercise-agent/exercise-agent.types.ts src/interface/exercise-agent/exercise-agent.service.ts src/interface/exercise-agent/exercise-agent.service.spec.ts
git commit -m "feat(context-lab): add micro context exercise mode"
```

### Task 2: Exact Target-Word Attribution and Explanation Fallback

**Files:**

- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/exercise-agent/exercise-agent.service.ts`
- Test: `/Users/liulin/Desktop/font/english/nestjs/src/interface/exercise-agent/exercise-agent.service.spec.ts`

**Interfaces:**

- Consumes: `ExerciseQuestionWithAnswer.targetWord` from Task 1.
- Produces: `ExerciseResultItem.targetWord`, exact `weakWords`, non-empty fallback explanation for wrong micro questions.

- [ ] **Step 1: Write failing attribution tests**

Create a micro task whose second question targets `resilient`, answer that question incorrectly, and assert the summary returns only `resilient` even when source word order differs.

```ts
expect(result.results[1]).toEqual(expect.objectContaining({
  correct: false,
  targetWord: 'resilient',
}));
expect(result.weakWords).toEqual(['resilient']);
```

Also make explanation generation reject and assert the wrong result still contains a short deterministic fallback mentioning the target word.

- [ ] **Step 2: Run focused test and verify RED**

Run the Task 1 Jest command. Expected: FAIL because result attribution still uses question index modulo words.

- [ ] **Step 3: Replace guessed attribution with explicit mapping**

Copy `targetWord` into each result, build weak words from wrong results that have a target word, and use the old index fallback only for historical standard questions without target words.

```ts
const explicitWeakWords = results
  .filter((item) => !item.correct && item.targetWord)
  .map((item) => item.targetWord as string);

const weakWords = explicitWeakWords.length > 0
  ? explicitWeakWords
  : this.buildLegacyWeakWords(results, sourceWords);
```

When explanation generation fails, set wrong micro explanations to `本题重点是 ${targetWord}，请对照正确选项后再试一次。`; leave correct explanations empty.

- [ ] **Step 4: Run focused tests and verify GREEN**

Expected: exact attribution, fallback and all previous exercise-agent tests PASS.

- [ ] **Step 5: Commit attribution changes**

```bash
cd /Users/liulin/Desktop/font/english/nestjs
git add src/interface/exercise-agent/exercise-agent.service.ts src/interface/exercise-agent/exercise-agent.service.spec.ts
git commit -m "fix(context-lab): attribute mistakes to target words"
```

### Task 3: Real Previous-Day Mistakes in Daily Coach

**Files:**

- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/recite/recite.service.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/recite/recite.controller.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/recite/dto/recite-session-result.dto.ts`
- Test: `/Users/liulin/Desktop/font/english/nestjs/src/interface/recite/recite.service.spec.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/daily-coach/daily-coach.service.ts`
- Test: `/Users/liulin/Desktop/font/english/nestjs/src/interface/daily-coach/daily-coach.service.spec.ts`

**Interfaces:**

- Produces: `ReciteService.getReciteSessionResult(userId, sessionId)` and `getPreviousDayMistakeWords(userId, timezoneOffsetMinutes, limit)`.
- Consumes: existing `DailyCoachSummaryDto.timezone` and existing action `wordIds` route.

- [ ] **Step 1: Write failing ReciteService date-boundary tests**

Mock `reciteHistory.findAll` with records in descending time. Assert the query is scoped to user and `[Op.gte]/[Op.lt]`, the last answer wins for repeated words, correct-later words are removed, and output caps at 3.

```ts
const result = await service.getPreviousDayMistakeWords(7, 480, 3);
expect(result).toEqual([
  { wordId: 2, englishWord: 'fragile' },
  { wordId: 9, englishWord: 'gradient' },
]);
expect(mockReciteHistoryFindAll).toHaveBeenCalledWith(expect.objectContaining({
  where: expect.objectContaining({ userId: 7, createTime: expect.any(Object) }),
  order: [['createTime', 'DESC'], ['id', 'DESC']],
}));
```

- [ ] **Step 2: Run ReciteService tests and verify RED**

```bash
cd /Users/liulin/Desktop/font/english/nestjs
pnpm test --runInBand src/interface/recite/recite.service.spec.ts
```

Expected: FAIL because the method does not exist.

- [ ] **Step 3: Implement previous-day query**

Add a pure private boundary helper and the public service method. Clamp timezone minutes to `-720..840`, default 480, query only the previous local day, and exclude the final daily result when it is less than eight hours old.

```ts
async getPreviousDayMistakeWords(userId: number, timezoneOffsetMinutes = 480, limit = 3) {
  const { start, end } = this.getPreviousLocalDayUtcRange(timezoneOffsetMinutes);
  const minimumAge = new Date(Date.now() - 8 * 60 * 60 * 1000);
  const rows = await reciteHistory.findAll({
    where: { userId, createTime: { [Op.gte]: start, [Op.lt]: end } },
    order: [['createTime', 'DESC'], ['id', 'DESC']],
    raw: true,
  });
  const seen = new Set<number>();
  const mistakes: Array<{ wordId: number; englishWord: string }> = [];
  for (const row of rows) {
    if (seen.has(row.wordId)) continue;
    seen.add(row.wordId);
    if (!row.isCorrect && new Date(row.createTime) <= minimumAge) {
      mistakes.push({ wordId: row.wordId, englishWord: row.englishWord });
    }
    if (mistakes.length >= limit) break;
  }
  return mistakes;
}
```

- [ ] **Step 4: Run ReciteService tests and verify GREEN**

Expected: all recite service tests PASS.

- [ ] **Step 5: Add owned Recite session-result tests and endpoint**

Write service and controller tests for `POST /recite/session-result`. The service first finds `reciteSession` by `{id: sessionId, userId}`, then reads `reciteHistory` by `{sessionId, userId}` ordered by `id ASC`. Return the same `{sessionId, results, statistics}` shape as submit. Missing and non-owned records both throw 404 with `RECITE_SESSION_NOT_FOUND`.

```ts
export class ReciteSessionResultDto {
  @IsInt()
  @Min(1)
  sessionId: number;
}
```

- [ ] **Step 6: Run ReciteService and controller tests and verify GREEN**

Run the ReciteService command plus `src/interface/recite/recite.controller.spec.ts`. Expected: owned result round-trip and authorization cases PASS.

- [ ] **Step 7: Write failing Daily Coach priority and fallback tests**

Mock `getPreviousDayMistakeWords` to return two words and assert the first action is `复查昨日错词`, those IDs lead `weakWords`, and static weak words are appended without duplicates. Add a rejection case and assert the old `开始今日复习` path remains available.

- [ ] **Step 8: Run Daily Coach tests and verify RED**

```bash
cd /Users/liulin/Desktop/font/english/nestjs
pnpm test --runInBand src/interface/daily-coach/daily-coach.service.spec.ts
```

- [ ] **Step 9: Implement Daily Coach merge and degradation**

Add `timezoneOffsetMinutes?: number` to Daily Coach DTO with `[-720, 840]`, retain legacy `timezone?: number`, and prefer minutes. Call the previous-day query in the existing `Promise.all` through a catch that logs and returns `[]`. Resolve returned IDs against learning words; if a historical word is not in the limited sample, create a minimal `LearningWord` from the history name with level 0. Merge by ID and use yesterday words for the first action.

- [ ] **Step 10: Run focused backend tests and verify GREEN**

```bash
cd /Users/liulin/Desktop/font/english/nestjs
pnpm test --runInBand src/interface/recite/recite.service.spec.ts src/interface/daily-coach/daily-coach.service.spec.ts
```

- [ ] **Step 11: Commit Recite recovery and Daily Coach changes**

```bash
cd /Users/liulin/Desktop/font/english/nestjs
git add src/interface/recite/recite.service.ts src/interface/recite/recite.service.spec.ts src/interface/recite/recite.controller.ts src/interface/recite/recite.controller.spec.ts src/interface/recite/dto/recite-session-result.dto.ts src/interface/daily-coach/dto/daily-coach.dto.ts src/interface/daily-coach/daily-coach.service.ts src/interface/daily-coach/daily-coach.service.spec.ts
git commit -m "feat(daily-coach): prioritize previous-day mistakes"
```

### Task 4: Recite Result Handoff to Micro Context

**Files:**

- Modify: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/recite/reviewExperience.ts`
- Test: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/recite/reviewExperience.test.ts`
- Modify: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/recite/RecitePage.tsx`
- Test: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/recite/RecitePage.test.tsx`
- Modify: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/server/recite/recite.ts`
- Modify: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/server/recite/recite.type.ts`
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/analytics/learningEvents.ts`
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/analytics/learningEvents.test.ts`

**Interfaces:**

- Produces: `getContextRepairWords(results, limit = 3)` and `buildMicroContextPath(sessionId, words)`.
- Consumes: existing `AnswerResult.englishWord` and React Router navigation.

- [ ] **Step 1: Write failing pure-helper tests**

```ts
expect(getContextRepairWords([
  wrong(2, 'fragile'),
  wrong(2, 'fragile'),
  correct(5, 'resilient'),
  wrong(9, 'gradient'),
  wrong(12, 'artisan'),
  wrong(13, 'culinary'),
])).toEqual(['fragile', 'gradient', 'artisan']);

expect(buildMicroContextPath(91, ['fragile', 'urban farming'])).toBe(
  '/englishWorld/context-lab?mode=micro&source=recite-result&reciteSessionId=91&words=fragile%2Curban%20farming',
);
```

- [ ] **Step 2: Run helper tests and verify RED**

```bash
cd /Users/liulin/Desktop/font/english/react-font
pnpm --filter @font/english-world test -- --run apps/english-world/src/page/englishWorld/recite/reviewExperience.test.ts
```

- [ ] **Step 3: Implement pure helpers**

Filter wrong results, normalize display words with `trim()`, dedupe case-insensitively, preserve first occurrence, cap at 3, and URL-encode reciteSessionId plus words with `URLSearchParams`.

- [ ] **Step 4: Write failing RecitePage action tests**

After the existing mocked submission with one wrong word, assert a button named `用错词做语境练习` exists with an experiment/read icon accessible name; click it and assert the micro path contains session 91. Add an all-correct response case and assert absence. Add a direct route `?view=result&sessionId=91` test that calls `/recite/session-result` and reconstructs the result page after refresh.

- [ ] **Step 5: Implement result-page action**

Add `getReciteSessionResult({sessionId})` returning the existing `SubmitAnswerResponse` data shape. Memoize repair words from results. Keep `再练错词` primary; add a large secondary button with `ExperimentOutlined` and metadata `N 个词 · 约 3 分钟`. Navigate through `buildMicroContextPath(sessionId, words)`. When result query contains sessionId, load the new owned endpoint before rendering; missing records show a warning and return-to-today action.

- [ ] **Step 6: Run Recite focused tests and verify GREEN**

```bash
cd /Users/liulin/Desktop/font/english/react-font
pnpm --filter @font/english-world test -- --run apps/english-world/src/page/englishWorld/recite/reviewExperience.test.ts apps/english-world/src/page/englishWorld/recite/RecitePage.test.tsx
```

- [ ] **Step 7: Commit Recite handoff**

Before completing this task, add `recordLearningEvent(name, payload)` that POSTs to `/learning-loop/events`. Its typed payload is limited to eventUid, flowId, IDs, counts, elapsed seconds, timezone offset and status; the type contains no answer, question, article or explanation fields. Generate stable entity-based event UIDs so retries are idempotent. Emit `recite_started`/`recite_completed` with one flowId, `eligible_wrong_result_viewed` once per submitted session and `micro_context_started` on the new button. Test the request body, stable event IDs and privacy boundary.

```bash
cd /Users/liulin/Desktop/font/english/react-font
git add apps/english-world/src/page/englishWorld/recite/reviewExperience.ts apps/english-world/src/page/englishWorld/recite/reviewExperience.test.ts apps/english-world/src/page/englishWorld/recite/RecitePage.tsx apps/english-world/src/page/englishWorld/recite/RecitePage.test.tsx apps/english-world/src/server/recite/recite.ts apps/english-world/src/server/recite/recite.type.ts apps/english-world/src/page/englishWorld/analytics/learningEvents.ts apps/english-world/src/page/englishWorld/analytics/learningEvents.test.ts
git commit -m "feat(english-world): hand off wrong words to context lab"
```

### Task 5: Context Lab Focused Micro Mode

**Files:**

- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/contextLab/microContext.ts`
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/contextLab/microContext.test.ts`
- Modify: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/types/learning.ts`
- Modify: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/server/exerciseAgent/exerciseAgent.ts`
- Modify: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.tsx`
- Test: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.test.tsx`
- Modify: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/EnglishWorld.css`
- Modify: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/cockpit/LearningCockpitPage.tsx`

**Interfaces:**

- Consumes: Task 1 backend `mode` and `targetWord` fields; Task 4 query format.
- Produces: `parseMicroContextEntry(search)` and a single automatic task creation per valid entry.

- [ ] **Step 1: Write failing query parser tests**

```ts
expect(parseMicroContextEntry('?mode=micro&source=recite-result&reciteSessionId=91&words=fragile,resilient')).toEqual({
  mode: 'micro',
  source: 'recite-result',
  reciteSessionId: 91,
  words: ['fragile', 'resilient'],
});
expect(parseMicroContextEntry('?mode=micro&words=')).toBeNull();
expect(parseMicroContextEntry('?mode=micro&words=a,b,c,d')).toBeNull();
```

- [ ] **Step 2: Run parser test and verify RED**

```bash
cd /Users/liulin/Desktop/font/english/react-font
pnpm --filter @font/english-world test -- --run apps/english-world/src/page/englishWorld/contextLab/microContext.test.ts
```

- [ ] **Step 3: Implement parser and type contracts**

```ts
export type ContextLabMode = 'standard' | 'micro';

export function buildMicroGenerateParams(reciteSessionId: number, words: string[]): ContextLabGenerateParams {
  return { sourceType: 'custom', mode: 'micro', reciteSessionId, words };
}
```

Extend the custom request union with optional `mode`, task with `mode?: ContextLabMode`, question and result with `targetWord?: string`.

- [ ] **Step 4: Write failing ContextLabPage micro integration test**

Render with a valid micro query. Assert `/context-lab/generate-task` is called once with `{sourceType:'custom', mode:'micro', reciteSessionId:91, words:[...]}`; the hero says `错词语境巩固`; normal segmented source controls and PDF action are absent. Resolve a succeeded task and assert target word tags render. The back action must target `/englishWorld/recite?view=result&sessionId=91`.

- [ ] **Step 5: Implement one-shot automatic task creation and focused UI**

Parse entry once from `initialSearch`; use a ref keyed by normalized search to prevent duplicate creation in React Strict Mode. Route the request through existing `contextLabCreateTask`, store current task, and keep SSE recovery. Branch only presentation:

```tsx
const microEntry = useMemo(() => parseMicroContextEntry(initialSearch), [initialSearch]);
const isMicroMode = Boolean(microEntry);

<Title level={1}>{isMicroMode ? '错词语境巩固' : 'AI 语境实验室'}</Title>
```

Hide the ordinary generator/history grid in micro mode, but preserve reading, questions, result review and failed-task retry. Show `targetWord` as a quiet tag on each question. Use “语境通过 / 还需复查 / 下一自然日再确认” copy. The retry action clears the whole answer set and latest display state, keeps the same task/questions, and each submission creates a new attempt.

Emit `micro_context_generated` when the task first transitions to succeeded and `micro_context_completed` after a successful submit. In `LearningCockpitPage`, emit `next_day_repair_started` when the user launches an action whose title is `复查昨日错词`; Recite submission from that route emits `next_day_repair_correct` with correct and total counts.

- [ ] **Step 6: Append scoped CSS without rewriting existing user changes**

Add selectors such as `.context-lab-page-micro`, `.context-lab-micro-intro`, `.recite-context-repair-action`, and reduced-motion rules. Do not mechanically format or replace the whole CSS file.

- [ ] **Step 7: Run Context Lab focused tests and verify GREEN**

```bash
cd /Users/liulin/Desktop/font/english/react-font
pnpm --filter @font/english-world test -- --run apps/english-world/src/page/englishWorld/contextLab/microContext.test.ts apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.test.tsx
```

- [ ] **Step 8: Commit frontend micro mode**

```bash
cd /Users/liulin/Desktop/font/english/react-font
git add apps/english-world/src/page/englishWorld/contextLab/microContext.ts apps/english-world/src/page/englishWorld/contextLab/microContext.test.ts apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.tsx apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.test.tsx apps/english-world/src/page/englishWorld/types/learning.ts apps/english-world/src/server/exerciseAgent/exerciseAgent.ts apps/english-world/src/page/englishWorld/EnglishWorld.css apps/english-world/src/page/englishWorld/cockpit/LearningCockpitPage.tsx apps/english-world/src/page/englishWorld/analytics/learningEvents.ts apps/english-world/src/page/englishWorld/analytics/learningEvents.test.ts
git commit -m "feat(english-world): add focused micro context practice"
```

### Task 6: Cross-Repo Verification and Gemini Review

**Files:**

- Verify all modified files from Tasks 1–5.
- Update only failing tests or implementation files that are directly caused by this feature.

**Interfaces:**

- Consumes: complete backend and frontend feature.
- Produces: passing tests/build/lint and Gemini `PASS` review.

- [ ] **Step 1: Run backend focused and full verification**

```bash
cd /Users/liulin/Desktop/font/english/nestjs
pnpm test --runInBand src/interface/exercise-agent/exercise-agent.service.spec.ts src/interface/recite/recite.service.spec.ts src/interface/daily-coach/daily-coach.service.spec.ts
pnpm test --runInBand
pnpm build
```

Expected: all tests PASS and Nest build exits 0.

- [ ] **Step 2: Run frontend focused and full verification**

```bash
cd /Users/liulin/Desktop/font/english/react-font
pnpm --filter @font/english-world test -- --run
pnpm --filter @font/english-world build
pnpm exec eslint apps/english-world/src/page/englishWorld/recite/reviewExperience.ts apps/english-world/src/page/englishWorld/recite/reviewExperience.test.ts apps/english-world/src/page/englishWorld/recite/RecitePage.tsx apps/english-world/src/page/englishWorld/recite/RecitePage.test.tsx apps/english-world/src/page/englishWorld/contextLab/microContext.ts apps/english-world/src/page/englishWorld/contextLab/microContext.test.ts apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.tsx apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.test.tsx apps/english-world/src/page/englishWorld/types/learning.ts apps/english-world/src/server/exerciseAgent/exerciseAgent.ts apps/english-world/src/page/englishWorld/analytics/learningEvents.ts apps/english-world/src/page/englishWorld/analytics/learningEvents.test.ts apps/english-world/src/page/englishWorld/cockpit/LearningCockpitPage.tsx
```

Expected: all tests and build PASS; focused lint exits 0.

- [ ] **Step 3: Verify dirty-worktree boundaries**

```bash
cd /Users/liulin/Desktop/font/english/react-font && git status --short
cd /Users/liulin/Desktop/font/english/nestjs && git status --short
```

Expected: pre-existing stats timeline, CSS overlap, and backend English-module changes remain preserved; no unrelated file is staged.

- [ ] **Step 4: Run local Gemini audit until PASS**

Pipe the committed diff plus PRD and design into local Gemini with an explicit request to return `PASS` or `FAIL` and concrete blockers. Fix only validated blockers, rerun the relevant tests, and resubmit until Gemini returns `PASS`.

```bash
cd /Users/liulin/Desktop/font/english
{
  git -C react-font diff HEAD~2..HEAD --;
  git -C nestjs diff HEAD~3..HEAD --;
  sed -n '1,260p' react-font/docs/superpowers/prds/prd-english-world-2026-07-17/prd.md;
} | gemini --skip-trust -o text -p 'Review stdin only for correctness, backward compatibility, UX clarity, error recovery, test coverage, and scope. Return PASS if shippable; otherwise return FAIL followed by only concrete blocking issues.'
```

- [ ] **Step 5: Record final verification in the delivery summary**

Report exact test counts, build results, Gemini verdict, commits, changed behavior and any pre-existing unrelated dirty files. Do not push unless the user asks.

---

## Plan Self-Review

- **Spec coverage:** FR-1–FR-3 map to Tasks 1 and 4; FR-4 maps to Tasks 3–4; FR-5 maps to Tasks 1 and 5; FR-6–FR-7 map to Tasks 2 and 5; FR-8–FR-10 map to Task 3; FR-11 maps to Tasks 1, 2 and 5; FR-12 maps to Task 0, persisted task linkage and typed event call sites in Tasks 4–5.
- **Scope:** only an isolated funnel-event migration is added; no SRS state table, Memory Map rewrite, streak, social, speech, monetization or mobile redesign task exists.
- **Type consistency:** `ExerciseMode`, `ContextLabMode`, `mode`, `targetWord`, `getPreviousDayMistakeWords`, `getContextRepairWords`, `buildMicroContextPath` and `parseMicroContextEntry` are named consistently.
- **Placeholder scan:** no TBD/TODO/future implementation placeholder remains; deferred product capabilities are explicit non-goals.
