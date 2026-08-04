# Multi-Mode Learning Content, Root Family, and Micro-Scene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在已通过验收的听写闭环上，增加可恢复的 AI 内容任务、3–5 词微场景和可信词根/个人联想模式，并支持首段可用即开始。

**Architecture:** `learning_content` 保存版本化材料，`learning_job` 以 MySQL lease 驱动生成，外部模型调用不持有事务。词根关系只来自审核映射或用户联想；微场景 AI 输出通过严格 schema 和目标词覆盖校验后，才映射为统一 activity item。

**Tech Stack:** 继承基础阶段技术栈；复用 `src/common/utils/deepseek-client.util.ts`，不新增队列、ORM、schema 库或向量服务。

## Global Constraints

- 本计划以前置计划 `2026-08-04-multi-mode-learning-foundation-listening.md` 的退出条件全部通过为起点。
- 微场景每篇覆盖 3–5 个语义/场景相关且难度接近的词，正文 80–130 个英文词。
- 首段可用后会话进入 `partial_ready`；只预备当前段和下一段。
- AI 内容必须校验 schema、目标词覆盖、唯一答案和长度；无效内容不能交给用户。
- 内容缓存键包含规范化 word ID 集合、难度、mode、prompt version、model version 和 schema version。
- AI/Redis/SSE 失败不能回滚已提交的 MySQL 学习事实。
- 词根资料必须有 `reviewed` 或 `user_mnemonic` 来源；AI 不得创建权威词根关系。
- 用户联想只能由所属用户读取、编辑、停用或删除，不能覆盖系统映射。
- 正确答案继续只存在后端 answer contract；public content 只含题面。
- 后端现有用户未跟踪计划文件保持未暂存。

---

### Task 1: Implement Durable Job Claiming and Lease Recovery

**Files:**
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/repositories/learning-job.repository.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/workers/learning-job.worker.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/workers/learning-job.worker.spec.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/learning-session.module.ts`

**Interfaces:**
- Produces: `claimNextJob(workerId, now): Promise<ClaimedLearningJob | null>` and `runOnce(workerId): Promise<'idle' | 'completed' | 'retried' | 'failed'>`.
- Lease defaults: 60 seconds; max retries from persisted `maxRetries`; retry schedule 10, 30, 120 seconds.

- [ ] **Step 1: Write failing lease and duplicate-worker tests**

```ts
it('allows only one worker to claim a pending job', async () => {
  const [first, second] = await Promise.all([
    repository.claimNextJob('worker-a', now),
    repository.claimNextJob('worker-b', now),
  ]);
  expect([first, second].filter(Boolean)).toHaveLength(1);
});

it('reclaims processing work only after leaseUntil', async () => {
  expect(await repository.claimNextJob('worker-b', beforeExpiry)).toBeNull();
  expect(await repository.claimNextJob('worker-b', afterExpiry)).toMatchObject({ jobUid });
});
```

- [ ] **Step 2: Run the worker tests and confirm failure**

Run: `cd /Users/liulin/Desktop/font/english/nestjs && pnpm test -- learning-job.worker.spec.ts --runInBand`

Expected: FAIL because repository and worker do not exist.

- [ ] **Step 3: Implement claim, external execution, and final write phases**

```ts
export interface ClaimedLearningJob {
  id: number;
  jobUid: string;
  jobType: 'prepare_block' | 'grade_output';
  payloadJson: string;
  retryCount: number;
  maxRetries: number;
  leaseOwner: string;
  leaseUntil: Date;
}
```

Claim in a short transaction using `lock: transaction.LOCK.UPDATE`, select the earliest runnable `pending|retry_wait` row, and update it to `processing`. Commit before invoking a handler. On success, use a second transaction to check `leaseOwner` and terminal status, persist result once, clear lease, and publish a version notification. On error, persist `retry_wait` with the exact backoff or `failed` after the final attempt.

- [ ] **Step 4: Run focused tests and build**

Run: `cd /Users/liulin/Desktop/font/english/nestjs && pnpm test -- learning-job.worker.spec.ts --runInBand && pnpm build`

Expected: PASS for exclusive claim, expired lease recovery, duplicate finalization and bounded retry.

- [ ] **Step 5: Commit durable jobs**

```bash
cd /Users/liulin/Desktop/font/english/nestjs
git add src/interface/learning-session/repositories/learning-job.repository.ts src/interface/learning-session/workers src/interface/learning-session/learning-session.module.ts
git commit -m "feat(learning): add durable content jobs"
```

### Task 2: Add Strict Micro-Scene Content Generation and Cache Validation

**Files:**
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/repositories/learning-content.repository.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/services/activity-generation.service.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/services/activity-generation.service.spec.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/workers/learning-job.worker.ts`

