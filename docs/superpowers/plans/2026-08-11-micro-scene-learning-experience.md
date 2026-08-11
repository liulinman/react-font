# Micro-Scene Learning Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder micro-scene meaning question with cached AI-generated short stories, contextual recall, and transfer spelling exercises in the existing mixed-learning session.

**Architecture:** Generate and strictly validate one or more versioned micro-scene content groups before the session transaction, persist them in `learning_content`, then create two deterministic activity items per target word. Keep `learning-activities-v3` readable for old sessions and add a new `micro-scene-v4` parser/renderer path for new sessions. The first production slice performs generation during the existing create request, records generation state in `learning_job`, and gives the setup drawer an explicit generating/retry state; a retry with the same request identity reads the completed cache.

**Tech Stack:** NestJS, Sequelize/MySQL, OpenAI-compatible DeepSeek client, React 19, TypeScript discriminated unions, TanStack Query, Vitest/Jest, existing mixed-learning session/evidence pipeline.

**First-slice boundary:** This delivery keeps generation request-bound so the user either enters a fully prepared session or receives a retryable 503. `learning_job` preserves generation state for observability and cache reuse, but a separate asynchronous generation page and background recovery worker are intentionally deferred and must not be claimed as delivered.

## Global Constraints

- Never add an unselected word as a learning target or write mastery evidence for a distractor.
- A one-word scene is 60–90 English words and 4–6 sentences; a natural 2–5 word group is 80–130 English words.
- Each choice question exposes 2–4 choices; correct values and accepted spellings remain private.
- AI generates story material only. Choice construction, grading, hints, evidence, session transitions, and result rollups remain deterministic.
- Generation failure returns a recoverable error and never falls back to the placeholder sentence.
- Existing `micro_scene_choice` sessions remain readable and completable.
- Do not add a vector database, image generation, branching stories, or cross-user content sharing.

---

### Task 1: Strict Generated Content and Private Cache

**Files:**
- Create: `../nestjs/src/interface/learning-session/domain/micro-scene-content.ts`
- Create: `../nestjs/src/interface/learning-session/domain/micro-scene-content.spec.ts`
- Create: `../nestjs/src/interface/learning-session/repositories/micro-scene-content.repository.ts`
- Create: `../nestjs/src/interface/learning-session/services/micro-scene-content.service.ts`
- Create: `../nestjs/src/interface/learning-session/services/micro-scene-content.service.spec.ts`
- Modify: `../nestjs/src/interface/learning-session/learning-session.module.ts`

**Interfaces:**
- Consumes: `createDeepSeekClient()`, `getDeepSeekModel()`, `learning_content`, `learning_job`, and owned facts `{ wordId, word, meaning }`.
- Produces:

```ts
export interface MicroSceneContentV1 {
  contentId: number;
  sceneKey: string;
  title: string;
  theme: 'life' | 'work' | 'travel' | 'study' | 'public_service' | 'news';
  sentences: string[];
  targets: Array<{
    wordId: number;
    word: string;
    meaning: string;
    clozeSentence: string;
    transferSentence: string;
    usageNote: string;
  }>;
}

export type MicroSceneTheme = MicroSceneContentV1['theme'];

export interface MicroSceneWordFactV1 {
  wordId: number;
  word: string;
  meaning: string;
}

export interface ReadyMicroSceneContentInput {
  userId: number;
  cacheKey: string;
  schemaVersion: 'micro-scene-content-v1';
  promptVersion: string;
  modelVersion: string;
  payloadJson: string;
  contentHash: string;
}

export class MicroSceneContentService {
  prepare(userId: number, facts: MicroSceneWordFactV1[]): Promise<MicroSceneContentV1[]>;
}
```

- [ ] **Step 1: Write failing pure validation tests**

Cover a valid one-word story, a valid multi-word story, missing/duplicate word IDs, groups over five, an uncovered target, wrong word counts, a target absent from the story, a cloze without exactly one `___`, copied transfer sentences, undeclared fields, unsafe HTML, and overlong strings.

