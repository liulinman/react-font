# English World Desktop Word AI Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add user-confirmed lemma and spelling suggestions to the desktop add-word modal, then deploy the compatible backend before the frontend.

**Architecture:** Extend the existing Word Agent response with a validated four-state diagnosis, require the AI to return a controlled word-form type for backend validation, and keep validated results in a v3 Redis namespace. Model response interpretation as pure frontend functions, render a small suggestion component, and integrate it into the existing debounced desktop add flow without changing mobile or save contracts.

**Tech Stack:** NestJS 10, TypeScript, Jest, Redis/ioredis, DeepSeek through the OpenAI client, React 18, Ant Design, Vitest, Testing Library, pnpm, GitHub Actions, Docker Compose.

## Global Constraints

- “原形” means dictionary lemma, not a derivational root: `running → run`, while `happiness` remains `happiness`.
- The API statuses are exactly `exact | inflected | misspelled | uncertain`.
- Use the existing `/word-agent/query`; do not add an endpoint or a second AI request.
- Never replace the entered word without an explicit “使用建议” click.
- “保留原词”, unresolved suggestions, AI uncertainty, and AI failure must not block save.
- Never overwrite phonetic, meaning, part of speech, note, image, reference, or a word type explicitly chosen by the user.
- English phrases remain complete and receive no lemma suggestion.
- Desktop add mode only; edit mode, mobile, bulk import, persistence schema, and notes remain unchanged.
- Deploy backend before frontend. The frontend accepts missing diagnosis fields during rollout but only legacy-auto-completes an exactly matching word.
- Redis keys use `word-agent:v3:` with the existing seven-day default TTL; do not migrate or delete v1/v2 keys.
- The existing `/Users/liulin/Desktop/font/english/nestjs` checkout has unrelated state. At execution time, use `superpowers:using-git-worktrees` to create a clean backend worktree from `origin/context-lab-learning-loop-mvp`; do not modify or include `docs/superpowers/plans/2026-07-28-mvp1-branch-governance.md`.

---

## Production Remediation Addendum (Binding)

The initial backend deployment showed one `running / exact` result while four bounded probes correctly returned `parading → parade`, `outflanked → outflank`, `viaducts → viaduct`, and `overcame → overcome`. Root-cause tracing found that a stochastic same-word model echo was accepted as authoritative and cached under v2. This addendum supersedes Task 1's original v2 cache and same-word normalization instructions.

- The AI raw JSON must include `sourceWord` and `wordFormType` in the existing single Word Agent call.
- `wordFormType` is exactly `base | plural | third_person_singular | past_tense | past_participle | present_participle | gerund | comparative | superlative | possessive | spelling_error | unknown`.
- Prompt examples must include `running → run / present_participle`, `went → go / past_tense`, `insects → insect / plural`, `recieve → receive / spelling_error`, and `happiness → happiness / base`.
- `sourceWord` must equal the normalized request input.
- Approved inflection types require a valid candidate different from the input and normalize to `inflected`.
- `spelling_error` requires a valid candidate different from the input and normalizes to `misspelled`.
- `base` requires the candidate to equal the input and normalizes to `exact`.
- Same-word inflection, changed-word base, source mismatch, unknown type, and every contradictory pair normalize to `uncertain` and are not cached.
- English phrases remain complete `exact` entries and use `base`; Chinese/other input remains `uncertain`.
- Lower the Word Agent sampling temperature from `0.3` to `0.2` to match the existing controlled import path.
- Bump the key prefix to `word-agent:v3:` so the deployed bad `word-agent:v2:running` entry is bypassed without deleting cache data.
- Add normal/batch/stream tests proving contradictory results return `uncertain` and never call `cache.setMany` for that item.
- Re-run full backend verification, deploy v3, and require a production `running → run / inflected / non-empty reason` probe before deploying the frontend.

---

## File Map

### Backend repository: `/Users/liulin/Desktop/font/english/nestjs`

- Modify `src/interface/word-agent/word-agent.types.ts`: own the diagnosis enum, runtime guard, and required response fields.
- Modify `src/interface/word-agent/word-agent.service.ts`: update the AI contract and normalize every AI result against its corresponding input.
- Modify `src/interface/word-agent/word-agent.service.spec.ts`: verify exact, inflected, misspelled, uncertain, derivational, phrase, batch, and stream behavior.
- Modify `src/interface/word-agent/word-agent-cache.service.ts`: move to the v2 namespace and reject cached values without valid diagnosis fields.
- Modify `src/interface/word-agent/word-agent-cache.service.spec.ts`: verify v2 keys, validation, TTL, ordering, and Redis degradation.

### Frontend repository: `/Users/liulin/Desktop/font/english/react-font`

- Modify `apps/english-world/src/server/wordAgent/wordAgent.ts`: expose rollout-compatible optional diagnosis fields.
- Create `apps/english-world/src/page/englishWorld/component/wordCorrection.ts`: own input normalization, response classification, and empty-field patch construction.
- Create `apps/english-world/src/page/englishWorld/component/wordCorrection.test.ts`: unit-test deterministic correction rules.
- Create `apps/english-world/src/page/englishWorld/component/WordCorrectionSuggestion.tsx`: render the compact suggestion and two explicit actions.
- Create `apps/english-world/src/page/englishWorld/component/WordCorrectionSuggestion.test.tsx`: test copy and callbacks independently.
- Modify `apps/english-world/src/page/englishWorld/component/EditAddModal.tsx`: orchestrate debounce, stale-response protection, suggestion state, and form updates.
- Modify `apps/english-world/src/page/englishWorld/component/EditAddModal.test.tsx`: cover the desktop user flow and regressions.