**Interfaces:**
- Produces: `prepareMicroScene(input: MicroSceneGenerationInputV1): Promise<ValidatedMicroSceneContentV1>`.
- Produces cache key: `sha256("micro_scene|v1|<sortedIds>|<level>|<promptVersion>|<modelVersion>")`.

- [ ] **Step 1: Write failing validation and cache tests**

```ts
it.each([
  ['missing target word', makeAiResult({ article: 'Only inspect appears.' })],
  ['article too short', makeAiResult({ article: 'inspect confirm assure' })],
  ['duplicate choice answer', makeAiResult({ choices: ['inspect', 'inspect'] })],
])('rejects %s', async (_name, result) => {
  ai.complete.mockResolvedValue(result);
  await expect(service.prepareMicroScene(input)).rejects.toMatchObject({
    errorCode: 'LEARNING_CONTENT_INVALID',
  });
});
```

- [ ] **Step 2: Run generation tests and confirm failure**

Run: `cd /Users/liulin/Desktop/font/english/nestjs && pnpm test -- activity-generation.service.spec.ts --runInBand`

Expected: FAIL because content generation and validator are missing.

- [ ] **Step 3: Implement the exact generated envelope and validator**

```ts
export interface ValidatedMicroSceneContentV1 {
  schemaVersion: 1;
  contentType: 'micro_scene';
  title: string;
  article: string;
  targetWords: Array<{ wordId: number; word: string; gloss: string }>;
  recallItems: Array<{
    itemUid: string;
    sentence: string;
    targetWordId: number;
    choices: Array<{ value: string; label: string }>;
    correctValue: string;
  }>;
  verifyItems: Array<{
    itemUid: string;
    sentence: string;
    targetWordId: number;
    acceptedSpellings: string[];
  }>;
}

export interface MicroSceneGenerationInputV1 {
  userId: number;
  sessionId: number;
  blockId: number;
  level: 0 | 1 | 2 | 3;
  words: Array<{ wordId: number; word: string; gloss: string; partOfSpeech?: string }>;
  promptVersion: 'micro-scene-v1';
  modelVersion: string;
}
```

Validate exactly 3–5 unique target words, 80–130 English word tokens, every target appearing in the article, one recall and one verify item per target, unique choice values, correct value present once, sentence length 5–35 tokens, and no unknown word IDs. Store full payload privately; map correct values/accepted spellings into item answer contracts before public delivery. Reuse only `quality_status = 'validated'` content with matching cache key.

- [ ] **Step 4: Run validation, cache, and model-client tests**

Run: `cd /Users/liulin/Desktop/font/english/nestjs && pnpm test -- activity-generation.service.spec.ts deepseek-client.util.spec.ts --runInBand`

Expected: PASS for valid generation, invalid schema rejection, cache hit without model call, and version cache miss.

- [ ] **Step 5: Commit generation service**

```bash
cd /Users/liulin/Desktop/font/english/nestjs
git add src/interface/learning-session/repositories/learning-content.repository.ts src/interface/learning-session/services/activity-generation.service* src/interface/learning-session/workers/learning-job.worker.ts
git commit -m "feat(learning): generate validated micro scenes"
```

### Task 3: Integrate Micro-Scene Blocks and Partial-Ready Recovery

