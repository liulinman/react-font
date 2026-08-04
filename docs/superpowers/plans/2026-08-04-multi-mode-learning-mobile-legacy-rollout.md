# Multi-Mode Learning Mobile, Legacy Integration, and Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成手动掌握调整、移动端五模式流程、旧学习入口的统一证据适配、Memory Map/Daily Coach 渐进读取和可安全开关的发布闭环。

**Architecture:** `word_mastery_profile` 是新系统读模型，`english.english_level` 在迁移期只同步 display level。移动端复用 API、contract、reducer 和 view model，但采用独立单列页面；旧 Recite/Context Lab 只为上线后的新提交追加真实 evidence，不批量伪造历史。

**Tech Stack:** 继承前三阶段；移动 UI 使用 Ant Design Mobile 5.37，既有桌面使用 Ant Design 5.27；测试使用 Vitest/Cypress 与后端 Jest。

## Global Constraints

- 本计划以前三个计划的退出条件全部通过为起点。
- 手动等级与 `systemLevel` 分开，保存手动等级不得 update/delete 历史 evidence。
- 旧 `englishLevel` 仅作为 `legacy_baseline` 初始显示值；不能生成伪历史 evidence，也不能标成用户手动设置。
- 新系统第一次明确调整后才写 `manualLevel`；显示等级优先 manual，缺失时使用 system。
- 旧 Recite/Context Lab 只适配功能发布后的新 final 提交；原有历史展示与结果 DTO 保持兼容。
- Memory Map/Daily Coach 读取新 profile 失败时必须降级到现有数据源。
- 移动端独立单列，一屏一个主要任务，固定底部主操作不遮挡内容，触控目标至少 44px。
- 移动端刷新、切后台和重新进入后恢复 server cursor 与未提交草稿。
- 后端 feature flag 是能力开关事实；关闭只阻止新 preview/create，不阻止进行中 session 完成。
- 产品分析不能保存用户答案、短文、解释或 AI revision 正文。
- 后端现有用户未跟踪计划文件保持未暂存。

---

### Task 1: Implement Manual Mastery Override and Legacy Baseline Semantics

**Files:**
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-mastery/dto/learning-mastery.dto.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-mastery/legacy-mastery.adapter.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-mastery/learning-mastery.controller.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-mastery/learning-mastery.controller.spec.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-mastery/mastery-projection.service.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-mastery/learning-mastery.module.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/memory-map/memory-map.service.ts`
- Test: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-mastery/mastery-projection.service.spec.ts`

**Interfaces:**
- Produces `POST /learning-mastery/word-detail` and `/learning-mastery/override`.
- Produces `ensureLegacyBaseline(userId, wordId, transaction?): Promise<WordMasteryProfile>`.
- Override command: `{ wordId: number; manualLevel: 0|1|2|3|null; requestUid: string }`; each accepted command inserts one `learning_mastery_override` audit row.

- [ ] **Step 1: Write failing baseline, override and ownership tests**

```ts
it('creates a baseline profile without evidence or manual source', async () => {
  const profile = await adapter.ensureLegacyBaseline(userId, wordId);
  expect(profile).toMatchObject({ systemLevel: 1, manualLevel: null, baselineSource: 'legacy_baseline' });
  expect(evidenceRepository.append).not.toHaveBeenCalled();
});

it('keeps system level and evidence after a manual override', async () => {
  await service.override(userId, { wordId, manualLevel: 3, requestUid: 'override-1' });
  expect(await profileRepository.findOwned(userId, wordId)).toMatchObject({ systemLevel: 1, manualLevel: 3 });
  expect(await evidenceRepository.countOwned(userId, wordId)).toBe(existingEvidenceCount);
});
```

- [ ] **Step 2: Run mastery tests and confirm failure**

Run: `cd /Users/liulin/Desktop/font/english/nestjs && pnpm test -- learning-mastery.controller.spec.ts mastery-projection.service.spec.ts --runInBand`

Expected: FAIL because controller and legacy adapter are absent.

- [ ] **Step 3: Implement transactional display-level compatibility**

```ts
export interface LearningMasteryWordDetailV1 {
  wordId: number;
  systemLevel: 0 | 1 | 2 | 3;
  manualLevel: 0 | 1 | 2 | 3 | null;
  displayLevel: 0 | 1 | 2 | 3;
  source: 'system' | 'user_override' | 'legacy_baseline';
  nextReviewAt?: string;
  recommendedMode?: LearningMode;
  recentEvidence: LearningEvidenceSummaryV1[];
}
```

