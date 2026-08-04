# Multi-Mode Learning Confusion, Output, and Mixing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 增加易混辨析和输出应用，完成五种模式多选、短学习段、跨模式薄弱回收以及异步批改不误判的完整桌面流程。

**Architecture:** 易混关系来自真实错误、审核对或用户自定义对；开放输出先保存 `grading_pending` attempt/job，再由 worker 结构化批改并调用同一 finalization transaction。编排器为每个词只选一个主模式，按 mode 形成连续 block，错误/跳过/提示后正确的词在 2–4 个 item 后用另一已选模式回收。

**Tech Stack:** 继承前两阶段技术栈与数据库；复用 durable `learning_job`、统一 activity contract、React Query snapshot 和 `learningSessionReducer`。

## Global Constraints

- 本计划以前两个计划的退出条件全部通过为起点。
- 易混模式默认 2 个词、最多 4 个；没有可靠对比对象时明确不适配。
- 易混错误必须记录方向，例如 `ensure -> assure`，不能只记录组级错误。
- 输出支架严格按 `sentence_completion → guided_sentence → free_sentence|two_turn_dialogue` 递进。
- AI 只评价目标词词义、搭配和可理解性；反馈保持简短，并返回一个修改版本。
- AI 超时、无效响应或 worker 中断保留原答案为 `grading_pending`，不产生 evidence、不推进该 item。
- 混合 block 连续约 2–4 分钟，不在单题作答过程中切 mode。
- 一个普通词一轮只有一个主 mode；回收只用于错误、跳过或提示后正确，最多追加 3 个回收 item。
- 回收 item 与原 item 至少间隔 2 个、最多优先安排在第 4 个之后；不足 2 个剩余 item 时交给下次复习。
- 用户可直接结束本轮并保留未完成回收；预计新增时间必须可见。
- 后端现有用户未跟踪计划文件保持未暂存。

---

### Task 1: Implement Reliable Confusion-Pair Selection and Directional Evidence

**Files:**
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/activities/confusion.activity.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/contracts/activity-contract.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/services/attempt-finalization.service.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/learning-session.controller.ts`
- Test: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/activities/activities.spec.ts`
- Test: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/services/attempt-finalization.service.spec.ts`

**Interfaces:**
- Adds public item types `confusion_compare` and `confusion_choice`.
- Adds commands `POST /learning-session/confusion-pair/save` and `/learning-session/confusion-pair/disable` for current-user pairs.
- Final result includes `confusionDirection?: { expectedWordId; selectedWordId }`.

- [ ] **Step 1: Write failing source-priority and direction tests**

```ts
it('prefers the user real error direction over a generic reviewed pair', async () => {
  expect(await activity.selectPair(userId, ensureWord)).toMatchObject({
    sourceType: 'learning_error', directionKey: 'ensure_to_assure',
  });
});

it('writes the selected wrong direction on an incorrect answer', async () => {
  await finalizer.finalizeDeterministicAttempt(confusionCommand);
  expect(evidenceRepository.append).toHaveBeenCalledWith(expect.objectContaining({
    dimension: 'meaning_recognition', outcome: 'incorrect',
    metadata: { expectedWordId: 7, selectedWordId: 8 },
  }), expect.anything());
});
```

- [ ] **Step 2: Run confusion tests and confirm failure**

Run: `cd /Users/liulin/Desktop/font/english/nestjs && pnpm test -- activities.spec.ts attempt-finalization.service.spec.ts --runInBand`

Expected: FAIL because confusion adapter and directional result are missing.

- [ ] **Step 3: Implement source priority, contracts, and grading**

Source priority is `learning_error > active user_confusion_pair > reviewed confusion_pair`. A public compare item contains 2–4 words, one core distinction, one common structure and one parallel example per word. A choice item contains a new sentence and opaque choice values; the private answer contract stores expected word ID/value and why every alternative is unsuitable.

```ts
export interface ConfusionChoicePublicItemV1 {
  itemType: 'confusion_choice';
  itemUid: string;
  sentence: string;
  choices: Array<{ value: string; word: string }>;
  targetWordIds: number[];
}
```

Only reviewed/user-owned sources are eligible. Save/disable queries include `user_id`; duplicate word order is normalized to `min(left,right), max(left,right)` while `directionKey` preserves the error direction.

- [ ] **Step 4: Run adapter, finalization, controller, and build checks**

Run: `cd /Users/liulin/Desktop/font/english/nestjs && pnpm test -- activities.spec.ts attempt-finalization.service.spec.ts learning-session.controller.spec.ts --runInBand && pnpm build`

Expected: PASS for source priority, no-pair ineligibility, ownership, alternative explanation and directional evidence.

- [ ] **Step 5: Commit backend confusion mode**

```bash
cd /Users/liulin/Desktop/font/english/nestjs
git add src/interface/learning-session/activities/confusion.activity.ts src/interface/learning-session/contracts/activity-contract.ts src/interface/learning-session/services/attempt-finalization.service* src/interface/learning-session/learning-session.controller*
git commit -m "feat(learning): add directional confusion mode"
```

### Task 2: Build the Frontend Confusion Compare and Choice Activity

**Files:**
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/activities/confusion/ConfusionActivity.tsx`
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/activities/confusion/ConfusionActivity.test.tsx`
- Modify: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/contracts/activity-contract.ts`
- Modify: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/api/learningApi.ts`
- Modify: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/session/activityRegistry.tsx`