---

### Task 1: Add and validate the backend diagnosis contract

**Files:**

- Modify: `src/interface/word-agent/word-agent.types.ts`
- Modify: `src/interface/word-agent/word-agent.service.ts`
- Modify: `src/interface/word-agent/word-agent.service.spec.ts`
- Modify: `src/interface/word-agent/word-agent-cache.service.ts`
- Modify: `src/interface/word-agent/word-agent-cache.service.spec.ts`

**Interfaces:**

- Consumes: the current DeepSeek JSON response, ordered input arrays, `WordAgentCacheService`, and existing phrase retry protection.
- Produces: `WordAgentInputStatus`, `isWordAgentInputStatus(value)`, and `WordAgentItem.inputStatus/correctionReason` on every normal, batch, stream, and cached result.

- [ ] **Step 1: Add failing service tests for the four-state contract**

Change the AI test double to accept raw model objects rather than already-normalized `WordAgentItem` values:

```ts
function withWordDetails(overrides: Record<string, unknown>) {
  return {
    word: 'test',
    phonetic: '/test/',
    meaning: '测试',
    partOfSpeech: [1],
    examples: [],
    ieltsSource: null,
    ieltsQuestion: null,
    ieltsQuestionZh: null,
    ieltsSentence: null,
    ieltsSentenceZh: null,
    ...overrides,
  };
}

async function* rawCompletionStream(words: Array<Record<string, unknown>>) {
  yield {
    choices: [{ delta: { content: JSON.stringify({ words }) } }],
  };
}

function attachAiRawResponse(
  service: WordAgentService,
  words: Array<Record<string, unknown>>,
) {
  const create = jest
    .fn()
    .mockImplementation(() => Promise.resolve(rawCompletionStream(words)));
  (service as any).client = { chat: { completions: { create } } };
  return create;
}

async function queryRaw(
  input: string,
  raw: Record<string, unknown>,
): Promise<WordAgentItem> {
  const cache = createCacheDouble([null]);
  const service = new WordAgentService(cache as any);
  attachAiRawResponse(service, [withWordDetails(raw)]);
  const result = await service.query([input]);
  return result.words[0];
}
```

Then add these cases:

```ts
it.each([
  {
    input: 'confront',
    raw: { word: 'confront', inputStatus: 'exact', correctionReason: '' },
    expected: { word: 'confront', inputStatus: 'exact', correctionReason: '' },
  },
  {
    input: 'running',
    raw: {
      word: 'run',
      inputStatus: 'inflected',
      correctionReason: '这是 run 的现在分词',
    },
    expected: {
      word: 'run',
      inputStatus: 'inflected',
      correctionReason: '这是 run 的现在分词',
    },
  },
  {
    input: 'recieve',
    raw: {
      word: 'receive',
      inputStatus: 'misspelled',
      correctionReason: 'i 和 e 的顺序错误',
    },
    expected: {
      word: 'receive',
      inputStatus: 'misspelled',
      correctionReason: 'i 和 e 的顺序错误',
    },
  },
])('normalizes $input diagnosis', async ({ input, raw, expected }) => {
  const cache = createCacheDouble([null]);
  const service = new WordAgentService(cache as any);
  attachAiRawResponse(service, [withWordDetails(raw)]);

  await expect(service.query([input])).resolves.toEqual({
    words: [expect.objectContaining(expected)],
  });
});
```

Add focused cases asserting:

```ts
// A valid derived dictionary entry is not reduced to its root-related word.
expect(await queryRaw('happiness', {
  word: 'happiness',
  inputStatus: 'exact',
  correctionReason: '',
})).toMatchObject({ word: 'happiness', inputStatus: 'exact' });

// Missing/unknown statuses and an exact status with a different word are unsafe.
expect(await queryRaw('colour', {
  word: 'color',
  inputStatus: 'surprise',
  correctionReason: 'unknown',
})).toMatchObject({ inputStatus: 'uncertain', correctionReason: '' });
expect(await queryRaw('illustrate', {
  word: 'hello',
  inputStatus: 'exact',
  correctionReason: '',
})).toMatchObject({ inputStatus: 'uncertain', correctionReason: '' });

// Same-word correction labels normalize to exact.
expect(await queryRaw('run', {
  word: 'run',
  inputStatus: 'inflected',
  correctionReason: 'incorrect label',
})).toMatchObject({ inputStatus: 'exact', correctionReason: '' });
```

For `be cited as`, return the same complete phrase and assert `word === "be cited as"`, `inputStatus === "exact"`, and an empty reason. Add a stream test for `went → go` to prove `streamOneWord()` uses the same normalization.

- [ ] **Step 2: Run the focused service suite and verify RED**

```bash
pnpm test -- word-agent.service.spec.ts --runInBand
```

Expected: FAIL because the returned items do not yet contain `inputStatus` or `correctionReason`, and invalid combinations are not normalized.

- [ ] **Step 3: Define the shared backend type and guard**

Add this contract to `word-agent.types.ts` and make both fields required on `WordAgentItem`:

```ts
export const WORD_AGENT_INPUT_STATUSES = [
  'exact',
  'inflected',
  'misspelled',
  'uncertain',
] as const;

export type WordAgentInputStatus =
  (typeof WORD_AGENT_INPUT_STATUSES)[number];

export function isWordAgentInputStatus(
  value: unknown,
): value is WordAgentInputStatus {
  return WORD_AGENT_INPUT_STATUSES.includes(value as WordAgentInputStatus);
}
```