**Files:**
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/activities/micro-scene.activity.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/dto/report-learning-content.dto.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/contracts/activity-contract.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/learning-session.controller.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/services/learning-session.service.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/domain/orchestration-policy.ts`
- Test: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/activities/activities.spec.ts`
- Test: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/services/learning-session.service.spec.ts`

**Interfaces:**
- Adds public item types `micro_scene_reading`, `micro_scene_choice`, `micro_scene_spelling`.
- Create may return `status: 'partial_ready'` with a ready listening block while one micro-scene `prepare_block` job is pending.
- Adds `POST /learning-session/content/report`; it accepts only content IDs linked to the current user's session.

- [ ] **Step 1: Write failing grouping and partial-ready tests**

```ts
it('creates one micro scene for three to five compatible words', () => {
  const plan = previewLearningPlan(inputWithFiveSceneWords);
  expect(plan.blocks).toContainEqual(expect.objectContaining({
    mode: 'micro_scene', wordIds: [1, 2, 3, 4, 5], contentStatus: 'required',
  }));
});

it('keeps a ready listening block active when scene generation fails', async () => {
  expect(await service.detail(userId, sessionId)).toMatchObject({
    status: 'partial_ready', currentBlock: { mode: 'listening' },
  });
});
```

- [ ] **Step 2: Run backend activity tests and confirm failure**

Run: `cd /Users/liulin/Desktop/font/english/nestjs && pnpm test -- activities.spec.ts learning-session.service.spec.ts --runInBand`

Expected: FAIL because micro-scene contracts and block preparation are missing.

- [ ] **Step 3: Implement deterministic grouping and item materialization**

Group candidates by normalized part of speech + mastery band, then ask one controlled generation call to confirm a natural shared setting. Do not merge unrelated leftovers; return each unadapted word with `reason: 'no_natural_scene_group'`. Materialize reading → recall choice → new-sentence spelling; only recall/verify attempts emit evidence. Keep at most current and next block in `ready|preparing` state. A content report command `{ sessionId, contentId, reason: 'word_missing'|'unnatural_scene'|'wrong_gloss'|'other', note?: string }` limits note to 200 characters, marks cache `quality_status = 'reported'`, prevents future reuse, and queues one replacement job without changing completed evidence.

```ts
export interface MicroSceneChoicePublicItemV1 {
  itemType: 'micro_scene_choice';
  itemUid: string;
  sceneContentId: number;
  sentence: string;
  choices: Array<{ value: string; label: string }>;
  targetWordId: number;
}
```

- [ ] **Step 4: Run activity, service, and contract tests**

Run: `cd /Users/liulin/Desktop/font/english/nestjs && pnpm test -- activities.spec.ts learning-session.service.spec.ts activity-contract.spec.ts --runInBand && pnpm build`

Expected: PASS; partial generation failure leaves usable content active and never emits incorrect evidence.

- [ ] **Step 5: Commit micro-scene orchestration**

```bash
cd /Users/liulin/Desktop/font/english/nestjs
git add src/interface/learning-session/activities src/interface/learning-session/dto/report-learning-content.dto.ts src/interface/learning-session/contracts src/interface/learning-session/learning-session.controller.ts src/interface/learning-session/services/learning-session.service* src/interface/learning-session/domain/orchestration-policy*
git commit -m "feat(learning): add micro scene blocks"
```

### Task 4: Add Reviewed Root Knowledge and User Mnemonics

**Files:**
- Create: `/Users/liulin/Desktop/font/english/nestjs/migrations/create-mixed-learning-knowledge.sql`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/database/root-morpheme.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/database/word-root-mapping.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/database/user-mnemonic.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/database/confusion-pair.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/database/user-confusion-pair.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/activities/root-family.activity.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/database/init-models.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/init.sql`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/migrations/README.md`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/learning-session.controller.ts`
- Test: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/activities/activities.spec.ts`

**Interfaces:**
- Adds `root_family_study` and `root_family_spelling` public items.
- Adds commands `POST /learning-session/root-mnemonic/save` and `/learning-session/root-mnemonic/disable` scoped to current user.

- [ ] **Step 1: Write failing provenance and ownership tests**

```ts
it('does not adapt a word without reviewed mapping or user mnemonic', async () => {
  expect(await rootActivity.evaluate(wordWithoutRoot, userId)).toEqual({
    eligible: false, reason: 'no_reliable_root_mapping',
  });
});