```ts
const facts = [{ wordId: 7, word: 'suppress', meaning: '压制' }];
const scene = {
  sceneKey: 'office-fire-alarm',
  title: 'A False Alarm',
  theme: 'work',
  sentences: [
    'The office alarm rang while Maya was preparing a report for an important client meeting.',
    'She tried to suppress her worry and calmly asked everyone to leave the room together.',
    'Outside, a safety officer explained that steam from the kitchen had triggered the alarm.',
    'Maya returned to her desk, finished the report, and shared the surprising story with her team.',
  ],
  targets: [{
    wordId: 7,
    word: 'suppress',
    meaning: '压制',
    clozeSentence: 'She tried to ___ her worry and stay calm.',
    transferSentence: 'The coach asked him to ___ his anger during the match.',
    usageNote: 'Often used for controlling a feeling, reaction, or unwanted effect.',
  }],
};
const validPayload = { scenes: [scene] };

expect(() => parseGeneratedMicroScenes(validPayload, facts)).not.toThrow();
expect(() => parseGeneratedMicroScenes({ scenes: [{ ...scene, targets: [] }] }, facts))
  .toThrow(expect.objectContaining({ errorCode: 'LEARNING_CONTENT_GENERATION_FAILED' }));
```

- [ ] **Step 2: Run the domain test and confirm RED**

Run:

```bash
DB_HOST=127.0.0.1 DB_PORT=3306 DB_USER=test DB_PASSWORD=test \
DB_DATABASE=english_world_test DB_LOGGING=false JWT_SECRET=test \
pnpm exec jest src/interface/learning-session/domain/micro-scene-content.spec.ts --runInBand
```

Expected: FAIL because `parseGeneratedMicroScenes` does not exist.

- [ ] **Step 3: Implement the bounded content schema and cache key**

Implement `microSceneCacheKey(userId, facts, promptVersion, modelVersion)` as `micro-scene-v1:<userId>:<sha256>` and validate exact keys, exact target coverage, group size, word/sentence counts, target occurrence, blank structure, and no HTML tags. Normalize whitespace but do not alter target spelling.

```ts
const targetIds = scenes.flatMap((scene) => scene.targets.map((target) => target.wordId));
const expectedIds = [...facts.map((fact) => fact.wordId)].sort((left, right) => left - right);
const actualIds = [...targetIds].sort((left, right) => left - right);
if (actualIds.length !== expectedIds.length || actualIds.some((id, index) => id !== expectedIds[index])) {
  throw learningContentGenerationFailed();
}
if ((facts.length === 1 && wordCount < 60) || wordCount > 130) {
  throw learningContentGenerationFailed();
}
```

- [ ] **Step 4: Add repository cache and job-state methods**

Implement exact methods:

```ts
findReady(cacheKey: string): Promise<{ id: number; payloadJson: string } | null>;
upsertReady(input: ReadyMicroSceneContentInput): Promise<{ id: number }>;
startJob(userId: number, cacheKey: string): Promise<{ id: number; jobUid: string }>;
completeJob(id: number, contentId: number): Promise<void>;
failJob(id: number, errorCode: 'LEARNING_CONTENT_GENERATION_FAILED'): Promise<void>;
```

Persist `contentType='micro_scene_story'`, `schemaVersion='micro-scene-content-v1'`, `qualityStatus='approved'`, prompt/model versions, and a SHA-256 content hash. Job payload contains only cache key and word IDs, not story or answer text.

- [ ] **Step 5: Write the service RED tests**

Verify cache hit does not call AI; cache miss sends one structured request; concurrent identical calls share one in-process promise; invalid AI JSON marks the job failed; a successful response is cached and returned; missing API configuration returns `LEARNING_CONTENT_GENERATION_FAILED`.

```ts
await service.prepare(41, facts);
expect(generate).toHaveBeenCalledTimes(1);
expect(repository.upsertReady).toHaveBeenCalledWith(
  expect.objectContaining({ userId: 41, schemaVersion: 'micro-scene-content-v1' }),
);
```

- [ ] **Step 6: Implement bounded AI generation**

Use one DeepSeek request for all selected micro-scene facts, `temperature: 0.35`, disabled thinking, a maximum token budget derived from at most 20 words, and compact JSON-only instructions. Clean a single optional JSON fence, parse once, then pass through the pure validator. Do not accept partial groups or silently synthesize a template.

- [ ] **Step 7: Run focused tests and commit backend content generation**

Run the two new test files and `pnpm build`, then commit only Task 1 files:

```bash
git commit -m "feat(learning): generate cached micro-scene stories"
```

---

