# Multi-Mode Learning Foundation and Listening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付“词库选词 → 模式预览 → 创建会话 → 听音答题 → 写入六维证据 → 更新掌握与复习时间 → 结果页”的首条可运行闭环。

**Architecture:** MySQL 保存会话、题目、尝试、证据和掌握投影；NestJS 在一个确定性 finalization transaction 中完成判分与推进。React Query 持有服务端快照，纯 reducer 持有当前题草稿；第一阶段 capability 只开放 `listening`，但契约从第一天支持五种 mode 判别值。

**Tech Stack:** React 18.3.1、TypeScript 5.7.2、Vite 6.2、Ant Design 5.27、TanStack Query 5.90、Vitest 4、Cypress 15；NestJS 10、TypeScript 5.1、Sequelize 6.37、MySQL、Jest 29。

## Global Constraints

- 一轮支持 1–20 个词，默认推荐 8–12 个；超过 20 个必须要求用户重新选择，不能静默截取。
- 用户可选择 1–5 种模式；系统只能使用用户已选且 capability 已开放的模式。
- 每个普通词本轮只有一个主模式；薄弱回收至少间隔 2 个 item，最多间隔 4 个 item 后再出现。
- AI `grading_pending` 不产生正确或错误证据，不改变等级。
- 一个完成的会话最多自动提升或下降一个等级；单次全对不能直接进入“精通”。
- 系统等级、用户手动等级和历史 evidence 分开保存；手动设置不能重写 evidence。
- 正确答案只保存在服务端；detail、SSE、日志和分析事件不得返回答案契约。
- MySQL 是唯一事实来源；Redis、SSE 和 localStorage 都只能优化体验。
- 桌面学习区最大可读宽度约 1120px；移动触控目标至少 44px。
- 不新增向量数据库、状态管理框架、任务队列或 UI 组件库。
- 后端仓库 `/Users/liulin/Desktop/font/english/nestjs` 中现有未跟踪计划文件不属于本功能，禁止暂存或提交。

---

## File Map

**Backend created:** `migrations/create-mixed-learning-foundation.sql`, eleven `src/database/learning-*.ts`/`word-mastery-profile.ts` models, `src/interface/learning-session/**`, `src/interface/learning-mastery/**`, and `test/learning-session.e2e-spec.ts`.

**Backend modified:** `init.sql`, `migrations/README.md`, `src/database/init-models.ts`, `src/app.module.ts`.

**Frontend created:** `apps/english-world/src/page/englishWorld/learning/{api,contracts,setup,session,activities/listening,mastery,shared}/**` and `cypress/e2e/learning-listening-session.cy.ts`.

**Frontend modified:** `apps/english-world/src/page/englishWorld/EnglishWorld.tsx`, `apps/english-world/src/page/englishWorld/types/learning.ts`, `apps/english-world/src/page/englishWorld/server/learning.ts`, `apps/english-world/src/router/router.tsx`.

### Task 1: Freeze the V1 Public Activity Contract in the Backend

**Files:**
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/contracts/activity-contract.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/contracts/activity-public.mapper.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/contracts/activity-contract.spec.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/contracts/fixtures/activity-envelope-v1.json`

**Interfaces:**
- Produces: `LearningMode`, `ActivityEnvelopeV1`, `StoredActivityEnvelopeV1`, `PublicLearningItemV1`, `LearningAnswerV1`, `stripAnswerContract()`.
- Produces invariant: JSON serialization of a public item contains neither `answerContract` nor `correctAnswer`.

- [ ] **Step 1: Write the failing contract and stripping tests**

```ts
describe('stripAnswerContract', () => {
  it('returns a listening item without the spelling answer', () => {
    const stored: StoredActivityEnvelopeV1 = {
      schemaVersion: 1,
      mode: 'listening',
      phase: 'recall',
      item: {
        itemType: 'listening_spelling',
        itemUid: 'item-1',
        wordId: 7,
        audio: { britishUrl: '/uk.mp3', americanUrl: '/us.mp3' },
      },
      answerContract: { kind: 'spelling', accepted: ['inspect'] },
    };

    expect(JSON.stringify(stripAnswerContract(stored))).not.toContain('inspect');
    expect(stripAnswerContract(stored).item.itemType).toBe('listening_spelling');
  });
});
```

- [ ] **Step 2: Run the test and confirm the contract is absent**

Run: `cd /Users/liulin/Desktop/font/english/nestjs && pnpm test -- activity-contract.spec.ts --runInBand`

Expected: FAIL because `StoredActivityEnvelopeV1` and `stripAnswerContract` do not exist.

- [ ] **Step 3: Implement the discriminated unions and explicit mapper**

```ts
export type LearningMode =
  | 'root_family'
  | 'micro_scene'
  | 'confusion'
  | 'listening'
  | 'output';

export type MasteryDimension =
  | 'meaning_recognition'
  | 'active_recall'
  | 'spelling'
  | 'listening'
  | 'context'
  | 'output';

export type LearningAnswerV1 =
  | { kind: 'choice'; selectedValue: string }
  | { kind: 'spelling'; text: string }
  | { kind: 'output'; text: string }
  | { kind: 'skip'; reason: 'dont_know' | 'audio_unavailable' };