Lock the owned word/profile. If absent, copy `englishLevel ?? 0` into `systemLevel`, set `manualLevel = null`, `baselineSource = 'legacy_baseline'`, and create no evidence. Override idempotency uses the unique `(user_id, override_uid)` audit row: same request hash returns its stored result; a different hash returns conflict. Lowering a display level sets `nextReviewAt` to the earlier of its existing value and `now + 1 day`; raising it sets `nextReviewAt` to `now + [1, 3, 7, 14][manualLevel] days`, preserving a future verification; clearing override keeps the policy-derived schedule. Insert the audit row, update profile, and sync `english.english_level = manualLevel ?? systemLevel` in the same transaction. Detail returns at most 20 recent final evidence summaries without raw answers.

- [ ] **Step 4: Run mastery, Memory Map compatibility and build checks**

Run: `cd /Users/liulin/Desktop/font/english/nestjs && pnpm test -- learning-mastery memory-map.service.spec.ts --runInBand && pnpm build`

Expected: PASS for baseline, set/clear override, idempotency, ownership, evidence preservation and old field synchronization.

- [ ] **Step 5: Commit mastery override backend**

```bash
cd /Users/liulin/Desktop/font/english/nestjs
git add src/interface/learning-mastery src/interface/memory-map/memory-map.service.ts
git commit -m "feat(learning): add manual mastery overrides"
```

### Task 2: Add Mastery Evidence and Override UI to Results and Word List