### Task 2: Versioned Micro-Scene Activities and Grading

**Files:**
- Modify: `../nestjs/src/interface/learning-session/contracts/activity-contract.ts`
- Modify: `../nestjs/src/interface/learning-session/contracts/activity-contract.spec.ts`
- Create: `../nestjs/src/interface/learning-session/activities/micro-scene.activity.ts`
- Create: `../nestjs/src/interface/learning-session/activities/micro-scene.activity.spec.ts`
- Modify: `../nestjs/src/interface/learning-session/activities/activity-adapter.ts`
- Modify: `../nestjs/src/interface/learning-session/activities/activity-adapter.registry.ts`
- Modify: `../nestjs/src/interface/learning-session/repositories/learning-session.repository.ts`
- Modify: `../nestjs/src/interface/learning-session/repositories/learning-session.repository.spec.ts`

**Interfaces:**
- Consumes: `MicroSceneContentV1` from Task 1.
- Produces two new item types and a `MicroSceneActivity` adapter:

```ts
type LearningItemTypeV1 =
  | 'listening_meaning'
  | 'listening_spelling'
  | 'root_family_choice'
  | 'micro_scene_choice'
  | 'micro_scene_context_choice'
  | 'micro_scene_transfer_output'
  | 'confusion_choice'
  | 'output_word';

interface MicroSceneContextPublicItemV1 {
  itemType: 'micro_scene_context_choice';
  itemUid: string;
  wordId: number;
  scene: { sceneKey: string; title: string; theme: MicroSceneTheme; sentences: string[] };
  targetWords: Array<{ wordId: number; word: string; meaning: string }>;
  showStoryInitially: boolean;
  clozeSentence: string;
  prompt: string;
  choices: Array<{ value: string; label: string }>;
}

interface MicroSceneTransferPublicItemV1 {
  itemType: 'micro_scene_transfer_output';
  itemUid: string;
  wordId: number;
  sceneTitle: string;
  theme: MicroSceneTheme;
  meaning: string;
  transferSentence: string;
  usageNote: string;
  cue: { firstLetter: string; length: number };
}
```

- [ ] **Step 1: Write contract and adapter RED tests**

Test exact-key parsing, 2–4 choices, opaque correct value, private accepted spelling, legacy `micro_scene_choice` parsing, context grading dimensions `context + meaning_recognition`, transfer dimensions `active_recall + spelling + output`, skip handling, and public payload answer stripping.

- [ ] **Step 2: Run the new adapter tests and confirm RED**

Run:

```bash
pnpm exec jest \
src/interface/learning-session/contracts/activity-contract.spec.ts \
src/interface/learning-session/activities/micro-scene.activity.spec.ts --runInBand
```

Expected: FAIL on missing v4 item types and adapter.

- [ ] **Step 3: Implement `micro-scene-v4` stored envelopes**

Create context choices from the target word plus at most three normalized word distractors. Store only the opaque correct choice in the private answer contract. Store transfer accepted spellings privately and normalize with `normalizeSpelling` during grading.

```ts
createContextEnvelope(scene, target, itemUid, distractors, showStoryInitially)
createTransferEnvelope(scene, target, itemUid)
```

- [ ] **Step 4: Route old and new storage versions explicitly**

Keep `learning-activities-v3` routed to `MultiModeActivity`; route `micro-scene-v4` to `MicroSceneActivity`. Add both new item types to the detail whitelist and expected dimension mapping. Never widen a parser to accept unknown keys.

- [ ] **Step 5: Prove the detail response does not expose contracts**

Add repository fixtures for both new types and assert serialized detail omits `correctValue`, `accepted`, and model raw output while retaining the story and public choices.

- [ ] **Step 6: Run focused backend activity tests and commit**

Run contract, micro-scene activity, registry, and repository specs, then commit:

```bash
git commit -m "feat(learning): add contextual micro-scene activities"
```

---

### Task 3: Session Creation, Group Reuse, and Stable Errors

**Files:**
- Modify: `../nestjs/src/interface/learning-session/domain/orchestration-policy.ts`
- Modify: `../nestjs/src/interface/learning-session/domain/orchestration-policy.spec.ts`
- Modify: `../nestjs/src/interface/learning-session/domain/learning-session.error.ts`
- Modify: `../nestjs/src/interface/learning-session/services/learning-session.service.ts`
- Modify: `../nestjs/src/interface/learning-session/services/learning-session.service.spec.ts`
- Modify: `../nestjs/src/interface/learning-session/repositories/learning-session.repository.ts`
- Modify: `../nestjs/src/interface/learning-session/repositories/learning-session.repository.spec.ts`
- Modify: `../nestjs/src/interface/learning-session/learning-session.module.ts`