export interface ListeningPublicItemV1 {
  itemType: 'listening_meaning' | 'listening_spelling';
  itemUid: string;
  wordId: number;
  audio: { britishUrl?: string; americanUrl?: string };
  meaningChoices?: Array<{ value: string; label: string }>;
}

export interface StoredActivityEnvelopeV1 {
  schemaVersion: 1;
  mode: LearningMode;
  phase: 'understand' | 'recall' | 'verify';
  item: ListeningPublicItemV1;
  answerContract:
    | { kind: 'choice'; correctValue: string }
    | { kind: 'spelling'; accepted: string[] };
}

export type ActivityEnvelopeV1 = Omit<StoredActivityEnvelopeV1, 'answerContract'>;

export function stripAnswerContract(
  stored: StoredActivityEnvelopeV1,
): ActivityEnvelopeV1 {
  const { answerContract: _answerContract, ...publicEnvelope } = stored;
  return publicEnvelope;
}
```

The fixture must serialize one valid `listening_spelling` public envelope with `schemaVersion: 1`, `mode: "listening"`, and no answer fields.

- [ ] **Step 4: Run the focused test**

Run: `cd /Users/liulin/Desktop/font/english/nestjs && pnpm test -- activity-contract.spec.ts --runInBand`

Expected: PASS; the serialized public envelope contains no accepted spelling.

- [ ] **Step 5: Commit the backend contract**

```bash
cd /Users/liulin/Desktop/font/english/nestjs
git add src/interface/learning-session/contracts
git commit -m "feat(learning): define activity contract v1"
```

### Task 2: Create the Foundation Schema and Sequelize Models

**Files:**
- Create: `/Users/liulin/Desktop/font/english/nestjs/migrations/create-mixed-learning-foundation.sql`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/database/learning-session.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/database/learning-session-word.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/database/learning-block.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/database/learning-item.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/database/learning-item-word.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/database/learning-attempt.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/database/learning-evidence.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/database/word-mastery-profile.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/database/learning-mastery-override.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/database/learning-content.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/database/learning-job.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/database/init-models.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/init.sql`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/migrations/README.md`
- Test: `/Users/liulin/Desktop/font/english/nestjs/src/database/init-models.spec.ts`

**Interfaces:**
- Produces: model keys `learningSession`, `learningSessionWord`, `learningBlock`, `learningItem`, `learningItemWord`, `learningAttempt`, `learningEvidence`, `wordMasteryProfile`, `learningMasteryOverride`, `learningContent`, `learningJob` from `initModels()`.
- Produces unique constraints: `(user_id, session_uid)`, `(user_id, request_uid)`, `(user_id, attempt_uid)`, `(user_id, event_uid)`, `(user_id, word_id)`, `(user_id, override_uid)`, `cache_key`, and `job_uid`.

- [ ] **Step 1: Extend the failing model registry test**

```ts
it('initializes every mixed-learning model', () => {
  const models = initModels(sequelize);
  expect(Object.keys(models)).toEqual(
    expect.arrayContaining([
      'learningSession', 'learningSessionWord', 'learningBlock',
      'learningItem', 'learningItemWord', 'learningAttempt',
      'learningEvidence', 'wordMasteryProfile', 'learningMasteryOverride',
      'learningContent', 'learningJob',
    ]),
  );
});
```

- [ ] **Step 2: Run the registry test and confirm it fails**

Run: `cd /Users/liulin/Desktop/font/english/nestjs && pnpm test -- init-models.spec.ts --runInBand`

Expected: FAIL because the ten model keys are missing.

- [ ] **Step 3: Write the additive DDL and matching model definitions**

Use `int AUTO_INCREMENT` primary keys, `datetime` timestamps, `text` JSON envelopes, `varchar(24|32|64|160)` status/UID columns, `utf8mb4`, and these exact normalized columns:

```text
learning_session: id,user_id,session_uid,request_uid,request_hash,status,
  selected_modes_json,mastery_filter_json,orchestration_version,session_version,
  current_block_id,current_item_id,estimated_seconds,create_time,update_time,
  start_time,pause_time,complete_time
learning_session_word: id,session_id,user_id,word_id,source_order,primary_mode,
  eligible_modes_json,adaptation_status,adaptation_reason,recycle_status,create_time
learning_block: id,session_id,user_id,block_order,mode,status,content_status,
  estimated_seconds,create_time,update_time,complete_time
learning_item: id,session_id,block_id,user_id,item_uid,item_order,mode,phase,item_type,
  status,prompt_json,answer_contract_json,content_id,is_recycle,create_time,update_time
learning_item_word: id,item_id,word_id,user_id,role,create_time
learning_attempt: id,user_id,session_id,item_id,attempt_uid,request_hash,status,
  answer_json,result_json,hint_count,hint_types_json,grading_source,grading_version,
  create_time,update_time,complete_time
learning_evidence: id,user_id,event_uid,session_id,item_id,attempt_id,word_id,mode,
  dimension,outcome,is_independent,hint_count,answer_snapshot,grading_source,
  grading_version,policy_version,supersedes_event_id,create_time