**Files:**
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/mastery/MasteryOverrideDrawer.tsx`
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/mastery/MasteryOverrideDrawer.test.tsx`
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/mastery/masteryViewModel.ts`
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/mastery/masteryViewModel.test.ts`
- Modify: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/api/learningApi.ts`
- Modify: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/learning/session/LearningResultView.tsx`
- Modify: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/EnglishWorld.tsx`

**Interfaces:**
- Adds descriptors `learningMasteryWordDetail` and `overrideLearningMastery`.
- Produces label `{ levelText, sourceText, evidenceLines, nextReviewText }`; source is always visible when user override exists.

- [ ] **Step 1: Write failing drawer and source-label tests**

```tsx
expect(screen.getByText('系统建议：一般')).toBeVisible();
expect(screen.getByText('用户设置：精通')).toBeVisible();
expect(screen.getByText('手动设置不会删除学习证据')).toBeVisible();
await user.click(screen.getByRole('radio', { name: '熟练' }));
await user.click(screen.getByRole('button', { name: '保存用户判断' }));
expect(overrideLearningMastery).toHaveBeenCalledWith(expect.objectContaining({ manualLevel: 2 }));
```

- [ ] **Step 2: Run mastery UI tests and confirm failure**

Run: `cd /Users/liulin/Desktop/font/english/react-font && pnpm --filter @font/english-world test -- MasteryOverrideDrawer.test.tsx masteryViewModel.test.ts --run`

Expected: FAIL because drawer and view model do not exist.

- [ ] **Step 3: Implement four-level meanings and evidence compression**

Display exact meanings: `不会—无法稳定识别或回忆`, `一般—理解但回忆/拼写/听辨仍波动`, `熟练—不同语境和日期稳定回忆`, `精通—跨时间并能听音或输出正确使用`. Show recent evidence as mode + outcome + independent/hinted + date, never raw answer. Saving creates a fresh UUID request UID, invalidates mastery/session/word-list queries, and returns focus to the triggering level control.

```ts
export interface MasteryBadgeViewModel {
  level: 0 | 1 | 2 | 3;
  levelText: '不会' | '一般' | '熟练' | '精通';
  sourceText?: '用户设置';
  ariaLabel: string;
}
```

- [ ] **Step 4: Run mastery UI, word-list and build checks**

Run: `cd /Users/liulin/Desktop/font/english/react-font && pnpm --filter @font/english-world test -- MasteryOverrideDrawer.test.tsx masteryViewModel.test.ts EnglishWorld.test.tsx LearningResultView.test.tsx --run && pnpm --filter @font/english-world build`

Expected: PASS for original/system/manual display, clear override, evidence preservation copy, focus recovery and user-source badge.

- [ ] **Step 5: Commit mastery UI**

```bash
cd /Users/liulin/Desktop/font/english/react-font
git add apps/english-world/src/page/englishWorld/learning/mastery apps/english-world/src/page/englishWorld/learning/api/learningApi.ts apps/english-world/src/page/englishWorld/learning/session/LearningResultView.tsx apps/english-world/src/page/englishWorld/EnglishWorld.tsx
git commit -m "feat(english-world): add mastery override experience"
```

### Task 3: Build the Mobile Setup and Session Shell

**Files:**
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorldMobile/learning/MobileLearningSetupSheet.tsx`
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorldMobile/learning/MobileLearningSessionPage.tsx`
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorldMobile/learning/MobileLearningSessionPage.test.tsx`
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorldMobile/learning/MobileLearningActionBar.tsx`
- Modify: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.tsx`
- Modify: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/router/router.tsx`

**Interfaces:**
- Produces route `/englishWorldMobile/learn/session/:sessionId`.
- Reuses desktop `learningApi`, contract, query keys, reducer, draft store and mastery view model; does not import desktop page shells.

- [ ] **Step 1: Write failing mobile setup, route and safe-area tests**

```tsx
expect(screen.getByRole('button', { name: '开始记忆' })).toBeVisible();
await user.click(screen.getByRole('button', { name: '开始记忆' }));
expect(screen.getByRole('dialog', { name: '选择记忆方式' })).toBeVisible();
expect(screen.getByTestId('mobile-learning-action-bar')).toHaveStyle({
  paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
});
```

- [ ] **Step 2: Run mobile shell tests and confirm failure**

Run: `cd /Users/liulin/Desktop/font/english/react-font && pnpm --filter @font/english-world test -- MobileLearningSessionPage.test.tsx EnglishWorldMobile.test.tsx --run`

Expected: FAIL because mobile setup/session route is missing.

- [ ] **Step 3: Implement independent single-column navigation**

The setup sheet uses a vertical multi-select list and the same explicit adaptation decisions. The session page shows a compact header, stage tabs (`理解`, `主动回忆`, `验证`), one scroll region and fixed bottom action. Disabled future stages expose `aria-disabled`; the current stage receives focus after item changes. Every interactive target sets minimum height/width `44px`; content padding-bottom equals action-bar height + safe area.

```ts
export const mobileLearningRoute = '/englishWorldMobile/learn/session/:sessionId';
export type MobileLearningStage = 'understand' | 'recall' | 'verify';
```

- [ ] **Step 4: Run mobile, shared reducer and build checks**

Run: `cd /Users/liulin/Desktop/font/english/react-font && pnpm --filter @font/english-world test -- src/page/englishWorldMobile src/page/englishWorld/learning/session/learningSessionReducer.test.ts --run && pnpm --filter @font/english-world build`

Expected: PASS for selection, route, stage gating, 44px targets, safe area, focus and server/draft recovery.

- [ ] **Step 5: Commit mobile shell**

```bash
cd /Users/liulin/Desktop/font/english/react-font
git add apps/english-world/src/page/englishWorldMobile/learning apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.tsx apps/english-world/src/router/router.tsx
git commit -m "feat(english-world): add mobile learning shell"
```

### Task 4: Render All Five Modes in Mobile Stage Layouts

**Files:**
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorldMobile/learning/MobileActivityStage.tsx`
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorldMobile/learning/MobileActivityStage.test.tsx`
- Modify: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorldMobile/learning/MobileLearningSessionPage.tsx`

**Interfaces:**
- Consumes all V1 public item unions and emits the shared `LearningAnswerDraft`, hint and submit intents.
- Uses single-column compositions; no desktop `LearningSessionShell`, `LearningBlockRail` or two-column container is imported.

- [ ] **Step 1: Write one failing mobile interaction case per mode**

```tsx
it.each([
  ['root_family', rootItem, '查看构词联想'],
  ['micro_scene', sceneItem, '阅读小短文'],
  ['confusion', confusionItem, '比较易混词'],
  ['listening', listeningItem, '播放英音'],
  ['output', outputItem, '写下你的表达'],
])('renders %s as one mobile task', (_mode, item, accessibleName) => {
  render(<MobileActivityStage item={item} {...handlers} />);
  expect(screen.getByLabelText(accessibleName)).toBeVisible();
});
```