Update all typed test fixtures (`alphaWord`, `betaWord`, `gammaWord`, and `cachedWord`) with:

```ts
inputStatus: 'exact',
correctionReason: '',
```

- [ ] **Step 4: Extend the AI prompt and raw mapper**

Add `inputStatus` and `correctionReason` to the required JSON example in `SYSTEM_PROMPT`. State these exact rules in the prompt:

```text
7. 输入诊断（inputStatus）：只能是 exact、inflected、misspelled、uncertain。
   - exact：标准词典词条；合法派生词仍是 exact。
   - inflected：复数、时态、分词、比较级等屈折形式，word 返回 lemma。
   - misspelled：只有存在单一且高置信的正确拼写时使用，word 返回正确拼写的 lemma。
   - uncertain：无法可靠分类、候选不唯一、中文或其他不适合英文纠错的输入。
8. 纠正理由（correctionReason）：inflected 或 misspelled 时返回简短中文理由；其他状态返回空字符串。
```

Keep the existing constraints for phrases and IELTS data. In `mapToWordAgentItem`, map model fields without trusting them:

```ts
inputStatus: isWordAgentInputStatus(raw?.inputStatus)
  ? raw.inputStatus
  : 'uncertain',
correctionReason:
  typeof raw?.correctionReason === 'string'
    ? raw.correctionReason.trim()
    : '',
```

- [ ] **Step 5: Normalize every model result against its input**

Add a private `normalizeDiagnosis(item, input): WordAgentItem` boundary and call it only after phrase retry has selected its final raw item. Use the same function in `streamOneWord()` before caching.

```ts
private normalizeDiagnosis(
  item: WordAgentItem,
  input: string,
): WordAgentItem {
  const normalizedInput = this.normalizeWhitespace(input);
  const normalizedWord = this.normalizeWhitespace(item.word);
  const sameWord =
    normalizedInput.toLowerCase() === normalizedWord.toLowerCase();

  if (this.isEnglishPhrase(normalizedInput)) {
    return {
      ...item,
      word: normalizedInput,
      inputStatus: 'exact',
      correctionReason: '',
    };
  }

  if (this.isChineseText(normalizedInput)) {
    return { ...item, inputStatus: 'uncertain', correctionReason: '' };
  }

  const validEnglishInput = /^[A-Za-z][A-Za-z'-]*$/.test(normalizedInput);
  if (!validEnglishInput) {
    return { ...item, inputStatus: 'uncertain', correctionReason: '' };
  }

  if (sameWord) {
    if (item.inputStatus === 'uncertain') {
      return { ...item, correctionReason: '' };
    }
    return { ...item, inputStatus: 'exact', correctionReason: '' };
  }

  const validCandidate = /^[A-Za-z][A-Za-z'-]*$/.test(normalizedWord);
  if (
    validCandidate &&
    (item.inputStatus === 'inflected' ||
      item.inputStatus === 'misspelled')
  ) {
    return {
      ...item,
      word: normalizedWord,
      correctionReason:
        item.correctionReason ||
        (item.inputStatus === 'inflected'
          ? `建议使用词典原形 ${normalizedWord}`
          : `建议检查拼写并使用 ${normalizedWord}`),
    };
  }

  return { ...item, inputStatus: 'uncertain', correctionReason: '' };
}
```

Change `queryUncached(words)` to normalize with the matching input after its existing retry loop:

```ts
return {
  words: fixedWords.map((item, index) =>
    this.normalizeDiagnosis(item, words[index] ?? ''),
  ),
};
```

When no phrase retry is needed, perform the same mapping before returning; do not return the raw `first` result. In `streamOneWord`, normalize the directly parsed result unless phrase mismatch delegates to `queryUncached([word])`.

- [ ] **Step 6: Add failing v2 cache tests**

Update expected keys from v1 to v2 and add one valid JSON object without diagnosis fields to the mocked `mget` result. Assert it is a cache miss:

```ts
redis.mget.mockResolvedValue([
  JSON.stringify(cachedWord),
  JSON.stringify({
    word: 'legacy',
    phonetic: '/legacy/',
    meaning: '旧缓存',
    partOfSpeech: [2],
    examples: [],
    ieltsCase: null,
  }),
]);

await expect(service.getMany(['cache', 'legacy'])).resolves.toEqual([
  cachedWord,
  null,
]);
expect(redis.mget).toHaveBeenCalledWith(
  'word-agent:v2:cache',
  'word-agent:v2:legacy',
);
```

- [ ] **Step 7: Run the cache suite and verify RED**

```bash
pnpm test -- word-agent-cache.service.spec.ts --runInBand
```

Expected: FAIL because production still reads `word-agent:v1:` and accepts entries without diagnosis fields.

- [ ] **Step 8: Implement the v2 cache validator**

Set:

```ts
const CACHE_KEY_PREFIX = 'word-agent:v2:';
```

Import `isWordAgentInputStatus` and extend `isWordAgentItem` with:

```ts
isWordAgentInputStatus(item.inputStatus) &&
typeof item.correctionReason === 'string'
```

Do not change TTL handling, Redis readiness checks, error degradation, or key normalization.

- [ ] **Step 9: Run backend tests and build**

```bash
pnpm test -- word-agent.service.spec.ts word-agent-cache.service.spec.ts --runInBand
pnpm build
```

Expected: both suites PASS and NestJS builds successfully.