word_mastery_profile: id,user_id,word_id,dimension_state_json,system_level,
  manual_level,manual_set_time,baseline_source,srs_state_json,next_review_at,
  last_mode,last_success_time,last_failure_time,policy_version,projection_version,
  create_time,update_time
learning_mastery_override: id,user_id,word_id,override_uid,request_hash,
  previous_manual_level,manual_level,create_time
learning_content: id,cache_key,content_type,status,schema_version,payload_json,
  prompt_version,model_version,quality_version,quality_status,content_hash,
  create_time,update_time,expire_time
learning_job: id,job_uid,user_id,session_id,block_id,attempt_id,job_type,status,
  payload_json,result_json,error_code,error_message,retry_count,max_retries,
  next_run_at,lease_owner,lease_until,create_time,update_time,complete_time
```

Every Sequelize camelCase property must set `field` to the exact snake_case column. `init.sql` must contain the same `CREATE TABLE IF NOT EXISTS` definitions; the migration README must list this migration before knowledge/content feature migrations.

- [ ] **Step 4: Verify model registration and SQL hygiene**

Run: `cd /Users/liulin/Desktop/font/english/nestjs && pnpm test -- init-models.spec.ts --runInBand && pnpm build && git diff --check`

Expected: tests and build PASS; `git diff --check` prints nothing.

- [ ] **Step 5: Commit the schema as one atomic backend change**

```bash
cd /Users/liulin/Desktop/font/english/nestjs
git add migrations/create-mixed-learning-foundation.sql migrations/README.md init.sql src/database/init-models.ts src/database/learning-*.ts src/database/word-mastery-profile.ts src/database/init-models.spec.ts
git commit -m "feat(learning): add mixed learning schema"
```

Before committing, run `git status --short` and verify the pre-existing untracked plan file remains unstaged.

### Task 3: Implement MasteryPolicyV1 as a Pure Function

**Files:**
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-mastery/mastery-policy.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-mastery/mastery-policy.spec.ts`

**Interfaces:**
- Produces: `deriveMasteryProjection(input: MasteryPolicyInput): MasteryPolicyResult`.
- Consumes only final outcomes: `correct | incorrect | skipped`; `grading_pending` is not a legal evidence outcome.
- Produces `policyVersion: 'mastery-v1'`, six dimension scores, `systemLevel`, `nextReviewAt`, and `recommendedMode`.

- [ ] **Step 1: Write failing policy tests for the product invariants**

```ts
export interface MasteryPolicyInput {
  now: Date;
  sessionStartLevel: 0 | 1 | 2 | 3;
  manualLevel: 0 | 1 | 2 | 3 | null;
  dimensionScores: Record<MasteryDimension, number>;
  finalEvidence: Array<{
    dimension: MasteryDimension;
    outcome: 'correct' | 'incorrect' | 'skipped';
    isIndependent: boolean;
    occurredAt: Date;
    mode: LearningMode;
  }>;
  selectedModes: LearningMode[];
  lastMode?: LearningMode;
}

export interface MasteryPolicyResult {
  policyVersion: 'mastery-v1';
  dimensionScores: Record<MasteryDimension, number>;
  systemLevel: 0 | 1 | 2 | 3;
  displayLevel: 0 | 1 | 2 | 3;
  nextReviewAt: Date;
  recommendedMode: LearningMode;
}

it.each([
  ['one perfect session cannot jump to expert', 0, 1],
  ['one weak session cannot drop more than one level', 3, 2],
] as const)('%s', (_name, startLevel, expected) => {
  expect(deriveMasteryProjection(makeInput({ startLevel })).systemLevel)
    .toBe(expected);
});

it('keeps manual level separate from the system recommendation', () => {
  const result = deriveMasteryProjection(makeInput({ startLevel: 1, manualLevel: 3 }));
  expect(result.systemLevel).toBe(2);
  expect(result.displayLevel).toBe(3);
});
```

- [ ] **Step 2: Run the policy tests and confirm failure**

Run: `cd /Users/liulin/Desktop/font/english/nestjs && pnpm test -- mastery-policy.spec.ts --runInBand`

Expected: FAIL because `deriveMasteryProjection` does not exist.

- [ ] **Step 3: Implement the exact V1 scoring and scheduling rules**

```ts
const OUTCOME_DELTA = {
  correct_independent: 2,
  correct_with_hint: 1,
  incorrect: -2,
  skipped: -2,
} as const;

const REVIEW_DAYS_BY_LEVEL = [1, 3, 7, 14] as const;

// Clamp each dimension score to [-8, 8]. A candidate level needs:
// 0: mean score < 0
// 1: mean score >= 0
// 2: mean score >= 2, at least 2 evidence dimensions, at least 2 UTC dates
// 3: mean score >= 4, at least 4 dimensions, at least 3 UTC dates,
//    including a final independent listening or output success.
// Clamp the candidate to sessionStartLevel ± 1.
// incorrect/skipped => next day; hinted correct => two days;
// independent correct => REVIEW_DAYS_BY_LEVEL[systemLevel].
```