**Interfaces:**
- Consumes: `MicroSceneContentService.prepare()` and `MicroSceneActivity`.
- Produces a session whose micro-scene block contains context then transfer items for every selected target, with one shared generated story per natural group.

- [ ] **Step 1: Write orchestration RED tests**

Assert each micro-scene word previews two answer items with types `micro_scene_context_choice` and `micro_scene_transfer_output`, estimates 70 seconds per word, and remains mixed in stable mode order with listening/root/confusion/output blocks.

- [ ] **Step 2: Write service RED tests for generation placement**

Verify `prepare()` runs before the transaction, a cache/generation failure creates no session, generated groups cover exactly the eligible micro-scene words, the first context item per scene has `showStoryInitially=true`, later context items do not, and the same content group is reused by all of its items.

- [ ] **Step 3: Add stable generation error mapping**

Map `LEARNING_CONTENT_GENERATION_FAILED` to HTTP 503 and the safe message `微短文生成失败，请重试`. Preserve `LEARNING_CONTENT_INVALID` for corrupted persisted content rather than upstream generation failure.

- [ ] **Step 4: Integrate generation outside the DB transaction**

Before `createOnce`, re-check an existing request UID, load owned facts, prepare micro scenes only when the mode is selected, then enter the existing transaction. Inside the transaction re-read facts and reject content whose word/meaning fingerprint no longer matches.

- [ ] **Step 5: Build item blueprints with bounded distractors**

Add `findWordDistractors(userId, excludedWordIds)` returning normalized `{ wordId, word, meaning }` rows. Context choices contain only the target plus up to three distractors; transfer items contain no full accepted spelling contract in public data.

- [ ] **Step 6: Run session-focused tests and commit**

Run orchestration, service, activity, attempt finalization, result, and repository specs plus `pnpm build`, then commit:

```bash
git commit -m "feat(learning): create generated micro-scene blocks"
```

---

### Task 4: Reading, Recall, and Transfer UI

**Files:**
- Modify: `apps/english-world/src/page/englishWorld/learning/contracts/activity-contract.ts`
- Modify: `apps/english-world/src/page/englishWorld/learning/contracts/activity-contract.test.ts`
- Modify: `apps/english-world/src/page/englishWorld/learning/activities/micro-scene/MicroSceneActivity.tsx`
- Create: `apps/english-world/src/page/englishWorld/learning/activities/micro-scene/MicroSceneActivity.test.tsx`
- Create: `apps/english-world/src/page/englishWorld/learning/activities/micro-scene/highlightStory.tsx`
- Create: `apps/english-world/src/page/englishWorld/learning/activities/micro-scene/highlightStory.test.tsx`
- Modify: `apps/english-world/src/page/englishWorld/learning/session/activityRegistry.tsx`
- Modify: `apps/english-world/src/page/englishWorld/learning/session/activityRegistry.test.tsx`
- Modify: `apps/english-world/src/page/englishWorld/learning/learning.css`

**Interfaces:**
- Consumes: the v4 public item union from Task 2 and existing `show_meaning` / `show_spelling` hints.
- Produces one renderer that keeps old `micro_scene_choice` readable and renders the new context/transfer experiences.

- [ ] **Step 1: Write renderer RED tests**

Test that the first context item initially shows title, theme, all story sentences, highlighted target buttons, meanings, and “读完了，开始回忆”; the quiz replaces the story with one cloze and 2–4 choices; “查看原文” calls `onRevealHint('show_meaning')`; a non-first context item starts at the quiz; transfer starts with one text input and only reveals cue after `show_spelling`; legacy items still render.

- [ ] **Step 2: Run micro-scene frontend tests and confirm RED**

Run:

```bash
pnpm --filter @font/english-world exec vitest run \
apps/english-world/src/page/englishWorld/learning/activities/micro-scene \
apps/english-world/src/page/englishWorld/learning/session/activityRegistry.test.tsx
```