it('cannot edit another user mnemonic', async () => {
  await expect(service.disableMnemonic(otherUserId, mnemonicId))
    .rejects.toMatchObject({ errorCode: 'LEARNING_RESOURCE_UNAVAILABLE' });
});
```

- [ ] **Step 2: Run root tests and confirm failure**

Run: `cd /Users/liulin/Desktop/font/english/nestjs && pnpm test -- activities.spec.ts --runInBand`

Expected: FAIL because root models and adapter do not exist.

- [ ] **Step 3: Implement exact knowledge provenance**

```text
root_morpheme: id,morpheme,kind,meaning,explanation,source_type,source_reference,
  review_status,version,create_time,update_time
word_root_mapping: id,word_id,root_morpheme_id,prefix_text,root_text,suffix_text,
  explanation,source_type,review_status,create_time,update_time
user_mnemonic: id,user_id,word_id,split_text,mnemonic_text,status,create_time,update_time
confusion_pair: id,left_word_id,right_word_id,direction_key,summary,structures_json,
  examples_json,source_type,review_status,version,create_time,update_time
user_confusion_pair: id,user_id,left_word_id,right_word_id,direction_key,note,status,
  create_time,update_time
```

Unique keys: `(word_id, root_morpheme_id)`, `(user_id, word_id)`, `(left_word_id, right_word_id, direction_key)`, and `(user_id, left_word_id, right_word_id, direction_key)`. The root adapter may publish reviewed system data or the current user's active mnemonic, labels the latter `个人记忆`, shows 2–4 reviewed family words, and uses server-side accepted spelling for recall.

- [ ] **Step 4: Run schema, ownership, and build gates**

Run: `cd /Users/liulin/Desktop/font/english/nestjs && pnpm test -- activities.spec.ts learning-session.controller.spec.ts init-models.spec.ts --runInBand && pnpm build && git diff --check`

Expected: PASS; an AI-generated root without reviewed/user provenance remains ineligible.

- [ ] **Step 5: Commit knowledge data and root mode**

```bash
cd /Users/liulin/Desktop/font/english/nestjs
git add migrations/create-mixed-learning-knowledge.sql migrations/README.md init.sql src/database/root-morpheme.ts src/database/word-root-mapping.ts src/database/user-mnemonic.ts src/database/confusion-pair.ts src/database/user-confusion-pair.ts src/database/init-models.ts src/interface/learning-session
git commit -m "feat(learning): add reviewed root family mode"
```

### Task 5: Build the Frontend Micro-Scene Activity

**Files:**
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/activities/micro-scene/MicroSceneActivity.tsx`
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/activities/micro-scene/MicroSceneActivity.test.tsx`
- Modify: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/contracts/activity-contract.ts`
- Modify: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/api/learningApi.ts`
- Modify: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/session/activityRegistry.tsx`

**Interfaces:**
- Consumes the three micro-scene public item variants from Task 3.
- Emits `choice` or `spelling` drafts; reading/highlight interactions never expose an answer contract.

- [ ] **Step 1: Write failing reading, recall and verify tests**

```tsx
render(<MicroSceneActivity item={readingItem} {...handlers} />);
expect(screen.getByText(/A busy inspection day/)).toBeVisible();
expect(screen.getAllByRole('button', { name: /查看 .* 的释义/ })).toHaveLength(4);
expect(screen.getByRole('button', { name: '进入主动回忆' })).toBeEnabled();
```

For recall, select one option and assert a `choice` draft. For verify, type spelling and assert Enter submits. Do not search the original article DOM while a verify item is active.