`recommendedMode` maps weakest dimension as follows: `spelling|listening → listening`, `context → micro_scene`, `meaning_recognition → confusion`, `active_recall → root_family`, `output → output`. If two dimensions tie, prefer a selected mode not equal to `lastMode`; otherwise use the first selected mode.

- [ ] **Step 4: Run all policy cases**

Run: `cd /Users/liulin/Desktop/font/english/nestjs && pnpm test -- mastery-policy.spec.ts --runInBand`

Expected: PASS for level clamp, cross-day expert guard, pending exclusion, manual separation, scheduling, and recommended mode.

- [ ] **Step 5: Commit the pure policy**

```bash
cd /Users/liulin/Desktop/font/english/nestjs
git add src/interface/learning-mastery/mastery-policy.ts src/interface/learning-mastery/mastery-policy.spec.ts
git commit -m "feat(learning): add mastery policy v1"
```

### Task 4: Implement Preview and Listening-Only Orchestration

**Files:**
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/domain/learning-session.types.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/domain/orchestration-policy.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/domain/orchestration-policy.spec.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/domain/learning-session.machine.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/domain/learning-session.machine.spec.ts`

**Interfaces:**
- Produces: `previewLearningPlan(input): LearningPlanPreviewV1` and `transitionLearningSession(state, event): LearningSessionState`.
- First-stage capabilities: `listening: enabled`; the other four modes return `status: 'coming_soon'` and cannot be selected by create.

- [ ] **Step 1: Write failing orchestration and state transition tests**

```ts
export interface LearningPlanPreviewV1 {
  wordCount: number;
  estimatedSeconds: number;
  words: Array<{
    wordId: number;
    sourceOrder: number;
    primaryMode?: LearningMode;
    eligibleModes: LearningMode[];
    adaptationStatus: 'adapted' | 'unadapted';
    reason?: string;
  }>;
  blocks: Array<{
    mode: LearningMode;
    wordIds: number[];
    answerItemCount: number;
    estimatedSeconds: number;
  }>;
}

it('rejects more than twenty words without truncating', () => {
  expect(() => previewLearningPlan(makeInput({ wordIds: range(1, 22) })))
    .toThrow('LEARNING_WORD_LIMIT_EXCEEDED');
});

it('keeps source order while grouping listening items', () => {
  const result = previewLearningPlan(makeInput({ wordIds: [9, 3, 7] }));
  expect(result.words.map((word) => word.wordId)).toEqual([9, 3, 7]);
  expect(result.blocks[0].mode).toBe('listening');
});
```

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `cd /Users/liulin/Desktop/font/english/nestjs && pnpm test -- orchestration-policy.spec.ts learning-session.machine.spec.ts --runInBand`

Expected: FAIL because policy and machine functions do not exist.

- [ ] **Step 3: Implement preview and legal transitions**

```ts
export type LearningSessionState =
  | 'preparing' | 'partial_ready' | 'active' | 'paused' | 'completed' | 'failed';

export type LearningSessionEvent =
  | { type: 'first_block_ready' }
  | { type: 'start' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'complete' }
  | { type: 'generation_failed'; hasReadyBlock: boolean };

const allowed: Record<LearningSessionState, LearningSessionEvent['type'][]> = {
  preparing: ['first_block_ready', 'generation_failed'],
  partial_ready: ['start', 'pause', 'generation_failed'],
  active: ['pause', 'complete', 'generation_failed'],
  paused: ['resume'],
  completed: [],
  failed: [],
};
```

Preview must validate 1–20 owned words, preserve source order, return per-word audio eligibility, create `listening_meaning` then `listening_spelling` for each word, calculate `estimatedSeconds = answerItemCount * 35`, and report an explicit unsupported reason when requested mode capability is not enabled.

- [ ] **Step 4: Run the domain tests**

Run: `cd /Users/liulin/Desktop/font/english/nestjs && pnpm test -- orchestration-policy.spec.ts learning-session.machine.spec.ts --runInBand`

Expected: PASS for bounds, selected-mode restriction, order, eligibility, duration, and illegal state rejection.

- [ ] **Step 5: Commit the domain policies**

```bash
cd /Users/liulin/Desktop/font/english/nestjs
git add src/interface/learning-session/domain
git commit -m "feat(learning): add session orchestration policy"
```

### Task 5: Build the Backend Listening Session Vertical Slice

**Files:**
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/dto/preview-learning-session.dto.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/dto/create-learning-session.dto.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/dto/learning-session-command.dto.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/dto/submit-learning-attempt.dto.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/repositories/learning-session.repository.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/repositories/learning-attempt.repository.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/activities/activity-adapter.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/activities/listening.activity.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/services/attempt-finalization.service.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/services/learning-session.service.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/learning-session.controller.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/learning-session.module.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-mastery/mastery-projection.service.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-mastery/learning-mastery.module.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/app.module.ts`
- Test: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/services/learning-session.service.spec.ts`
- Test: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/services/attempt-finalization.service.spec.ts`

**Interfaces:**
- Produces controllers: `POST /learning-session/capabilities|preview|create|detail|submit|pause|complete`.
- Produces `finalizeDeterministicAttempt(command, transaction?): Promise<SubmitLearningAttemptResultV1>`.
- Consumes `attemptUid`, `sessionVersion`, and `LearningAnswerV1`; never accepts a client `userId` or correct answer.