Expected: FAIL because the v4 union and UI do not exist.

- [ ] **Step 3: Implement safe story highlighting**

Split text nodes against escaped target words and return React nodes; do not use `dangerouslySetInnerHTML`. Target buttons show a glossary panel and call the existing `playBritishPronunciation(word)` utility.

- [ ] **Step 4: Implement the staged activity renderer**

Use local `reading | question` state only for the presentation transition. Keep answer drafts controlled by the existing reducer. “查看原文” reveals the full story and records one unique hint; “收起原文” does not remove that hint. Transfer submission sends `{ kind: 'output', text }` unchanged.

- [ ] **Step 5: Replace the oversized layout**

Set the learning page and activity content to an 880px reading width, add a readable 1.7 line height, compact 2-column choices on desktop and one column on mobile, clear story/quiz cards, and visible keyboard focus. Do not use hard-coded viewport heights.

- [ ] **Step 6: Run focused UI tests and commit**

Run contract, highlight, activity registry, reducer, and mixed session tests plus the frontend build, then commit:

```bash
git commit -m "feat(learning): deliver micro-scene story practice"
```

---

### Task 5: Generation Feedback, Compatibility Gate, and Production Verification

**Files:**
- Modify: `apps/english-world/src/page/englishWorld/learning/contracts/learning-session.ts`
- Modify: `apps/english-world/src/page/englishWorld/learning/setup/LearningSetupDrawer.tsx`
- Modify: `apps/english-world/src/page/englishWorld/learning/setup/LearningSetupDrawer.test.tsx`
- Modify: `apps/english-world/src/page/englishWorld/learning/learning.css`
- Modify if schema parity changes: `../nestjs/src/database/learning-session-schema-parity.spec.ts`

**Interfaces:**
- Consumes: HTTP 503 `LEARNING_CONTENT_GENERATION_FAILED` and the existing create request UID retry behavior.
- Produces explicit generation progress and retry copy without creating a fake session.

- [ ] **Step 1: Write setup drawer RED tests**

When micro-scene is selected and create is pending, assert the drawer shows `正在生成微短文，通常需要 5–15 秒` and disables closing/start duplication. On generation failure, assert it shows `微短文生成失败，请重试` and reuses the same request UID when retrying an unchanged payload.

- [ ] **Step 2: Implement progress and error copy**

Render the generation status only for a pending create containing `micro_scene`; preserve the generic creating state for other modes. Add the new error code to the frontend error union and keep all existing error messages unchanged.

- [ ] **Step 3: Run the complete focused learning gate**

Backend:

```bash
DB_HOST=127.0.0.1 DB_PORT=3306 DB_USER=test DB_PASSWORD=test \
DB_DATABASE=english_world_test DB_LOGGING=false JWT_SECRET=test \
pnpm exec jest src/interface/learning-session --runInBand
pnpm build
```

Frontend:

```bash
pnpm --filter @font/english-world exec vitest run \
apps/english-world/src/page/englishWorld/learning
pnpm --filter @font/english-world build
```

- [ ] **Step 4: Review security and backward compatibility**

Inspect the delivered diff for answer leakage, unbounded AI output, model calls inside transactions, cross-user cache access, target coverage gaps, old v3 parser removal, mixed block cursor errors, duplicate evidence dimensions, and unsafe story rendering. Fix Critical/Warning findings and re-run only the affected focused tests plus builds.

- [ ] **Step 5: Push backend, verify deployment, then push frontend**

Push backend HEAD to `origin/context-lab-learning-loop-mvp`, wait for the backend production workflow to succeed, and verify capabilities/detail endpoints remain compatible. Then push frontend HEAD to `origin/yifeng/docker-compose` and wait for its production workflow.

- [ ] **Step 6: Perform one real production journey**

Using one owned word, create a micro-scene-only session and verify: real 60–90 word story, title/theme, highlighted word and pronunciation, reading-to-recall transition, no more than four choices, hint tracking, transfer spelling, result page, and no placeholder string. Repeat creation with the same selection to confirm the cache path is faster and produces no duplicate request/session for the same request UID.

- [ ] **Step 7: Report delivery evidence**

Report backend/frontend commits, focused test counts, build results, production workflow URLs, the created production session ID, cache verification, and any real residual risk. Do not claim async generation-page recovery beyond the request-bound job behavior delivered by this plan.