- [ ] **Step 2: Run mobile activity tests and confirm failure**

Run: `cd /Users/liulin/Desktop/font/english/react-font && pnpm --filter @font/english-world test -- MobileActivityStage.test.tsx --run`

Expected: FAIL because the mobile registry is missing.

- [ ] **Step 3: Implement mode-specific mobile composition rules**

Root: decomposition then family list then spelling on separate stages. Scene: article then target gloss sheet then recall/verify. Confusion: vertically stacked word sections and sticky choice action. Listening: hidden spelling, large playback controls and single answer input. Output: situation then textarea; normal Enter creates newline and explicit button submits. All modes use shared draft/result types and keep one primary action.

```ts
const mobileRegistry: Record<LearningMode, MobileActivityRenderer> = {
  root_family: MobileRootFamilyStage,
  micro_scene: MobileMicroSceneStage,
  confusion: MobileConfusionStage,
  listening: MobileListeningStage,
  output: MobileOutputStage,
};
```

- [ ] **Step 4: Run mobile component, accessibility and build checks**

Run: `cd /Users/liulin/Desktop/font/english/react-font && pnpm --filter @font/english-world test -- MobileActivityStage.test.tsx MobileLearningSessionPage.test.tsx --run && pnpm --filter @font/english-world build`

Expected: PASS for five modes, stage focus, no hidden spelling leak, output multiline behavior, fixed action and no desktop shell imports.

- [ ] **Step 5: Commit mobile activities**

```bash
cd /Users/liulin/Desktop/font/english/react-font
git add apps/english-world/src/page/englishWorldMobile/learning
git commit -m "feat(english-world): render five modes on mobile"
```

### Task 5: Adapt New Recite and Context Lab Submissions into Unified Evidence

**Files:**
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-mastery/legacy-evidence.adapter.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-mastery/legacy-evidence.adapter.spec.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/recite/recite.service.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/recite/recite.service.spec.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/context-lab/context-lab.service.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/context-lab/context-lab.service.spec.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-mastery/learning-mastery.module.ts`

**Interfaces:**
- Produces `appendLegacyFinalEvidence(command, transaction): Promise<void>`.
- Event UIDs are deterministic: `recite:<historyId>:<wordId>:v1` and `context:<attemptId>:<wordId>:v1`.

- [ ] **Step 1: Write failing new-submit and no-backfill tests**

```ts
it('adapts a new recite history once', async () => {
  await adapter.appendReciteFinal(reciteRow, transaction);
  await adapter.appendReciteFinal(reciteRow, transaction);
  expect(await evidenceCount('recite:91:7:v1')).toBe(1);
});