- [ ] **Step 10: Commit the backend feature**

```bash
git add src/interface/word-agent/word-agent.types.ts \
  src/interface/word-agent/word-agent.service.ts \
  src/interface/word-agent/word-agent.service.spec.ts \
  src/interface/word-agent/word-agent-cache.service.ts \
  src/interface/word-agent/word-agent-cache.service.spec.ts
git diff --cached --check
git commit -m "feat(word-agent): classify input corrections" \
  -m "Co-Authored-By-AI: true"
```

---

### Task 2: Model correction decisions as pure frontend functions

**Files:**

- Modify: `apps/english-world/src/server/wordAgent/wordAgent.ts`
- Create: `apps/english-world/src/page/englishWorld/component/wordCorrection.ts`
- Create: `apps/english-world/src/page/englishWorld/component/wordCorrection.test.ts`

**Interfaces:**

- Consumes: rollout-compatible `WordAgentItem` responses and the current add-form field values.
- Produces: `normalizeWordInput`, `isLikelyEnglishLookupInput`, `getWordType`, `resolveWordAgentResult`, `buildAiCompletionPatch`, `WordAgentResolution`, and `WordCompletionFormValues`.

- [ ] **Step 1: Add optional frontend response fields**

In the API client, add:

```ts
export type WordAgentInputStatus =
  | 'exact'
  | 'inflected'
  | 'misspelled'
  | 'uncertain';

export interface WordAgentItem {
  word: string;
  phonetic: string;
  meaning: string;
  partOfSpeech?: number[];
  examples: ExampleItem[];
  ieltsCase: IeltsCase | null;
  inputStatus?: WordAgentInputStatus;
  correctionReason?: string;
}
```

The properties remain optional only for safe backend-first rollout and rollback.

- [ ] **Step 2: Write failing classification tests**

Create `wordCorrection.test.ts` with table tests for these exact outcomes:

```ts
const makeItem = (overrides: Partial<WordAgentItem>): WordAgentItem => ({
  word: 'confront',
  phonetic: '/kənˈfrʌnt/',
  meaning: '面对；对抗',
  partOfSpeech: [1],
  examples: [],
  ieltsCase: null,
  ...overrides,
});

const exactItem = makeItem({
  inputStatus: 'exact',
  correctionReason: '',
});
const inflectedItem = makeItem({
  word: 'run',
  inputStatus: 'inflected',
  correctionReason: '这是 run 的现在分词',
});
const misspelledItem = makeItem({
  word: 'receive',
  inputStatus: 'misspelled',
  correctionReason: 'i 和 e 的顺序错误',
});
const uncertainItem = makeItem({
  word: 'color',
  inputStatus: 'uncertain',
  correctionReason: '',
});
const legacySameWordItem = makeItem({});
const legacyDifferentWordItem = makeItem({ word: 'hello' });
const exactDifferentWordItem = makeItem({
  word: 'hello',
  inputStatus: 'exact',
  correctionReason: '',
});

expect(resolveWordAgentResult(exactItem, 'confront')).toMatchObject({
  kind: 'auto-complete',
});
expect(resolveWordAgentResult(inflectedItem, 'running')).toMatchObject({
  kind: 'suggestion',
  input: 'running',
  candidate: 'run',
  status: 'inflected',
});
expect(resolveWordAgentResult(misspelledItem, 'recieve')).toMatchObject({
  kind: 'suggestion',
  candidate: 'receive',
  status: 'misspelled',
});
expect(resolveWordAgentResult(uncertainItem, 'colour')).toEqual({
  kind: 'ignore',
});
expect(resolveWordAgentResult(legacySameWordItem, 'confront')).toMatchObject({
  kind: 'auto-complete',
});
expect(resolveWordAgentResult(legacyDifferentWordItem, 'illustrate')).toEqual({
  kind: 'ignore',
});
expect(resolveWordAgentResult(exactDifferentWordItem, 'illustrate')).toEqual({
  kind: 'ignore',
});
```

Also assert a first-letter typo can suggest a candidate, a phrase only auto-completes when the full normalized phrase matches, and invalid candidate text is ignored.

Test patch construction separately:

```ts
const item = makeItem({
  word: 'run',
  phonetic: '/rʌn/',
  meaning: '跑；运行',
  partOfSpeech: [1],
  inputStatus: 'exact',
  correctionReason: '',
});

expect(
  buildAiCompletionPatch(item, 'run', {
    englishWord: 'run',
    englishLevel: 0,
    englishType: 0,
    englishChinese: '手填释义',
    englishPhonetic: '',
    englishPartSpeech: [],
  }, { preserveWordType: false }),
).toEqual({
  englishPhonetic: '/rʌn/',
  englishPartSpeech: [1],
  englishType: 0,
});
```

Add a second assertion with `{ preserveWordType: true }` proving `englishType` is omitted.

- [ ] **Step 3: Run helper tests and verify RED**

```bash
pnpm --filter @font/english-world exec vitest run \
  src/page/englishWorld/component/wordCorrection.test.ts
```

Expected: FAIL because the helper module does not exist.

- [ ] **Step 4: Implement deterministic classification**

Move the existing normalization, word-type, likely-English, and empty-field functions out of `EditAddModal.tsx`. Replace edit-distance relevance with this tagged result:

```ts
export type WordAgentResolution =
  | { kind: 'auto-complete'; item: WordAgentItem }
  | {
      kind: 'suggestion';
      input: string;
      candidate: string;
      status: 'inflected' | 'misspelled';
      reason: string;
      item: WordAgentItem;
    }
  | { kind: 'ignore' };
```