**Interfaces:**
- Consumes confusion public items and final feedback.
- Emits a `choice` draft; exposes save/disable personal-pair commands without exposing reviewed table mutations.

- [ ] **Step 1: Write failing comparison and feedback tests**

```tsx
expect(screen.getByText('ensure')).toBeVisible();
expect(screen.getByText('assure')).toBeVisible();
expect(screen.getAllByText(/核心区别/)).toHaveLength(2);
await user.click(screen.getByRole('radio', { name: 'assure' }));
await user.click(screen.getByRole('button', { name: '提交答案' }));
expect(onSubmit).toHaveBeenCalledWith({ kind: 'choice', selectedValue: 'word-8' });
```

- [ ] **Step 2: Run renderer tests and confirm failure**

Run: `cd /Users/liulin/Desktop/font/english/react-font && pnpm --filter @font/english-world test -- ConfusionActivity.test.tsx --run`

Expected: FAIL because renderer and contract variants are missing.

- [ ] **Step 3: Implement flat comparison, choice and alternative explanation**

Render two columns for two words and a flat list for three/four words. After submit, show both `为什么正确` and `另一个词为什么不合适`, plus the server direction label. Correct/error status uses icon, heading and text. Map `confusion` to `ConfusionActivity`; limit personal note to 300 characters and return focus after drawer close.

```ts
export interface ConfusionFeedbackV1 {
  expectedWordId: number;
  selectedWordId: number;
  correctReason: string;
  alternativeReason: string;
  directionKey?: string;
}
```

- [ ] **Step 4: Run frontend confusion and build checks**

Run: `cd /Users/liulin/Desktop/font/english/react-font && pnpm --filter @font/english-world test -- ConfusionActivity.test.tsx activity-contract.test.ts learningApi.test.ts --run && pnpm --filter @font/english-world build`

Expected: PASS for 2–4 word layouts, keyboard selection, both explanations, source label and personal-pair ownership request shape.

- [ ] **Step 5: Commit confusion UI**

```bash
cd /Users/liulin/Desktop/font/english/react-font
git add apps/english-world/src/page/englishWorld/learning/activities/confusion apps/english-world/src/page/englishWorld/learning/contracts apps/english-world/src/page/englishWorld/learning/api apps/english-world/src/page/englishWorld/learning/session/activityRegistry.tsx
git commit -m "feat(english-world): add confusion activity"
```

### Task 3: Define Output Scaffolds and Persist Pending Attempts

**Files:**
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/activities/output.activity.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/contracts/activity-contract.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/services/learning-session.service.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/services/attempt-finalization.service.ts`
- Test: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/activities/activities.spec.ts`
- Test: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/services/attempt-finalization.service.spec.ts`

**Interfaces:**
- Adds `output_completion`, `output_guided_sentence`, `output_free_sentence`, `output_dialogue` public items.
- Output submit returns `{ status: 'grading_pending', attemptId, attemptUid, jobUid, sessionVersion }` before model grading.

- [ ] **Step 1: Write failing scaffold and pending-boundary tests**

```ts
it.each([
  [0, 'output_completion'], [1, 'output_guided_sentence'],
  [2, 'output_free_sentence'], [3, 'output_dialogue'],
])('maps system level %i to %s', (level, itemType) => {
  expect(outputActivity.createPrompt(makeWord({ systemLevel: level })).itemType)
    .toBe(itemType);
});