- [ ] **Step 1: Write failing service tests for ownership, idempotency and atomic finalization**

```ts
it('returns the original result for the same attemptUid and payload', async () => {
  const first = await service.submit(41, command);
  const retry = await service.submit(41, command);
  expect(retry).toEqual(first);
  expect(evidenceRepository.append).toHaveBeenCalledTimes(2); // listening + spelling
});

it('rejects an item owned by another user', async () => {
  await expect(service.submit(42, command)).rejects.toMatchObject({
    errorCode: 'LEARNING_RESOURCE_UNAVAILABLE',
  });
});
```

- [ ] **Step 2: Run the service tests and confirm failure**

Run: `cd /Users/liulin/Desktop/font/english/nestjs && pnpm test -- learning-session.service.spec.ts attempt-finalization.service.spec.ts --runInBand`

Expected: FAIL because services and repositories are missing.

- [ ] **Step 3: Implement the transaction and API response shape**

```ts
export interface SubmitLearningAttemptCommandV1 {
  sessionId: number;
  itemId: number;
  sessionVersion: number;
  attemptUid: string;
  answer:
    | { kind: 'choice'; selectedValue: string }
    | { kind: 'spelling'; text: string }
    | { kind: 'skip'; reason: 'dont_know' | 'audio_unavailable' };
  hintCount: number;
  hintTypes: Array<'show_spelling' | 'replay_slow' | 'show_meaning'>;
}

export interface SubmitLearningAttemptResultV1 {
  attemptId: number;
  status: 'final';
  outcome: 'correct' | 'incorrect' | 'skipped';
  dimensionResults: Array<{
    dimension: 'meaning_recognition' | 'listening' | 'spelling';
    outcome: 'correct' | 'incorrect' | 'skipped';
  }>;
  feedback:
    | { kind: 'meaning'; expectedLabel: string; explanation: string }
    | { kind: 'spelling'; expected: string; diff: Array<{ text: string; kind: 'same' | 'missing' | 'extra' }> };
  sessionVersion: number;
  nextItemId?: number;
}
```

Inside one Sequelize transaction: lock the owned session/item, compare request hash for an existing attempt UID, normalize spelling with Unicode NFKC + trim + lowercase, insert final attempt, append item-specific evidence, project mastery, advance cursor/version, and return the stored result. `listening_meaning` writes separate `listening` and `meaning_recognition` evidence; `listening_spelling` writes `spelling` evidence, so a spelling error cannot erase an earlier correct listening-meaning fact. A skipped meaning item writes both of its dimensions as `skipped`; a skipped spelling item writes spelling as `skipped`. The public detail mapper includes only the current item and submitted result summaries.

- [ ] **Step 4: Run service, controller, and build verification**

Run: `cd /Users/liulin/Desktop/font/english/nestjs && pnpm test -- learning-session --runInBand && pnpm build`

Expected: PASS; create is idempotent by `requestUid`, submit is idempotent by `attemptUid`, and unauthorized IDs return the same safe resource error.

- [ ] **Step 5: Commit the backend vertical slice**

```bash
cd /Users/liulin/Desktop/font/english/nestjs
git add src/app.module.ts src/interface/learning-session src/interface/learning-mastery
git commit -m "feat(learning): add listening session API"
```

### Task 6: Add Backend HTTP and Transaction Integration Coverage

**Files:**
- Create: `/Users/liulin/Desktop/font/english/nestjs/test/learning-session.e2e-fixtures.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/test/learning-session.e2e-spec.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/learning-session.controller.spec.ts`

**Interfaces:**
- Consumes the HTTP contracts from Task 5.
- Produces regression coverage for response wrapping, answer stripping, transaction rollback, cross-user denial, stale session version, and duplicate attempt UID.

- [ ] **Step 1: Write failing HTTP scenarios**

```ts
await request(app.getHttpServer())
  .post('/learning-session/detail')
  .set('Cookie', ownerCookie)
  .send({ sessionId })
  .expect(201)
  .expect(({ body }) => {
    expect(body).toMatchObject({ code: 200, message: 'success' });
    expect(JSON.stringify(body.data)).not.toMatch(/answerContract|correctAnswer|inspect/);
  });
```

Add a second request with `otherUserCookie` expecting the stable resource-unavailable error, and submit the same `attemptUid` twice expecting exactly two evidence rows total.

- [ ] **Step 2: Run the e2e file and observe failure**

Run: `cd /Users/liulin/Desktop/font/english/nestjs && pnpm test:e2e -- learning-session.e2e-spec.ts --runInBand`

Expected: FAIL until the fixture and HTTP setup include the new models/module.

- [ ] **Step 3: Implement deterministic fixtures and rollback assertions**

```ts
const listeningWord = {
  englishWord: 'inspect',
  englishChinese: '检查；审视',
  englishPhonetic: '/ɪnˈspekt/',
  audio: { britishUrl: '/audio/inspect-uk.mp3', americanUrl: '/audio/inspect-us.mp3' },
};
```