Implement `resolveWordAgentResult(item, lookupWord)` with these ordered checks:

```ts
const input = normalizeWordInput(lookupWord);
const candidate = normalizeWordInput(item.word);
if (!input || !candidate) return { kind: 'ignore' };

const same = input.toLowerCase() === candidate.toLowerCase();
if (item.inputStatus === undefined) {
  return same ? { kind: 'auto-complete', item } : { kind: 'ignore' };
}
if (item.inputStatus === 'exact') {
  return same ? { kind: 'auto-complete', item } : { kind: 'ignore' };
}
if (item.inputStatus === 'uncertain') return { kind: 'ignore' };
if (same || !/^[A-Za-z][A-Za-z'-]*$/.test(candidate)) {
  return { kind: 'ignore' };
}
return {
  kind: 'suggestion',
  input,
  candidate,
  status: item.inputStatus,
  reason: item.correctionReason?.trim() ||
    (item.inputStatus === 'inflected'
      ? `建议使用词典原形 ${candidate}`
      : `建议检查拼写并使用 ${candidate}`),
  item,
};
```

Do not retain `getEditDistance` or `isRelevantAiCompletion`.

- [ ] **Step 5: Implement empty-field patch construction**

Export a `WordCompletionFormValues` interface containing `englishWord`, `englishLevel`, `englishType`, `englishPhonetic`, `englishPartSpeech`, and `englishChinese`. Export:

```ts
export function buildAiCompletionPatch(
  item: WordAgentItem,
  lookupWord: string,
  currentValues: WordCompletionFormValues,
  options: { preserveWordType: boolean },
): Partial<WordCompletionFormValues>
```

Preserve the current empty-field behavior. Only assign `englishType = getWordType(item.word || lookupWord)` when `options.preserveWordType` is false. Never include `englishWord` in this patch.

- [ ] **Step 6: Run helper tests and commit**

```bash
pnpm --filter @font/english-world exec vitest run \
  src/page/englishWorld/component/wordCorrection.test.ts
git add apps/english-world/src/server/wordAgent/wordAgent.ts \
  apps/english-world/src/page/englishWorld/component/wordCorrection.ts \
  apps/english-world/src/page/englishWorld/component/wordCorrection.test.ts
git diff --cached --check
git commit -m "feat(english-world): model AI word corrections" \
  -m "Co-Authored-By-AI: true"
```

Expected: helper tests PASS and the commit contains no modal behavior change.

---

### Task 3: Build the accessible correction suggestion

**Files:**

- Create: `apps/english-world/src/page/englishWorld/component/WordCorrectionSuggestion.tsx`
- Create: `apps/english-world/src/page/englishWorld/component/WordCorrectionSuggestion.test.tsx`

**Interfaces:**

- Consumes: `input`, `candidate`, `status`, `reason`, `onUse`, and `onKeep` from `WordAgentResolution`.
- Produces: a compact Ant Design warning/info strip with buttons named `使用建议` and `保留原词`.

- [ ] **Step 1: Write the failing component tests**

```tsx
it('renders an inflection suggestion and invokes both explicit actions', () => {
  const onUse = vi.fn();
  const onKeep = vi.fn();
  render(
    <WordCorrectionSuggestion
      input="running"
      candidate="run"
      status="inflected"
      reason="这是 run 的现在分词"
      onUse={onUse}
      onKeep={onKeep}
    />,
  );

  expect(screen.getByText(/检测到词形变化/)).toHaveTextContent(
    'running → run',
  );
  expect(screen.getByText('这是 run 的现在分词')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: '使用建议' }));
  fireEvent.click(screen.getByRole('button', { name: '保留原词' }));
  expect(onUse).toHaveBeenCalledTimes(1);
  expect(onKeep).toHaveBeenCalledTimes(1);
});
```

Add a `misspelled` case that asserts the label “可能拼写错误” and `recieve → receive`.

- [ ] **Step 2: Run the component test and verify RED**

```bash
pnpm --filter @font/english-world exec vitest run \
  src/page/englishWorld/component/WordCorrectionSuggestion.test.tsx
```

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the compact suggestion component**

Use Ant Design `Alert`, `Button`, `Space`, and `Typography.Text`. The component must derive only its heading from `status`:

```tsx
const heading =
  status === 'inflected' ? '检测到词形变化' : '可能拼写错误';
```

Render `${input} → ${candidate}` as text, the reason below it, and two small buttons. Use `type="warning"`, `showIcon`, and an action container that wraps on narrow desktop modal widths. Do not call APIs, mutate the form, or keep internal state.

- [ ] **Step 4: Run and commit the suggestion component**

```bash
pnpm --filter @font/english-world exec vitest run \
  src/page/englishWorld/component/WordCorrectionSuggestion.test.tsx
git add apps/english-world/src/page/englishWorld/component/WordCorrectionSuggestion.tsx \
  apps/english-world/src/page/englishWorld/component/WordCorrectionSuggestion.test.tsx
git diff --cached --check
git commit -m "feat(english-world): add word correction suggestion" \
  -m "Co-Authored-By-AI: true"
```

Expected: both copy variants and callbacks PASS.

---

### Task 4: Integrate correction decisions into the desktop add modal

**Files:**

- Modify: `apps/english-world/src/page/englishWorld/component/EditAddModal.tsx`
- Modify: `apps/english-world/src/page/englishWorld/component/EditAddModal.test.tsx`