- [ ] **Step 2: Run renderer tests and confirm failure**

Run: `cd /Users/liulin/Desktop/font/english/react-font && pnpm --filter @font/english-world test -- MicroSceneActivity.test.tsx activity-contract.test.ts --run`

Expected: FAIL because the new variants and renderer are absent.

- [ ] **Step 3: Implement the flat reading and controlled answer views**

Use one material region and one task region at a desktop max width of 1120px. Highlight targets with semantic buttons, show only short gloss/phonetic on demand, announce `部分可用` with text when applicable, and preserve a single primary action. Map `micro_scene` to `MicroSceneActivity` in the registry. A secondary “报告内容问题” action opens the four fixed reasons, optional 200-character note, submits `reportLearningContent`, and shows that reported content is being replaced.

```ts
const draft: LearningAnswerDraft = item.itemType === 'micro_scene_choice'
  ? { kind: 'choice', selectedValue }
  : { kind: 'spelling', text };
```

- [ ] **Step 4: Run component and build checks**

Run: `cd /Users/liulin/Desktop/font/english/react-font && pnpm --filter @font/english-world test -- MicroSceneActivity.test.tsx activity-contract.test.ts --run && pnpm --filter @font/english-world build`

Expected: PASS for 3–5 targets, hint popover focus return, choice mapping, spelling and partial-ready text.

- [ ] **Step 5: Commit micro-scene UI**

```bash
cd /Users/liulin/Desktop/font/english/react-font
git add apps/english-world/src/page/englishWorld/learning/activities/micro-scene apps/english-world/src/page/englishWorld/learning/contracts apps/english-world/src/page/englishWorld/learning/api/learningApi.ts apps/english-world/src/page/englishWorld/learning/session/activityRegistry.tsx
git commit -m "feat(english-world): add micro scene activity"
```

### Task 6: Build the Frontend Root-Family Activity and Personal Mnemonic Editor