Seed two users and owned words, authenticate through the existing cookie test setup, force the mastery repository to throw once, and assert attempt/evidence/cursor all roll back. Restore the repository and assert the retry succeeds with the same `attemptUid`.

- [ ] **Step 4: Run backend acceptance gates**

Run: `cd /Users/liulin/Desktop/font/english/nestjs && pnpm test -- learning-session learning-mastery --runInBand && pnpm test:e2e -- learning-session.e2e-spec.ts --runInBand && pnpm build`

Expected: all commands PASS.

- [ ] **Step 5: Commit integration coverage**

```bash
cd /Users/liulin/Desktop/font/english/nestjs
git add test/learning-session.e2e-fixtures.ts test/learning-session.e2e-spec.ts src/interface/learning-session/learning-session.controller.spec.ts
git commit -m "test(learning): cover listening session transactions"
```

### Task 7: Mirror Contracts and Build the Frontend Data Layer

**Files:**
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/contracts/activity-contract.ts`
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/contracts/learning-session.ts`
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/contracts/fixtures/activity-envelope-v1.json`
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/contracts/activity-contract.test.ts`
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/api/learningApi.ts`
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/api/learningApi.test.ts`
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/api/learningKeys.ts`
- Modify: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/types/learning.ts`
- Modify: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/server/learning.ts`

**Interfaces:**
- Produces request descriptors `learningCapabilities`, `previewLearningSession`, `createLearningSession`, `learningSessionDetail`, `submitLearningAttempt`, `pauseLearningSession`, `completeLearningSession`.
- Produces query keys `learningKeys.capabilities()`, `.preview(inputHash)`, `.session(sessionId)`, `.mastery(wordId)`.

- [ ] **Step 1: Write failing contract/API descriptor tests**

```ts
expect(submitLearningAttempt(command)).toEqual({
  url: '/learning-session/submit',
  method: 'POST',
  data: command,
  __responseType: undefined,
});

expect(learningKeys.session(17)).toEqual(['learning', 'session', 17]);
```

- [ ] **Step 2: Run frontend contract tests and confirm failure**

Run: `cd /Users/liulin/Desktop/font/english/react-font && pnpm --filter @font/english-world test -- src/page/englishWorld/learning/contracts/activity-contract.test.ts src/page/englishWorld/learning/api/learningApi.test.ts --run`

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement exact mirrored public types and request descriptors**

```ts
export interface LearningSessionSnapshotV1 {
  sessionId: number;
  sessionUid: string;
  status: 'preparing' | 'partial_ready' | 'active' | 'paused' | 'completed' | 'failed';
  sessionVersion: number;
  selectedModes: LearningMode[];
  progress: { completedItems: number; totalItems: number; estimatedRemainingSeconds: number };
  currentBlock?: { blockId: number; mode: LearningMode; order: number; totalBlocks: number };
  currentItem?: ActivityEnvelopeV1 & { itemId: number };
  result?: LearningSessionResultV1;
}

export interface LearningSessionResultV1 {
  completedWords: number;
  elapsedSeconds: number;
  independentCorrect: number;
  hintedCorrect: number;
  needsWork: number;
  pending: number;
  levelChanges: number;
  words: Array<{
    wordId: number;
    word: string;
    originalLevel: 0 | 1 | 2 | 3;
    systemLevel: 0 | 1 | 2 | 3;
    manualLevel: 0 | 1 | 2 | 3 | null;
    nextReviewAt: string;
    recommendedMode: LearningMode;
  }>;
}
```

Use `YTRequest<T>` with project `request()`; keep compatibility exports in the old `types/learning.ts` and `server/learning.ts` so existing imports do not break during migration.

- [ ] **Step 4: Run frontend type and unit checks**

Run: `cd /Users/liulin/Desktop/font/english/react-font && pnpm --filter @font/english-world test -- src/page/englishWorld/learning --run && pnpm --filter @font/english-world build`

Expected: PASS; the frontend V1 fixture deep-equals the backend fixture after JSON parsing.

- [ ] **Step 5: Commit the frontend data boundary**

```bash
cd /Users/liulin/Desktop/font/english/react-font
git add apps/english-world/src/page/englishWorld/learning/contracts apps/english-world/src/page/englishWorld/learning/api apps/english-world/src/page/englishWorld/types/learning.ts apps/english-world/src/page/englishWorld/server/learning.ts
git commit -m "feat(english-world): add learning session contracts"
```

### Task 8: Build the Reducer, Draft Recovery, and Listening Activity

**Files:**
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/session/learningSessionReducer.ts`
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/session/learningSessionReducer.test.ts`
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/shared/learningDraftStorage.ts`
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/shared/learningDraftStorage.test.ts`
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/activities/shared/answerDraft.ts`
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/activities/listening/ListeningActivity.tsx`
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/activities/listening/ListeningActivity.test.tsx`

**Interfaces:**
- Produces `learningSessionReducer(state, action)` and `createLearningDraftStore(sessionId, itemUid)`.
- Produces controlled `ListeningActivityProps` with `onDraftChange`, `onRevealHint`, and `onSubmit` intents; the component performs no API request.

- [ ] **Step 1: Write failing reducer and privacy-focused renderer tests**