**Interfaces:**

- Consumes: `resolveWordAgentResult`, `buildAiCompletionPatch`, `WordAgentResolution`, `WordCorrectionSuggestion`, and the existing `/word-agent/query` request.
- Produces: exact-word auto-completion plus user-confirmed inflection/spelling correction in desktop add mode.

- [ ] **Step 1: Update the existing exact-result fixture**

Add this diagnosis to the default `confront` response so the existing auto-fill test states the new contract explicitly:

```ts
inputStatus: 'exact',
correctionReason: '',
```

Keep the existing consonant-only non-query test. Change the unrelated-result test to return `inputStatus: "exact"` and continue asserting that nothing is filled.

- [ ] **Step 2: Add failing inflection and spelling interaction tests**

For `running`, return `word: "run"`, `inputStatus: "inflected"`, a reason, phonetic, meaning, and `[1]`. Assert after 700ms:

```ts
expect(screen.getByText(/running → run/)).toBeVisible();
expect(screen.getByLabelText('单词名')).toHaveValue('running');
expect(screen.getByLabelText('音标')).toHaveValue('');
expect(screen.getByLabelText('中文')).toHaveValue('');
```

Enter `手填含义` in the Chinese field, click `使用建议`, then assert:

```ts
expect(screen.getByLabelText('单词名')).toHaveValue('run');
expect(screen.getByLabelText('音标')).toHaveValue('/rʌn/');
expect(screen.getByLabelText('中文')).toHaveValue('手填含义');
expect(screen.queryByText(/running → run/)).not.toBeInTheDocument();
expect(requestMock).toHaveBeenCalledTimes(1);
```

Add a `recieve → receive` case asserting “可能拼写错误” before clicking any action.

- [ ] **Step 3: Add failing keep, direct-save, compatibility, and stale-response tests**

Add these user-level assertions:

```ts
// Keep original.
fireEvent.click(screen.getByRole('button', { name: '保留原词' }));
expect(screen.getByLabelText('单词名')).toHaveValue('running');
expect(screen.getByLabelText('音标')).toHaveValue('');
expect(screen.queryByText(/running → run/)).not.toBeInTheDocument();

// In this test, create onOk before render and pass it to EditAddModal.
// Direct save does not apply a pending candidate.
fireEvent.click(screen.getByRole('button', { name: '确认' }));
await waitFor(() =>
  expect(onOk).toHaveBeenCalledWith(
    expect.objectContaining({ englishWord: 'running' }),
    'add',
  ),
);

```

Add a rejected-request case and assert the warning remains non-blocking, no correction strip appears, the entered word stays unchanged, and the confirmation button remains enabled. Add an edit-mode case and assert changing `englishWord` does not call `/word-agent/query`.

Add a parameterized legacy compatibility test that renders a fresh modal for each row:

```ts
it.each([
  { input: 'confront', returnedWord: 'confront', expectedPhonetic: '/legacy/' },
  { input: 'illustrate', returnedWord: 'hello', expectedPhonetic: '' },
])(
  'safely handles a legacy response for $input',
  async ({ input, returnedWord, expectedPhonetic }) => {
    requestMock.mockResolvedValueOnce({
      words: [{
        word: returnedWord,
        phonetic: '/legacy/',
        meaning: '旧响应',
        partOfSpeech: [1],
        examples: [],
        ieltsCase: null,
      }],
    });
    render(
      <EditAddModal
        isModalVisible
        type="add"
        onOk={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    fireEvent.change(screen.getByLabelText('单词名'), {
      target: { value: input },
    });
    await new Promise((resolve) => window.setTimeout(resolve, 700));
    await waitFor(() =>
      expect(screen.getByLabelText('音标')).toHaveValue(expectedPhonetic),
    );
  },
);
```

Use two deferred promises for `running` and `recieve`. Resolve `recieve` first and `running` second; assert only `recieve → receive` remains visible. Add an `uncertain` response test asserting no suggestion and no metadata auto-fill. After the keep-original case, change the input to another word and back to `running`; assert a new query is issued so dismissal is scoped only to the unchanged input.

- [ ] **Step 4: Run modal tests and verify RED**

```bash
pnpm --filter @font/english-world exec vitest run \
  src/page/englishWorld/component/EditAddModal.test.tsx
```

Expected: new suggestion, action, and structured-status tests FAIL while the original exact and input-prefilter tests still PASS.

- [ ] **Step 5: Replace heuristic relevance with structured resolution**

Import the new helper functions and remove the local copies plus `getEditDistance` and `isRelevantAiCompletion`. Define pending state as:

```ts
type PendingWordSuggestion = Extract<
  WordAgentResolution,
  { kind: 'suggestion' }
>;

const [pendingWordSuggestion, setPendingWordSuggestion] =
  useState<PendingWordSuggestion | null>(null);
```

Clear it when the modal resets, closes, changes mode, or the user changes `englishWord`. Increment the existing request ID before every eligibility early return so an old response cannot restore cleared state.

After a current response arrives and the current form word still equals the lookup key:

```ts
const resolution = resolveWordAgentResult(item, lookupWord);
if (resolution.kind === 'suggestion') {
  setPendingWordSuggestion(resolution);
  completedLookupWordRef.current = lookupKey;
  return;
}
if (resolution.kind === 'auto-complete') {
  const currentValues = form.getFieldsValue() as FormValues;
  const patch = buildAiCompletionPatch(
    resolution.item,
    lookupWord,
    currentValues,
    { preserveWordType: form.isFieldTouched('englishType') },
  );
  form.setFieldsValue(patch);
  if (patch.englishPartSpeech?.length) {
    setSelectedPartSpeech(patch.englishPartSpeech);
  }
}
completedLookupWordRef.current = lookupKey;
```