**Files:**
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/activities/root-family/RootFamilyActivity.tsx`
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/activities/root-family/RootFamilyActivity.test.tsx`
- Modify: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/api/learningApi.ts`
- Modify: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/contracts/activity-contract.ts`
- Modify: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/session/activityRegistry.tsx`

**Interfaces:**
- Adds descriptors `saveRootMnemonic` and `disableRootMnemonic`.
- Emits spelling drafts and mnemonic commands without mutating system root data.

- [ ] **Step 1: Write failing root provenance and editing tests**

```tsx
expect(screen.getByText('已审核词根')).toBeVisible();
expect(screen.getByText('in-（向内）+ spect（看）')).toBeVisible();
await user.click(screen.getByRole('button', { name: '添加个人联想' }));
await user.type(screen.getByLabelText('我的联想'), '往里面看，就是检查');
await user.click(screen.getByRole('button', { name: '保存个人联想' }));
expect(saveRootMnemonic).toHaveBeenCalledWith(expect.objectContaining({ wordId: 7 }));
```

- [ ] **Step 2: Run root renderer tests and confirm failure**

Run: `cd /Users/liulin/Desktop/font/english/react-font && pnpm --filter @font/english-world test -- RootFamilyActivity.test.tsx --run`

Expected: FAIL because renderer and mnemonic descriptors do not exist.

- [ ] **Step 3: Implement study, recall, and user-source labeling**

Render one core decomposition, one short explanation, and 2–4 flat family rows. System sources show `已审核词根`; personal data shows `个人记忆`. The edit drawer limits split text to 80 characters and mnemonic text to 300, returns focus to its trigger, and refreshes the current session after save/disable.

```ts
export interface SaveRootMnemonicCommandV1 {
  wordId: number;
  splitText: string;
  mnemonicText: string;
}
```

- [ ] **Step 4: Run component, API, and build checks**

Run: `cd /Users/liulin/Desktop/font/english/react-font && pnpm --filter @font/english-world test -- RootFamilyActivity.test.tsx learningApi.test.ts --run && pnpm --filter @font/english-world build`

Expected: PASS for provenance labels, 2–4 family words, spelling recall, save, disable and focus recovery.

- [ ] **Step 5: Commit root-family UI**

```bash
cd /Users/liulin/Desktop/font/english/react-font
git add apps/english-world/src/page/englishWorld/learning/activities/root-family apps/english-world/src/page/englishWorld/learning/api apps/english-world/src/page/englishWorld/learning/contracts apps/english-world/src/page/englishWorld/learning/session/activityRegistry.tsx
git commit -m "feat(english-world): add root family activity"
```

### Task 7: Add SSE Invalidation, Polling Fallback, and Phase Acceptance

**Files:**
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/services/learning-session-events.service.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/learning-session.controller.ts`
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/session/useLearningSessionEvents.ts`
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/session/useLearningSessionEvents.test.ts`
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/cypress/e2e/learning-content-recovery.cy.ts`

**Interfaces:**
- Produces `GET /learning-session/events?sessionId=...` with events `{ schemaVersion: 1, eventUid, sessionId, sessionVersion, occurredAt }`.
- Event reception only invalidates `learningKeys.session(sessionId)`; reconnect failure polls detail every 5 seconds while `preparing|partial_ready|grading_pending` exists.

- [ ] **Step 1: Write failing invalidation and recovery tests**

```ts
emit({ schemaVersion: 1, eventUid: 'evt-1', sessionId: 9, sessionVersion: 4, occurredAt: now });
expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['learning', 'session', 9] });
expect(setQueryData).not.toHaveBeenCalled();
```

- [ ] **Step 2: Run events tests and confirm failure**

Run: `cd /Users/liulin/Desktop/font/english/react-font && pnpm --filter @font/english-world test -- useLearningSessionEvents.test.ts --run`

Expected: FAIL because the hook does not exist.

- [ ] **Step 3: Implement safe event notification and fallback**

Authorize the event subscription with the current user and session owner before attaching a listener. Send heartbeat separately, never include item/content/answer payload, and close listeners on disconnect. The frontend keeps the last snapshot, displays `正在重新连接`, retries SSE with capped exponential backoff, and starts 5-second REST polling until the session becomes stable.

- [ ] **Step 4: Run both repositories and recovery E2E**

Run backend: `cd /Users/liulin/Desktop/font/english/nestjs && pnpm test -- learning-session --runInBand && pnpm build`

Run frontend: `cd /Users/liulin/Desktop/font/english/react-font && pnpm --filter @font/english-world test -- src/page/englishWorld/learning --run && pnpm --filter @font/english-world build`

Run E2E: `cd /Users/liulin/Desktop/font/english/react-font/apps/english-world && pnpm e2e -- --spec cypress/e2e/learning-content-recovery.cy.ts`

Expected: PASS; the user starts a ready listening/root block while scene generation is pending, reloads, then sees the validated scene after REST refetch.

- [ ] **Step 5: Commit phase recovery coverage in each repository**

```bash
cd /Users/liulin/Desktop/font/english/nestjs
git add src/interface/learning-session/services/learning-session-events.service.ts src/interface/learning-session/learning-session.controller.ts
git commit -m "feat(learning): publish session version events"

cd /Users/liulin/Desktop/font/english/react-font
git add apps/english-world/src/page/englishWorld/learning/session/useLearningSessionEvents* apps/english-world/cypress/e2e/learning-content-recovery.cy.ts
git commit -m "feat(english-world): recover generated learning blocks"
```

## Phase Exit Criteria

- A session can start when one block is ready while a micro-scene job remains pending.
- Worker restart, duplicate claim, invalid model output and SSE disconnect all converge through MySQL detail state.
- Micro-scenes contain 3–5 targets and 80–130 words, with valid recall and new-sentence verify items.
- Root mode never displays an unreviewed AI relationship as authoritative; personal mnemonics stay user-owned and labeled.
- Listening remains fully functional, proving the new modes extend rather than replace the first vertical slice.