```tsx
render(<ListeningActivity item={item} draft={{ kind: 'spelling', text: '' }} {...handlers} />);
expect(screen.queryByText('inspect')).not.toBeInTheDocument();
await user.click(screen.getByRole('button', { name: '查看拼写提示' }));
expect(handlers.onRevealHint).toHaveBeenCalledWith('show_spelling');
```

Test that `snapshot_replaced` changes current item and restores the matching draft, `submit_started` rejects a second submit, and `submit_succeeded` clears the stored draft.

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `cd /Users/liulin/Desktop/font/english/react-font && pnpm --filter @font/english-world test -- learningSessionReducer.test.ts learningDraftStorage.test.ts ListeningActivity.test.tsx --run`

Expected: FAIL because reducer, storage, and component do not exist.

- [ ] **Step 3: Implement the discriminated interaction state**

```ts
export type LearningInteractionState =
  | { status: 'editing'; itemUid: string; draft: LearningAnswerDraft; hints: HintType[] }
  | { status: 'submitting'; itemUid: string; draft: LearningAnswerDraft; attemptUid: string }
  | { status: 'feedback'; itemUid: string; result: FinalAttemptResultV1 }
  | { status: 'sync_failed'; itemUid: string; draft: LearningAnswerDraft; attemptUid: string; errorCode: string };

export type LearningSessionAction =
  | { type: 'snapshot_replaced'; snapshot: LearningSessionSnapshotV1 }
  | { type: 'draft_changed'; draft: LearningAnswerDraft }
  | { type: 'hint_revealed'; hint: HintType }
  | { type: 'submit_started'; attemptUid: string }
  | { type: 'submit_succeeded'; result: FinalAttemptResultV1 }
  | { type: 'submit_failed'; errorCode: string };

export type LearningAnswerDraft =
  | { kind: 'choice'; selectedValue: string }
  | { kind: 'spelling'; text: string }
  | { kind: 'output'; text: string }
  | { kind: 'skip'; reason: 'dont_know' | 'audio_unavailable' };

export type HintType = 'show_spelling' | 'replay_slow' | 'show_meaning';
export type FinalAttemptResultV1 = SubmitLearningAttemptResultV1 & { status: 'final' };
```

Store JSON under `english-world.learning-draft.v1.<sessionId>.<itemUid>`, ignore malformed/schema-mismatched content, and remove it only after the server accepts the attempt. Meaning items render opaque radio choices before spelling items; Enter submits single-line spelling, and audio controls have accessible names and expose playback state. “暂时不会” emits `{ kind: 'skip', reason: 'dont_know' }`. Audio load failure keeps the draft, offers retry and the other accent; after both fail it emits `audio_unavailable`, which becomes skipped evidence and lets orchestration use another selected eligible mode when one exists.

- [ ] **Step 4: Run the unit suite**

Run: `cd /Users/liulin/Desktop/font/english/react-font && pnpm --filter @font/english-world test -- learningSessionReducer.test.ts learningDraftStorage.test.ts ListeningActivity.test.tsx --run`

Expected: PASS for answer privacy, hint evidence, double-submit guard, storage recovery, Enter submit, replay/0.8×/accent controls, explicit “暂时不会”, and two-accent audio failure recovery.

- [ ] **Step 5: Commit interaction primitives**

```bash
cd /Users/liulin/Desktop/font/english/react-font
git add apps/english-world/src/page/englishWorld/learning/session/learningSessionReducer* apps/english-world/src/page/englishWorld/learning/shared/learningDraftStorage* apps/english-world/src/page/englishWorld/learning/activities
git commit -m "feat(english-world): add listening learning activity"
```

### Task 9: Connect Setup, Session, Result, and Routes

**Files:**
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/setup/LearningSetupDrawer.tsx`
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/setup/LearningSetupDrawer.test.tsx`
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/setup/LearningModePicker.tsx`
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/setup/LearningPreviewPanel.tsx`
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/session/MixedLearningSessionPage.tsx`
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/session/LearningSessionShell.tsx`
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/session/LearningResultView.tsx`
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/session/activityRegistry.tsx`
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/session/useLearningSession.ts`
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/session/MixedLearningSessionPage.test.tsx`
- Modify: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/EnglishWorld.tsx`
- Modify: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/router/router.tsx`

**Interfaces:**
- Consumes Task 7 API descriptors and Task 8 controlled activity.
- Produces desktop route `/englishWorld/learn/session/:sessionId` and a word-list entry that passes selected IDs or the explicit current-filter result into the Drawer.

- [ ] **Step 1: Write failing setup and session integration tests**

```tsx
expect(screen.getByRole('button', { name: '开始记忆' })).toBeEnabled();
await user.click(screen.getByRole('button', { name: '开始记忆' }));
expect(screen.getByRole('dialog', { name: '开始混合记忆' })).toBeVisible();
expect(screen.getByRole('checkbox', { name: '听音记忆' })).toBeChecked();
```

Mock detail as `active`, submit a spelling answer, return a completed snapshot, and assert the result separates “独立答对”“提示后答对”“仍需加强”.

- [ ] **Step 2: Run UI integration tests and confirm failure**