`ignore` must neither show a suggestion nor fill metadata.

- [ ] **Step 6: Implement explicit use and keep handlers**

```ts
const handleUseWordSuggestion = () => {
  if (!pendingWordSuggestion) return;
  const { candidate, item } = pendingWordSuggestion;
  const currentValues = form.getFieldsValue() as FormValues;
  const patch = buildAiCompletionPatch(item, candidate, currentValues, {
    preserveWordType: form.isFieldTouched('englishType'),
  });

  completedLookupWordRef.current = candidate.toLowerCase();
  setAiLookupWord(candidate);
  setPendingWordSuggestion(null);
  form.setFieldsValue({ ...patch, englishWord: candidate });
  if (patch.englishPartSpeech?.length) {
    setSelectedPartSpeech(patch.englishPartSpeech);
  }
};

const handleKeepOriginalWord = () => {
  if (!pendingWordSuggestion) return;
  completedLookupWordRef.current =
    pendingWordSuggestion.input.toLowerCase();
  setPendingWordSuggestion(null);
};
```

When the user manually changes the word, set `completedLookupWordRef.current = null` before updating `aiLookupWord`, so returning to a previously dismissed spelling triggers a fresh decision.

- [ ] **Step 7: Render the suggestion under the word input**

Wrap the left half of the first form row in a `div` with `flex: 1`. Keep the existing `Form.Item` and spinner inside it, then render:

```tsx
{pendingWordSuggestion ? (
  <WordCorrectionSuggestion
    input={pendingWordSuggestion.input}
    candidate={pendingWordSuggestion.candidate}
    status={pendingWordSuggestion.status}
    reason={pendingWordSuggestion.reason}
    onUse={handleUseWordSuggestion}
    onKeep={handleKeepOriginalWord}
  />
) : null}
```

Do not add a validation rule for the suggestion and do not disable the modal confirmation button.

- [ ] **Step 8: Run focused frontend tests and build**

```bash
pnpm --filter @font/english-world exec vitest run \
  src/page/englishWorld/component/wordCorrection.test.ts \
  src/page/englishWorld/component/WordCorrectionSuggestion.test.tsx \
  src/page/englishWorld/component/EditAddModal.test.tsx
pnpm --filter @font/english-world build
```

Expected: all focused tests PASS and the production bundle builds.

- [ ] **Step 9: Commit the modal integration**

```bash
git add apps/english-world/src/page/englishWorld/component/EditAddModal.tsx \
  apps/english-world/src/page/englishWorld/component/EditAddModal.test.tsx
git diff --cached --check
git commit -m "feat(english-world): confirm AI word corrections" \
  -m "Co-Authored-By-AI: true"
```

---

### Task 5: Verify and deploy the backend first

**Files:**

- Verify only; no additional production source changes are planned.

**Interfaces:**

- Consumes: Task 1's backend commit in the isolated worktree.
- Produces: a successful `Verify and deploy backend` run and a production v3 Word Agent response.

- [ ] **Step 1: Run the full backend verification**

```bash
pnpm test --runInBand
pnpm build
git diff --check origin/context-lab-learning-loop-mvp...HEAD
git status --short
```

Expected: all Jest suites PASS, the build succeeds, no whitespace errors exist, and the isolated worktree is clean.

- [ ] **Step 2: Review the backend delta**

Use `superpowers:requesting-code-review` and inspect:

```bash
git diff --stat origin/context-lab-learning-loop-mvp...HEAD
git diff origin/context-lab-learning-loop-mvp...HEAD -- \
  src/interface/word-agent
```

Expected: only the five Word Agent files from Task 1 changed, with no Critical or Important review findings. Fix any finding and repeat Step 1 before continuing.

- [ ] **Step 3: Push only the isolated feature commit to the backend deployment branch**

```bash
git fetch origin context-lab-learning-loop-mvp
git merge-base --is-ancestor origin/context-lab-learning-loop-mvp HEAD
git log --oneline origin/context-lab-learning-loop-mvp..HEAD
git push origin HEAD:context-lab-learning-loop-mvp
```

Expected: the ancestry check exits `0`, the log lists only this feature's reviewed backend commit(s), and the push is a fast-forward. If the remote advanced, stop, rebase the isolated worktree onto the new remote tip, rerun Steps 1–2, then retry; never force-push.

- [ ] **Step 4: Wait for backend deployment success**

```bash
backend_sha="$(git rev-parse HEAD)"
backend_run_id=""
for attempt in $(seq 1 12); do
  backend_run_id="$(gh run list --workflow deploy.yml \
    --branch context-lab-learning-loop-mvp \
    --limit 10 \
    --json databaseId,headSha \
    --jq ".[] | select(.headSha == \"$backend_sha\") | .databaseId" | head -n 1)"
  test -n "$backend_run_id" && break
  sleep 5
done
test -n "$backend_run_id"
gh run watch "$backend_run_id" --exit-status
```

Expected: the run whose `headSha` equals the pushed commit completes with `conclusion: success`. The run ID is read from the first command; do not reuse an older run.

- [ ] **Step 5: Probe the production diagnosis contract**