it('persists pending attempt and job without evidence or cursor advance', async () => {
  const result = await finalizer.submitOutput(command);
  expect(result.status).toBe('grading_pending');
  expect(evidenceRepository.append).not.toHaveBeenCalled();
  expect(sessionRepository.advance).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run output boundary tests and confirm failure**

Run: `cd /Users/liulin/Desktop/font/english/nestjs && pnpm test -- activities.spec.ts attempt-finalization.service.spec.ts --runInBand`

Expected: FAIL because output items and pending submission do not exist.

- [ ] **Step 3: Implement scaffold rules and pending transaction**

```ts
export interface OutputPublicItemV1 {
  itemType: 'output_completion' | 'output_guided_sentence' | 'output_free_sentence' | 'output_dialogue';
  itemUid: string;
  wordId: number;
  situation: string;
  chineseIntent: string;
  requiredKeywords: string[];
  sentenceStem?: string;
}
```

Validate answer length 1–600 characters and target ownership. In one short transaction create a `grading_pending` attempt and `grade_output` job with the same request hash; do not append evidence or advance the item. If the same UID/payload is retried, return the existing pending/final result; different payload returns `LEARNING_IDEMPOTENCY_CONFLICT`.

- [ ] **Step 4: Run output service and build checks**

Run: `cd /Users/liulin/Desktop/font/english/nestjs && pnpm test -- activities.spec.ts attempt-finalization.service.spec.ts learning-session.service.spec.ts --runInBand && pnpm build`

Expected: PASS for scaffold selection, length bounds, idempotency, no pending evidence and answer persistence.

- [ ] **Step 5: Commit output submission boundary**

```bash
cd /Users/liulin/Desktop/font/english/nestjs
git add src/interface/learning-session/activities/output.activity.ts src/interface/learning-session/contracts/activity-contract.ts src/interface/learning-session/services
git commit -m "feat(learning): persist pending output attempts"
```

### Task 4: Grade Output and Finalize Evidence Exactly Once

**Files:**
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/services/activity-generation.service.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/workers/learning-job.worker.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/services/attempt-finalization.service.ts`
- Test: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/workers/learning-job.worker.spec.ts`
- Test: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/services/attempt-finalization.service.spec.ts`

**Interfaces:**
- Produces `gradeOutput(input): Promise<ValidatedOutputGradeV1>`.
- Produces final outcome only through `finalizePendingOutput(attemptId, grade, leaseOwner)`.

- [ ] **Step 1: Write failing invalid-grade and exactly-once tests**

```ts
it('rejects a grade that omits the target word assessment', async () => {
  ai.complete.mockResolvedValue({ verdict: 'pass', feedback: 'Good.' });
  await expect(service.gradeOutput(input)).rejects.toMatchObject({
    errorCode: 'LEARNING_CONTENT_INVALID',
  });
});

it('finalizes duplicate worker deliveries once', async () => {
  await Promise.all([worker.runOnce('a'), worker.runOnce('b')]);
  expect(await countEvidenceForAttempt(attemptId)).toBe(2);
});
```

- [ ] **Step 2: Run grading tests and confirm failure**

Run: `cd /Users/liulin/Desktop/font/english/nestjs && pnpm test -- learning-job.worker.spec.ts attempt-finalization.service.spec.ts --runInBand`

Expected: FAIL because structured grade validation/finalization is missing.

- [ ] **Step 3: Implement the exact grading schema and rule-owned verdict**

```ts
export interface ValidatedOutputGradeV1 {
  schemaVersion: 1;
  targetWordPresent: boolean;
  meaningUsage: 0 | 1 | 2;
  collocation: 0 | 1 | 2;
  comprehensibility: 0 | 1 | 2;
  issue?: string;
  revision: string;
}

const passed = grade.targetWordPresent
  && grade.meaningUsage >= 1
  && grade.collocation >= 1
  && grade.comprehensibility >= 1;
```

Limit issue/revision to 240/600 characters. The model cannot provide `systemLevel` or `nextReviewAt`. Finalization locks the pending attempt, no-ops if already final, writes the validated summary, appends `output` and `context` evidence, calls `MasteryProjectionService`, advances cursor/version, completes the job, then publishes an update. Invalid/timeout results leave the attempt pending with a retryable job error.

- [ ] **Step 4: Run worker, finalization and integration checks**

Run unit tests: `cd /Users/liulin/Desktop/font/english/nestjs && pnpm test -- learning-job.worker.spec.ts attempt-finalization.service.spec.ts --runInBand && pnpm build`

Run HTTP integration: `cd /Users/liulin/Desktop/font/english/nestjs && pnpm test:e2e -- learning-session.e2e-spec.ts --runInBand`

Expected: PASS for schema rejection, rule-owned pass/fail, duplicate worker, retry and no model-authored mastery fields.

- [ ] **Step 5: Commit output grading**

```bash
cd /Users/liulin/Desktop/font/english/nestjs
git add src/interface/learning-session/services/activity-generation.service* src/interface/learning-session/services/attempt-finalization.service* src/interface/learning-session/workers/learning-job.worker*
git commit -m "feat(learning): finalize output grading safely"
```

### Task 5: Build Output UI with Durable Pending and Retry States

**Files:**
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/activities/output/OutputActivity.tsx`
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/activities/output/OutputActivity.test.tsx`
- Modify: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/contracts/activity-contract.ts`
- Modify: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/session/learningSessionReducer.ts`
- Modify: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/session/activityRegistry.tsx`
- Modify: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/api/learningApi.ts`

**Interfaces:**
- Adds reducer state `{ status: 'grading_pending'; itemUid; attemptUid; submittedText }`.
- Adds `retryLearningJob({ sessionId, attemptUid })` descriptor; retry never creates a new attempt UID.

- [ ] **Step 1: Write failing scaffold, multiline, pending and recovery tests**

```tsx
await user.type(screen.getByLabelText('写下你的表达'), 'I inspected the report carefully.');
await user.click(screen.getByRole('button', { name: '提交并批改' }));
expect(screen.getByText('答案已保存，正在批改')).toBeVisible();
expect(screen.queryByText('回答错误')).not.toBeInTheDocument();
```

Assert Enter inserts a newline for output textarea, Ctrl/Cmd+Enter submits, reload restores the submitted text from server pending state, and retry reuses the same attempt UID.

- [ ] **Step 2: Run output UI tests and confirm failure**

Run: `cd /Users/liulin/Desktop/font/english/react-font && pnpm --filter @font/english-world test -- OutputActivity.test.tsx learningSessionReducer.test.ts --run`

Expected: FAIL because output renderer and pending state are missing.

- [ ] **Step 3: Implement scaffold-specific copy and pending feedback**

Show situation, Chinese intent, required keywords and optional sentence stem. Keep one primary button. Pending state is read-only, shows saved timestamp and `安全离开` copy, and lets the user retry only after a retryable job error. Final feedback shows a short conclusion, issue location and one revision; it does not display raw model JSON.

```ts
export type OutputDraft = { kind: 'output'; text: string };
export type OutputPendingView = {
  attemptUid: string;
  submittedText: string;
  canRetry: boolean;
  errorCode?: 'LEARNING_GRADING_TIMEOUT' | 'LEARNING_GRADING_FAILED';
};
```

- [ ] **Step 4: Run renderer, reducer and build checks**

Run: `cd /Users/liulin/Desktop/font/english/react-font && pnpm --filter @font/english-world test -- OutputActivity.test.tsx learningSessionReducer.test.ts activity-contract.test.ts --run && pnpm --filter @font/english-world build`

Expected: PASS for four scaffolds, multiline key behavior, pending honesty, refresh recovery, final feedback and retry UID reuse.

- [ ] **Step 5: Commit output UI**

```bash
cd /Users/liulin/Desktop/font/english/react-font
git add apps/english-world/src/page/englishWorld/learning/activities/output apps/english-world/src/page/englishWorld/learning/contracts apps/english-world/src/page/englishWorld/learning/session apps/english-world/src/page/englishWorld/learning/api/learningApi.ts
git commit -m "feat(english-world): add output learning activity"
```

### Task 6: Complete Five-Mode Orchestration and Cross-Mode Recycling

**Files:**
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/domain/orchestration-policy.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/domain/orchestration-policy.spec.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/services/attempt-finalization.service.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/services/learning-session.service.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/learning-session.controller.ts`

**Interfaces:**
- Capabilities enable all five modes behind one server feature flag.
- Produces `scoreModeCandidate(word, mode, context): number | null` and `planRecycleItems(session, weakWords): RecyclePlanV1`.

- [ ] **Step 1: Write failing five-mode and recycle-distance tests**

```ts
it('assigns exactly one primary mode from the user selection', () => {
  const plan = previewLearningPlan(allModeInput);
  expect(plan.words.every((word) => allModeInput.selectedModes.includes(word.primaryMode))).toBe(true);
  expect(plan.words.every((word) => typeof word.primaryMode === 'string')).toBe(true);
});

it('recycles a weak word in a different selected mode after 2-4 items', () => {
  const recycle = planRecycleItems(sessionWithHintedItem, [weakWord]);
  expect(recycle.items[0]).toMatchObject({ wordId: weakWord.wordId, isRecycle: true });
  expect(recycle.items[0].itemOrder - weakWord.originalItemOrder).toBeGreaterThanOrEqual(3);
  expect(recycle.items[0].mode).not.toBe(weakWord.primaryMode);
});
```

- [ ] **Step 2: Run orchestration tests and confirm failure**

Run: `cd /Users/liulin/Desktop/font/english/nestjs && pnpm test -- orchestration-policy.spec.ts attempt-finalization.service.spec.ts --runInBand`

Expected: FAIL until all modes and recycle planner are active.

- [ ] **Step 3: Implement exact scoring, blocks and recycle cap**

```ts
const score =
  weakDimensionMatch * 40 +
  dueForReview * 20 +
  differentFromLastMode * 15 +
  naturalGroupFit * 10 +
  validatedCacheHit * 5;
```

Return `null` for an ineligible mode. Stable-sort equal scores by user-selected mode order, then source order. Form continuous blocks of 4–7 answer items and estimated 120–240 seconds; reading material does not count as an answer item. Candidate recycle outcomes are `incorrect|skipped|correct_with_hint`; cap appended recycle items at `min(3, ceil(originalWordCount * 0.25))`. Choose a different eligible selected mode, insert after 2–4 intervening items, or carry the word into next review when distance is impossible. Never mutate the original item/attempt.

- [ ] **Step 4: Run domain, service and full backend tests**

Run: `cd /Users/liulin/Desktop/font/english/nestjs && pnpm test -- orchestration-policy.spec.ts attempt-finalization.service.spec.ts learning-session.service.spec.ts --runInBand && pnpm build`

Expected: PASS for selected-only modes, one primary mode, stable grouping, block length, recycle criteria/distance/cap and carry-over.

- [ ] **Step 5: Commit complete orchestration**

```bash
cd /Users/liulin/Desktop/font/english/nestjs
git add src/interface/learning-session/domain/orchestration-policy* src/interface/learning-session/services/attempt-finalization.service* src/interface/learning-session/services/learning-session.service* src/interface/learning-session/learning-session.controller.ts
git commit -m "feat(learning): orchestrate five learning modes"
```

### Task 7: Finish Multi-Mode Setup, Block Transitions, and Results

**Files:**
- Modify: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/setup/LearningModePicker.tsx`
- Modify: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/setup/LearningPreviewPanel.tsx`
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/session/LearningBlockRail.tsx`
- Modify: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/session/MixedLearningSessionPage.tsx`
- Modify: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/session/LearningResultView.tsx`
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/mastery/MasteryEvidenceSummary.tsx`
- Test: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/session/MixedLearningSessionPage.test.tsx`

**Interfaces:**
- Setup submits 1–5 enabled modes and explicit unadapted-word decisions.
- Result consumes server summary `{ independentCorrect, hintedCorrect, needsWork, pending, levelChanges, words[] }`.

- [ ] **Step 1: Write failing mixed-flow UI tests**

```tsx
await user.click(screen.getByRole('checkbox', { name: '微场景短文' }));
await user.click(screen.getByRole('checkbox', { name: '听音记忆' }));
await user.click(screen.getByRole('checkbox', { name: '易混辨析' }));
expect(screen.getByText('预计 3 个学习段')).toBeVisible();
expect(screen.getByText('下一段：听音记忆 · 5 题')).toBeVisible();
```

Assert mode does not change until the current block completes, recycle time is visible, pending output has its own count, and “结束本轮” preserves unfinished recycle words.

- [ ] **Step 2: Run mixed-flow tests and confirm failure**

Run: `cd /Users/liulin/Desktop/font/english/react-font && pnpm --filter @font/english-world test -- LearningSetupDrawer.test.tsx MixedLearningSessionPage.test.tsx --run`

Expected: FAIL for the not-yet-wired multi-mode transitions.

- [ ] **Step 3: Implement multi-select setup and block boundary UI**

Default first use to `micro_scene + listening`. Show each mode's coverage/reason and require `加入推荐模式` or `排除这些词` for unadapted words. During active work, rail shows current mode, completed blocks and next block; transition interstitial appears only after block completion. Display recycle additions as `加练 N 题 · 约 M 分钟` with a secondary `本轮到这里` action.

```ts
export interface LearningResultSummaryV1 {
  completedWords: number;
  elapsedSeconds: number;
  independentCorrect: number;
  hintedCorrect: number;
  needsWork: number;
  pending: number;
  levelChanges: number;
  words: LearningWordResultV1[];
}
```

- [ ] **Step 4: Run all learning UI tests and build**

Run: `cd /Users/liulin/Desktop/font/english/react-font && pnpm --filter @font/english-world test -- src/page/englishWorld/learning --run && pnpm --filter @font/english-world build`

Expected: PASS for 1–5 mode selection, explicit adaptation resolution, stable block transition, recycle display, early finish and result categories.

- [ ] **Step 5: Commit mixed desktop experience**

```bash
cd /Users/liulin/Desktop/font/english/react-font
git add apps/english-world/src/page/englishWorld/learning
git commit -m "feat(english-world): complete mixed learning workspace"
```

### Task 8: Add Complete Mixed-Session End-to-End Acceptance

**Files:**
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/cypress/e2e/learning-mixed-session.cy.ts`
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/cypress/e2e/learning-output-recovery.cy.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/test/learning-session.e2e-spec.ts`

**Interfaces:**
- Covers 12 selected words, `micro_scene + listening + confusion`, block transitions, cross-mode recycle, refresh and result.
- Covers output timeout/pending, safe leave, worker finalization and exactly-once evidence.

- [ ] **Step 1: Write failing acceptance flows**

```ts
cy.findByText('微场景短文').should('be.visible');
cy.findByRole('button', { name: '完成本段' }).click();
cy.findByText('下一段：听音记忆 · 5 题').should('be.visible');
cy.findByRole('button', { name: '进入听音记忆' }).click();
cy.findByText('加练 1 题').should('be.visible');
```

In the output spec, intercept submit as pending, reload, assert saved answer, then return a final snapshot and assert the system level changes only once.

- [ ] **Step 2: Run both Cypress specs and backend E2E to expose gaps**

Run: `cd /Users/liulin/Desktop/font/english/react-font/apps/english-world && pnpm e2e -- --spec "cypress/e2e/learning-mixed-session.cy.ts,cypress/e2e/learning-output-recovery.cy.ts"`

Run: `cd /Users/liulin/Desktop/font/english/nestjs && pnpm test:e2e -- learning-session.e2e-spec.ts --runInBand`

Expected: FAIL at uncovered mixed/pending transitions before fixture completion.

- [ ] **Step 3: Complete deterministic fixtures for every state transition**

Use explicit snapshots for `partial_ready`, each active block, one hinted/incorrect recycle candidate, `grading_pending`, worker-finalized output and completed result. Assert all detail payloads lack answer contracts and analytics requests lack answer/article text.

- [ ] **Step 4: Run the phase release gate**

Run backend: `cd /Users/liulin/Desktop/font/english/nestjs && pnpm test -- learning-session learning-mastery --runInBand && pnpm test:e2e -- learning-session.e2e-spec.ts --runInBand && pnpm build && git diff --check`

Run frontend: `cd /Users/liulin/Desktop/font/english/react-font && pnpm --filter @font/english-world test -- src/page/englishWorld/learning --run && pnpm --filter @font/english-world build && git diff --check`

Run Cypress: `cd /Users/liulin/Desktop/font/english/react-font/apps/english-world && pnpm e2e -- --spec "cypress/e2e/learning-mixed-session.cy.ts,cypress/e2e/learning-output-recovery.cy.ts"`

Expected: all commands PASS.

- [ ] **Step 5: Commit cross-repository acceptance separately**

```bash
cd /Users/liulin/Desktop/font/english/nestjs
git add test/learning-session.e2e-spec.ts
git commit -m "test(learning): cover mixed and output finalization"

cd /Users/liulin/Desktop/font/english/react-font
git add apps/english-world/cypress/e2e/learning-mixed-session.cy.ts apps/english-world/cypress/e2e/learning-output-recovery.cy.ts
git commit -m "test(english-world): cover mixed learning journey"
```

## Phase Exit Criteria

- All five modes are selectable and only chosen/eligible modes appear in a session.
- Mode changes occur at block boundaries; one normal word has one primary mode.
- Weak recycling changes mode, respects 2–4 item spacing and never exceeds three appended items.
- Directional confusion evidence and pending/final output evidence remain auditable and idempotent.
- A model timeout never appears as a wrong answer; the original output survives refresh and safe leave.
- Desktop result summaries, suggested next mode and next-review dates come entirely from the server snapshot.