Run: `cd /Users/liulin/Desktop/font/english/react-font && pnpm --filter @font/english-world test -- LearningSetupDrawer.test.tsx MixedLearningSessionPage.test.tsx EnglishWorld.test.tsx --run`

Expected: FAIL because setup, session route and entry are missing.

- [ ] **Step 3: Implement the page flow with one primary action**

```ts
export const activityRegistry: Record<LearningMode, ActivityRenderer> = {
  listening: ListeningActivity,
  root_family: UnsupportedActivity,
  micro_scene: UnsupportedActivity,
  confusion: UnsupportedActivity,
  output: UnsupportedActivity,
};
```

The Drawer shows actual count, mastery filter, capability status, estimated seconds, explicit unadapted words, and only enables “开始混合记忆” after preview accepts every word or the user explicitly excludes it. Session query uses `learningKeys.session(sessionId)`; successful submit replaces/refetches the authoritative snapshot. Set route max width to `1120px`; correct/error state includes icon + text, not color alone.

- [ ] **Step 4: Run frontend acceptance gates**

Run: `cd /Users/liulin/Desktop/font/english/react-font && pnpm --filter @font/english-world test -- src/page/englishWorld/learning src/page/englishWorld/EnglishWorld.test.tsx --run && pnpm --filter @font/english-world build`

Expected: PASS; unsupported modes are visibly disabled by capability and the listening route can finish a mocked session.

- [ ] **Step 5: Commit the desktop listening flow**

```bash
cd /Users/liulin/Desktop/font/english/react-font
git add apps/english-world/src/page/englishWorld/learning apps/english-world/src/page/englishWorld/EnglishWorld.tsx apps/english-world/src/router/router.tsx
git commit -m "feat(english-world): add listening learning flow"
```

### Task 10: Add the Cross-Repository Listening Acceptance Gate

**Files:**
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/cypress/e2e/learning-listening-session.cy.ts`
- Modify: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/cypress/support/e2e.ts`

**Interfaces:**
- Exercises the first production-shaped vertical slice with network fixtures or the configured local backend.
- Verifies selection, explicit preview, hidden spelling, hint tracking, refresh recovery, idempotent submit, result summary, and return to the word list.

- [ ] **Step 1: Write the failing Cypress scenario**

```ts
cy.findByRole('button', { name: '开始记忆' }).click();
cy.findByRole('checkbox', { name: '听音记忆' }).should('be.checked');
cy.findByRole('button', { name: '开始混合记忆' }).click();
cy.location('pathname').should('match', /\/englishWorld\/learn\/session\/\d+$/);
cy.contains('inspect').should('not.exist');
cy.findByRole('button', { name: '播放英音' }).click();
cy.findByRole('radio', { name: '检查；审视' }).click();
cy.findByRole('button', { name: '提交答案' }).click();
cy.findByRole('button', { name: '继续听写' }).click();
cy.findByLabelText('听写英文').type('inspect{enter}');
cy.contains('独立答对').should('be.visible');
```

- [ ] **Step 2: Run the Cypress spec and confirm initial failure**

Run: `cd /Users/liulin/Desktop/font/english/react-font/apps/english-world && pnpm e2e -- --spec cypress/e2e/learning-listening-session.cy.ts`

Expected: FAIL at the first missing/stubbed acceptance behavior.

- [ ] **Step 3: Complete deterministic network fixtures and refresh assertion**

Intercept capabilities, preview, create, detail, submit, pause and complete. Record the submitted `attemptUid`; simulate a dropped submit response, click retry, and assert the second request reuses that UID. Reload mid-item and return the same server cursor plus local draft.

- [ ] **Step 4: Run the full phase gate**

Run backend: `cd /Users/liulin/Desktop/font/english/nestjs && pnpm test -- learning-session learning-mastery --runInBand && pnpm build`

Run frontend: `cd /Users/liulin/Desktop/font/english/react-font && pnpm --filter @font/english-world test -- src/page/englishWorld/learning --run && pnpm --filter @font/english-world build && git diff --check`

Run E2E: `cd /Users/liulin/Desktop/font/english/react-font/apps/english-world && pnpm e2e -- --spec cypress/e2e/learning-listening-session.cy.ts`

Expected: all commands PASS; both repositories show only intended phase files plus the protected backend user file.

- [ ] **Step 5: Commit the listening acceptance test**

```bash
cd /Users/liulin/Desktop/font/english/react-font
git add apps/english-world/cypress/e2e/learning-listening-session.cy.ts apps/english-world/cypress/support/e2e.ts
git commit -m "test(english-world): cover listening learning journey"
```

## Phase Exit Criteria

- Backend capability exposes only `listening` as enabled; unavailable modes remain visible but cannot be silently selected.
- A 1–20 word listening session survives refresh and duplicate network submissions.
- Meaning and spelling are separate items: the former writes listening + meaning evidence, the latter writes spelling evidence, and both update a reconstructable mastery profile.
- No public response, fixture, log assertion, or frontend contract contains `answerContract` or `correctAnswer`.
- The result page reports independent, hinted, weak and next-review facts from the server snapshot.
- Backend and frontend builds, focused tests, transaction E2E and Cypress listening journey all pass.