```bash
response="$(curl -fsS --max-time 60 \
  -H 'Content-Type: application/json' \
  --data '{"word":"running"}' \
  'http://124.223.157.129/api/word-agent/query')"
node -e '
const response = JSON.parse(process.argv[1]);
const item = response?.data?.words?.[0];
if (item?.word !== "run" || item?.inputStatus !== "inflected") process.exit(1);
if (typeof item?.correctionReason !== "string" || !item.correctionReason) process.exit(1);
' "$response"
```

Expected: exit code `0`; production returns `run`, `inflected`, and a non-empty reason. If model output is transiently uncertain, inspect the response and backend logs rather than weakening the assertion or deploying the frontend blindly.

---

### Task 6: Verify, deploy, and accept the desktop frontend

**Files:**

- Verify only; no additional production source changes are planned.

**Interfaces:**

- Consumes: Tasks 2–4 and the verified production backend from Task 5.
- Produces: a successful `Verify and deploy frontend` run and an accepted desktop correction flow.

- [ ] **Step 1: Run changed-file lint**

```bash
pnpm --filter @font/english-world exec eslint \
  src/server/wordAgent/wordAgent.ts \
  src/page/englishWorld/component/wordCorrection.ts \
  src/page/englishWorld/component/wordCorrection.test.ts \
  src/page/englishWorld/component/WordCorrectionSuggestion.tsx \
  src/page/englishWorld/component/WordCorrectionSuggestion.test.tsx \
  src/page/englishWorld/component/EditAddModal.tsx \
  src/page/englishWorld/component/EditAddModal.test.tsx
```

Expected: exit code `0`; report any pre-existing warnings separately.

- [ ] **Step 2: Run complete English World verification**

```bash
pnpm --filter @font/english-world exec vitest run \
  --no-file-parallelism --testTimeout=60000
pnpm --filter @font/english-world build
git diff --check origin/yifeng/docker-compose...HEAD
git status --short
```

Expected: all Vitest suites PASS, the production build succeeds, and the repository is clean.

- [ ] **Step 3: Review the frontend delta**

Use `superpowers:requesting-code-review` against `origin/yifeng/docker-compose...HEAD`. Confirm the review specifically checks stale requests, legacy missing-status handling, explicit confirmation, save-with-pending-suggestion, and preservation of touched fields. Fix every Critical or Important finding and repeat Steps 1–2.

- [ ] **Step 4: Push the frontend deployment branch**

```bash
git fetch origin yifeng/docker-compose
git merge-base --is-ancestor origin/yifeng/docker-compose HEAD
git push origin yifeng/docker-compose
git fetch origin yifeng/docker-compose
test "$(git rev-parse HEAD)" = \
  "$(git rev-parse origin/yifeng/docker-compose)"
```

Expected: a fast-forward push and identical local/remote commit IDs. Never force-push.

- [ ] **Step 5: Wait for frontend deployment success**

```bash
frontend_sha="$(git rev-parse HEAD)"
frontend_run_id=""
for attempt in $(seq 1 12); do
  frontend_run_id="$(gh run list --workflow deploy.yml \
    --branch yifeng/docker-compose \
    --limit 10 \
    --json databaseId,headSha \
    --jq ".[] | select(.headSha == \"$frontend_sha\") | .databaseId" | head -n 1)"
  test -n "$frontend_run_id" && break
  sleep 5
done
test -n "$frontend_run_id"
gh run watch "$frontend_run_id" --exit-status
```

Expected: the run for the pushed frontend commit completes successfully.

- [ ] **Step 6: Confirm the deployed bundle and desktop behavior**

Fetch the current HTML with cache busting, resolve its current JavaScript asset, and confirm the deployed asset contains `使用建议`, `保留原词`, `检测到词形变化`, and `可能拼写错误`:

```bash
production_html="$(curl -fsSL --max-time 20 \
  'http://124.223.157.129/?_codex_probe=word-correction')"
asset_path="$(printf '%s' "$production_html" | \
  rg -o '/assets/index-[^" ]+\.js' | head -n 1)"
test -n "$asset_path"
bundle_file="$(mktemp /tmp/english-world-word-correction.XXXXXX)"
test -f "$bundle_file"
curl -fsSL --max-time 30 \
  "http://124.223.157.129${asset_path}" \
  -o "$bundle_file"
for marker in 使用建议 保留原词 检测到词形变化 可能拼写错误; do
  rg -F "$marker" "$bundle_file" >/dev/null
done
rm -f "$bundle_file"
```

In an authenticated desktop session at `http://124.223.157.129/`:

1. Open the desktop add-word modal and enter `confront`; verify blank metadata auto-fills without a correction suggestion.
2. Enter `running`; verify `running → run` appears and metadata remains untouched before confirmation.
3. Type a manual Chinese meaning, choose “使用建议”, and verify the word becomes `run` while the manual meaning remains.
4. Enter `recieve`; verify `recieve → receive`, choose “保留原词”, and verify the original input remains.
5. Enter `happiness` and `be cited as`; verify neither is over-corrected.
6. Leave a suggestion unresolved and verify the confirm button remains enabled; do not submit this acceptance case against production data. The component test from Task 4 proves that submission uses the current input.

Expected: all six checks pass on the deployed desktop site, while the mobile add flow remains visually and behaviorally unchanged.

- [ ] **Step 7: Record final evidence**

Capture backend/frontend commit IDs, GitHub Actions run IDs, the successful production API probe, frontend asset name, and the six desktop acceptance results in the final handoff. Before claiming completion, invoke `superpowers:verification-before-completion` and rerun any check whose evidence is stale.