it('does not scan old rows when the feature is enabled', async () => {
  await adapter.enable();
  expect(models.reciteHistory.findAll).not.toHaveBeenCalled();
  expect(models.articleExerciseAttempt.findAll).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run legacy adapter tests and confirm failure**

Run: `cd /Users/liulin/Desktop/font/english/nestjs && pnpm test -- legacy-evidence.adapter.spec.ts recite.service.spec.ts context-lab.service.spec.ts --runInBand`

Expected: FAIL because the adapter is missing.

- [ ] **Step 3: Implement only final, post-release evidence mapping**

```ts
export interface LegacyFinalEvidenceCommand {
  source: 'recite' | 'context_lab';
  sourceAttemptId: number;
  userId: number;
  wordId: number;
  outcome: 'correct' | 'incorrect' | 'skipped';
  isIndependent: boolean;
  dimensions: MasteryDimension[];
  occurredAt: Date;
}
```

Map Recite spelling/meaning facts only when its existing transaction creates a final history row. Map Context Lab only for target words whose final attempt result contains a validated per-word fact; a whole-article score cannot be spread across every word. Append and project in the existing transaction; an adapter failure rolls back the new source submission rather than leaving two facts inconsistent. Guard all writes with the backend capability flag and deterministic event UID.

- [ ] **Step 4: Run legacy source and full mastery tests**

Run: `cd /Users/liulin/Desktop/font/english/nestjs && pnpm test -- legacy-evidence.adapter.spec.ts recite.service.spec.ts context-lab.service.spec.ts learning-mastery --runInBand && pnpm build`

Expected: PASS for exactly once, accurate dimensions, no broad article inference, flag-off behavior and no history scanning.

- [ ] **Step 5: Commit legacy submission adapters**

```bash
cd /Users/liulin/Desktop/font/english/nestjs
git add src/interface/learning-mastery/legacy-evidence.adapter* src/interface/learning-mastery/learning-mastery.module.ts src/interface/recite/recite.service* src/interface/context-lab/context-lab.service*
git commit -m "feat(learning): adapt new legacy learning evidence"
```

### Task 6: Switch Memory Map and Daily Coach to Profile-First Reads with Fallback

**Files:**
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/memory-map/memory-map-evidence.service.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/memory-map/memory-map-evidence.service.spec.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/memory-map/memory-map.service.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/memory-map/memory-map.service.spec.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/daily-coach/daily-coach.service.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/daily-coach/daily-coach.service.spec.ts`

**Interfaces:**
- Reads `word_mastery_profile` in one batch for requested user/word IDs.
- Falls back per word to existing `englishLevel`/Recite/Context derivation when a profile is absent or profile-read capability is disabled.

- [ ] **Step 1: Write failing mixed-source and fallback tests**

```ts
it('uses a new profile for one word and legacy derivation for another', async () => {
  const result = await service.buildOverview(userId);
  expect(result.words.find((word) => word.id === 7)?.levelSource).toBe('mastery_profile');
  expect(result.words.find((word) => word.id === 8)?.levelSource).toBe('legacy');
});

it('falls back when profile batch read fails', async () => {
  profileRepository.findAllOwned.mockRejectedValue(new Error('db read failed'));
  await expect(service.buildOverview(userId)).resolves.toMatchObject({ degraded: true });
});
```

- [ ] **Step 2: Run consumer tests and confirm failure**

Run: `cd /Users/liulin/Desktop/font/english/nestjs && pnpm test -- memory-map daily-coach --runInBand`

Expected: FAIL until profile-first merging is implemented.

- [ ] **Step 3: Implement batched merge and observable degradation**

Fetch all profiles with one `(user_id, word_id IN (...))` query. For each word choose `manualLevel ?? systemLevel` and new next-review/mode when present; preserve current legacy derivation when absent. On profile read error, log only user/request IDs and code `LEARNING_PROFILE_READ_DEGRADED`, set a safe degraded marker for diagnostics, and return existing output DTO fields unchanged plus optional new fields.

```ts
export interface LearningProfileReadV1 {
  wordId: number;
  displayLevel: 0 | 1 | 2 | 3;
  systemLevel: 0 | 1 | 2 | 3;
  nextReviewAt?: Date;
  recommendedMode?: LearningMode;
}
```

- [ ] **Step 4: Run consumers, query-count and build checks**

Run: `cd /Users/liulin/Desktop/font/english/nestjs && pnpm test -- memory-map daily-coach --runInBand && pnpm build`

Expected: PASS; the profile query runs once, old DTO fields remain compatible, and failure returns legacy results rather than a 500.

- [ ] **Step 5: Commit consumer migration**

```bash
cd /Users/liulin/Desktop/font/english/nestjs
git add src/interface/memory-map src/interface/daily-coach
git commit -m "feat(learning): read mastery profiles in coach views"
```

### Task 7: Add Server Capabilities, Privacy-Safe Analytics, and Rollout Acceptance

**Files:**
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/learning-session.service.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/learning-session/learning-session.controller.spec.ts`
- Modify: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/analytics/learningEvents.ts`
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/analytics/mixedLearningEvents.test.ts`
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/cypress/e2e/learning-mobile-session.cy.ts`
- Create: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/cypress/e2e/learning-feature-flag.cy.ts`

**Interfaces:**
- Capabilities include `{ enabled, allowCreate, enabledModes, legacyEvidenceWrite, profileRead, schemaVersion: 1 }`.
- Analytics allowlist includes only UIDs, counts, mode, status, elapsed seconds, prompt/model/policy versions and stable error codes.

- [ ] **Step 1: Write failing flag and analytics privacy tests**

```ts
expect(sanitizeMixedLearningEvent({
  eventName: 'learning_attempt_submitted',
  sessionUid: 'session-1',
  answerText: 'I inspected the report',
  article: 'private article',
  mode: 'output',
})).toEqual({
  eventName: 'learning_attempt_submitted', sessionUid: 'session-1', mode: 'output',
});
```

Assert flag-off preview/create returns `LEARNING_FEATURE_DISABLED`, while detail/submit for an existing session still succeeds.

- [ ] **Step 2: Run privacy and capability tests and confirm failure**

Run frontend: `cd /Users/liulin/Desktop/font/english/react-font && pnpm --filter @font/english-world test -- mixedLearningEvents.test.ts --run`

Run backend: `cd /Users/liulin/Desktop/font/english/nestjs && pnpm test -- learning-session.controller.spec.ts --runInBand`

Expected: FAIL until field allowlisting and asymmetric flag behavior are implemented.

- [ ] **Step 3: Implement explicit event allowlists and rollout states**

```ts
const ALLOWED_FIELDS = new Set([
  'eventName', 'sessionUid', 'attemptUid', 'jobUid', 'mode', 'status',
  'wordCount', 'itemCount', 'hintCount', 'elapsedSeconds', 'errorCode',
  'schemaVersion', 'promptVersion', 'modelVersion', 'policyVersion',
]);
```

Capabilities are backend-derived. Rollout states are: `disabled` (no new entry), `internal` (configured user IDs), `enabled` (all authenticated users). `allowCreate` controls preview/create only; owned existing sessions remain recoverable. Track Drawer-to-start, completion/pause/recovery, per-mode timing/outcome/hints, cache/generation/partial-ready, pending/finalization and recycle completion without answer/content fields.

- [ ] **Step 4: Run complete release validation**

Run backend: `cd /Users/liulin/Desktop/font/english/nestjs && pnpm test --runInBand && pnpm test:e2e -- learning-session.e2e-spec.ts --runInBand && pnpm build && git diff --check`

Run frontend: `cd /Users/liulin/Desktop/font/english/react-font && pnpm --filter @font/english-world test --run && pnpm --filter @font/english-world build && git diff --check`

Run mobile/flag E2E: `cd /Users/liulin/Desktop/font/english/react-font/apps/english-world && pnpm e2e -- --spec "cypress/e2e/learning-mobile-session.cy.ts,cypress/e2e/learning-feature-flag.cy.ts"`

Expected: all commands PASS; mobile completes all five mode types across fixture sessions, fixed actions remain visible, flag-off hides new entry, and an existing session remains finishable.

- [ ] **Step 5: Commit release controls and acceptance separately**

```bash
cd /Users/liulin/Desktop/font/english/nestjs
git add src/interface/learning-session/learning-session.service.ts src/interface/learning-session/learning-session.controller.spec.ts
git commit -m "feat(learning): add safe capability rollout"

cd /Users/liulin/Desktop/font/english/react-font
git add apps/english-world/src/page/englishWorld/analytics apps/english-world/cypress/e2e/learning-mobile-session.cy.ts apps/english-world/cypress/e2e/learning-feature-flag.cy.ts
git commit -m "test(english-world): verify mobile learning rollout"
```

## Release Order and Rollback

1. Apply additive foundation and knowledge migrations; verify every new table/index and retain existing tables unchanged.
2. Deploy backend with capability `disabled`; run API smoke tests and a worker health check.
3. Deploy frontend; confirm existing word list, Recite, Context Lab, Memory Map and mobile pages remain unchanged while disabled.
4. Set `internal` for test user IDs; complete desktop and mobile journeys, output pending recovery and manual override.
5. Enable `legacyEvidenceWrite`, then `profileRead`; verify counts, idempotency and fallback before enabling all users.
6. Enable new-session creation for all authenticated users.
7. To roll back, set capability `disabled`; keep detail/submit/complete and workers active until existing sessions reach a terminal state. Do not drop tables or delete evidence during operational rollback.

## Phase Exit Criteria

- User overrides display level without changing objective system level or evidence history.
- Desktop word list/results and mobile session show the same server facts with platform-specific layouts.
- New Recite/Context Lab finals append real evidence exactly once; old history remains untouched.
- Memory Map/Daily Coach read new profiles in one batch and reliably fall back.
- Analytics contain no answer/content text, and capabilities permit instant creation shutdown without stranding sessions.
- Full backend tests/build, frontend tests/build, mixed desktop E2E, output recovery E2E, mobile E2E and feature-flag E2E pass.
