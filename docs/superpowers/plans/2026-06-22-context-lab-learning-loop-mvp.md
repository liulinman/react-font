# Context Lab Learning Loop MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Context Lab into the commercially usable daily learning loop approved in `docs/superpowers/specs/2026-06-22-context-lab-learning-loop-mvp-design.md`.

**Architecture:** Finish the current frontend selected-text workflow, add a narrow backend result-review response shape, then surface review actions in Context Lab and connect Cockpit context actions to the lab. Keep the existing async task/history model, `EditAddModal`, `word-agent/query`, `wordExist`, and `wordAdd`.

**Tech Stack:** React 18, TypeScript, Vite, Ant Design, Testing Library, Vitest, NestJS 10, Jest, Sequelize, MySQL.

## Global Constraints

- Preserve existing word library fields, table columns, add/edit modal fields, routes, and actions.
- Do not redesign mobile in this pass.
- Do not add payments, course publishing, admin consoles, or a full graph editor.
- Do not trigger AI generation automatically on page load.
- Do not show demo learning data as if it is real user data.
- Current frontend worktree already has uncommitted edits in `EnglishWorld.css`, `ContextLabPage.tsx`, and `ContextLabPage.test.tsx`; work with those edits and do not revert them.

---

## Repositories

- Frontend: `/Users/liulin/Desktop/font/english/react-font`
- Backend: `/Users/liulin/Desktop/font/english/nestjs`

## File Structure

### Frontend

- Modify: `apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.tsx`
  - Owns Context Lab orchestration, selected-text menu, add modal, answer submission, and result review.
- Modify: `apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.test.tsx`
  - Covers selected-text actions, duplicate add handling, result review, and workflow actions.
- Modify: `apps/english-world/src/page/englishWorld/cockpit/LearningCockpitPage.tsx`
  - Passes weak-word intent to Context Lab and replaces misleading demo fallback with explicit unavailable state.
- Modify: `apps/english-world/src/page/englishWorld/cockpit/LearningCockpitPage.test.tsx`
  - Covers context action navigation and no-demo fallback behavior.
- Modify: `apps/english-world/src/page/englishWorld/server/learning.ts`
  - Types the richer Context Lab submit response.
- Modify: `apps/english-world/src/page/englishWorld/types/learning.ts`
  - Adds Context Lab result review types and optional initial source query support.
- Modify: `apps/english-world/src/page/englishWorld/recite/planReview.ts`
  - Reuses plan-review query helpers for Context Lab result actions if word ids are available.
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.css`
  - Adds compact workflow step, result review, and selected-text menu states.

### Backend

- Modify: `src/interface/exercise-agent/exercise-agent.types.ts`
  - Adds `ExerciseSubmitSummary`.
- Modify: `src/interface/exercise-agent/exercise-agent.service.ts`
  - Adds score, correct count, wrong count, weak words, and next suggestions to submit response.
- Modify: `src/interface/exercise-agent/exercise-agent.service.spec.ts`
  - Covers the submit summary response.
- Modify: `src/interface/context-lab/context-lab.service.spec.ts`
  - Keeps Context Lab delegation expectations aligned with the richer submit result.

## Shared Interfaces

Add these frontend types in `apps/english-world/src/page/englishWorld/types/learning.ts`:

```ts
export type ContextLabSubmitResult = {
  results: ExerciseResultItem[];
  score: number;
  correctCount: number;
  wrongCount: number;
  weakWords: string[];
  nextSuggestions: string[];
};

export type ContextLabInitialSource = {
  source?: "cockpit" | "result";
  words: string[];
};
```

Add this backend type in `src/interface/exercise-agent/exercise-agent.types.ts`:

```ts
export interface ExerciseSubmitSummary {
  results: ExerciseResultItem[];
  score: number;
  correctCount: number;
  wrongCount: number;
  weakWords: string[];
  nextSuggestions: string[];
}
```

---

### Task 1: Harden Selected-Text Add And Duplicate Handling

**Files:**
- Modify: `apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.test.tsx`
- Modify: `apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.tsx`
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.css`

**Interfaces:**
- Consumes: `wordAgentQuery({ word })`, `wordExist({ englishWord })`, `wordAdd(data)`, `EditAddModal`.
- Produces: stable selected-text translate/add behavior with duplicate-word protection.

- [ ] **Step 1: Write the failing duplicate-add test**

Add this test to `ContextLabPage.test.tsx` near the existing selected-text tests:

```tsx
it("keeps the add modal open and does not save when the selected word already exists", async () => {
  requestMock.mockImplementation((config) => {
    if (config.url === "/context-lab/history") {
      return Promise.resolve({
        list: [
          {
            id: 12,
            taskId: 12,
            status: "succeeded",
            sourceType: "custom",
            words: ["urban farming"],
            articleExerciseId: 88,
            article: "Urban Farming\n\nUrban farming improves local food supply.",
            questions: [
              {
                id: "q1",
                stem: "What is the passage about?",
                options: ["Urban farming", "Space travel"],
              },
            ],
          },
        ],
        total: 1,
        page: 1,
        pageSize: 10,
      });
    }
    if (config.url === "/word-agent/query") {
      return Promise.resolve({
        words: [
          {
            word: "urban farming",
            phonetic: "/ˈɜːbən ˈfɑːmɪŋ/",
            meaning: "城市农业；都市农耕",
            partOfSpeech: [2],
            examples: [],
            ieltsCase: null,
          },
        ],
      });
    }
    if (config.url === "/english/existEnglishWord") {
      return Promise.resolve(true);
    }
    if (config.url === "/english/AddEnglishWord") {
      throw new Error("wordAdd should not be called for duplicate words");
    }
    return Promise.resolve({});
  });

  const user = userEvent.setup();
  render(<ContextLabPage />);

  await user.click(await screen.findByRole("button", { name: "开始练习" }));
  const paragraph = await screen.findByText(
    "Urban farming improves local food supply.",
  );
  vi.spyOn(window, "getSelection").mockReturnValue({
    toString: () => "  “urban farming,” ",
    rangeCount: 1,
    removeAllRanges: vi.fn(),
  } as unknown as Selection);

  await user.pointer({ target: paragraph, keys: "[MouseRight]" });
  await user.click(await screen.findByText("一键添加到词库"));
  await user.click(await screen.findByRole("button", { name: /确\s*认/ }));

  expect(await screen.findByText("添加单词")).toBeInTheDocument();
  expect(screen.getByLabelText("单词名")).toHaveValue("urban farming");
  expect(requestMock).not.toHaveBeenCalledWith(
    expect.objectContaining({ url: "/english/AddEnglishWord" }),
  );
});
```

- [ ] **Step 2: Run the red test**

Run from `/Users/liulin/Desktop/font/english/react-font`:

```bash
pnpm --filter @font/english-world test -- --run src/page/englishWorld/contextLab/ContextLabPage.test.tsx
```

Expected: this new test fails if duplicate handling closes the modal, saves anyway, or does not preserve the cleaned phrase.

- [ ] **Step 3: Implement minimal duplicate behavior**

In `ContextLabPage.tsx`, keep the existing `handleAddModalOk` shape and make duplicate handling explicit:

```tsx
if (exists) {
  message.warning("该词已在词库，无需重复添加");
  setAddInitialValues((prev) => prev ?? wordAgentItemToAddInitial(
    {
      word: englishWord,
      phonetic: data.englishPhonetic,
      meaning: data.englishChinese,
      partOfSpeech: data.englishPartSpeech,
      examples: [],
      ieltsCase: null,
    },
    englishWord,
  ));
  return false;
}
```

Do not close `EditAddModal` in the duplicate branch. Keep `wordAdd(data)` only after the duplicate check returns `false`.

- [ ] **Step 4: Run the green focused test**

Run:

```bash
pnpm --filter @font/english-world test -- --run src/page/englishWorld/contextLab/ContextLabPage.test.tsx
```

Expected: `ContextLabPage.test.tsx` passes.

- [ ] **Step 5: Commit Task 1**

Commit only the selected-text hardening files:

```bash
git add apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.tsx apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.test.tsx apps/english-world/src/page/englishWorld/EnglishWorld.css
git commit -m "feat: harden context lab selected word actions"
```

---

### Task 2: Add Backend Submit Review Summary

**Files:**
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/exercise-agent/exercise-agent.types.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/exercise-agent/exercise-agent.service.spec.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/exercise-agent/exercise-agent.service.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/context-lab/context-lab.service.spec.ts`

**Interfaces:**
- Consumes: existing `ExerciseResultItem[]` from answer grading.
- Produces: `ExerciseSubmitSummary` with `score`, `correctCount`, `wrongCount`, `weakWords`, and `nextSuggestions`.

- [ ] **Step 1: Write the failing backend submit summary test**

Add this test to `exercise-agent.service.spec.ts` in the existing submit-related describe block or near other service tests:

```ts
it('returns score, wrong count, weak words, and next suggestions after submit', async () => {
  const service = new ExerciseAgentService();
  (service as any).models = {
    articleExercise: {
      findOne: jest.fn().mockResolvedValue({
        id: 11,
        userId: 7,
        wordsJson: JSON.stringify(['urban farming', 'resilient']),
        questionsJson: JSON.stringify([
          {
            id: 'q1',
            stem: 'What does urban farming improve?',
            options: ['Food supply', 'Space travel'],
            correctIndex: 0,
          },
          {
            id: 'q2',
            stem: 'Which word means able to recover?',
            options: ['Fragile', 'Resilient'],
            correctIndex: 1,
          },
        ]),
      }),
    },
  };
  jest.spyOn(service as any, 'getClient').mockReturnValue({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  explanations: ['第1题解析', '第2题解析'],
                }),
              },
            },
          ],
        }),
      },
    },
  });

  const result = await service.submit(7, {
    sessionId: 11,
    answers: [
      { questionId: 'q1', selectedIndex: 0 },
      { questionId: 'q2', selectedIndex: 0 },
    ],
  });

  expect(result.correctCount).toBe(1);
  expect(result.wrongCount).toBe(1);
  expect(result.score).toBe(50);
  expect(result.weakWords).toEqual(['resilient']);
  expect(result.nextSuggestions).toEqual([
    '复盘错题解析，确认定位句和同义替换',
    '把薄弱词加入今日复习再练一轮',
    '用薄弱词再生成一套 Context Lab',
  ]);
});
```

- [ ] **Step 2: Run the red backend test**

Run from `/Users/liulin/Desktop/font/english/nestjs`:

```bash
pnpm test --runInBand src/interface/exercise-agent/exercise-agent.service.spec.ts
```

Expected: FAIL because `correctCount`, `wrongCount`, `score`, `weakWords`, or `nextSuggestions` are missing.

- [ ] **Step 3: Add the shared backend type**

Update `exercise-agent.types.ts`:

```ts
export interface ExerciseSubmitSummary {
  results: ExerciseResultItem[];
  score: number;
  correctCount: number;
  wrongCount: number;
  weakWords: string[];
  nextSuggestions: string[];
}
```

- [ ] **Step 4: Implement summary mapping in submit**

In `exercise-agent.service.ts`, import `ExerciseSubmitSummary` and update the return type:

```ts
async submit(
  userId: number,
  dto: SubmitExerciseDto,
): Promise<ExerciseSubmitSummary> {
```

After `results` are built and explanations are applied, return through a helper:

```ts
return this.buildSubmitSummary(results, questions, session.wordsJson);
```

Add the helper near the other private helpers:

```ts
private buildSubmitSummary(
  results: ExerciseResultItem[],
  questions: ExerciseQuestionWithAnswer[],
  wordsJson: string,
): ExerciseSubmitSummary {
  const correctCount = results.filter((item) => item.correct).length;
  const wrongCount = results.length - correctCount;
  const score = results.length
    ? Math.round((correctCount / results.length) * 100)
    : 0;
  const sourceWords = this.parseJsonArray(wordsJson);
  const wrongIndexes = results
    .map((item, index) => (item.correct ? -1 : index))
    .filter((index) => index >= 0);
  const weakWords = wrongIndexes.length
    ? wrongIndexes
        .map((index) => sourceWords[index % Math.max(1, sourceWords.length)])
        .filter(Boolean)
    : [];

  return {
    results,
    score,
    correctCount,
    wrongCount,
    weakWords: Array.from(new Set(weakWords)),
    nextSuggestions:
      wrongCount > 0
        ? [
            '复盘错题解析，确认定位句和同义替换',
            '把薄弱词加入今日复习再练一轮',
            '用薄弱词再生成一套 Context Lab',
          ]
        : [
            '本套题表现稳定，可以用新词再生成一套练习',
            '回到词库补充今天遇到的高价值表达',
          ],
  };
}
```

Keep the existing catch branch for explanation failure, but return the same summary shape:

```ts
return this.buildSubmitSummary(results, questions, session.wordsJson);
```

- [ ] **Step 5: Align ContextLabService spec**

Update the submit delegation mock in `context-lab.service.spec.ts`:

```ts
exerciseAgentService.submit.mockResolvedValue({
  results: [{ questionId: 'q1', correct: true }],
  score: 100,
  correctCount: 1,
  wrongCount: 0,
  weakWords: [],
  nextSuggestions: ['本套题表现稳定，可以用新词再生成一套练习'],
});
```

Add expectations:

```ts
expect(result.score).toBe(100);
expect(result.nextSuggestions).toHaveLength(1);
```

- [ ] **Step 6: Run backend green tests**

Run:

```bash
pnpm test --runInBand src/interface/exercise-agent/exercise-agent.service.spec.ts src/interface/context-lab/context-lab.service.spec.ts
```

Expected: both spec files pass.

- [ ] **Step 7: Commit Task 2**

```bash
git add src/interface/exercise-agent/exercise-agent.types.ts src/interface/exercise-agent/exercise-agent.service.ts src/interface/exercise-agent/exercise-agent.service.spec.ts src/interface/context-lab/context-lab.service.spec.ts
git commit -m "feat: add context lab submit summary"
```

---

### Task 3: Render Context Lab Result Review And Next Actions

**Files:**
- Modify: `apps/english-world/src/page/englishWorld/types/learning.ts`
- Modify: `apps/english-world/src/page/englishWorld/server/learning.ts`
- Modify: `apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.test.tsx`
- Modify: `apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.tsx`
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.css`

**Interfaces:**
- Consumes: backend `ContextLabSubmitResult`.
- Produces: visible score, wrong count, weak words, suggestions, and next actions after submit.

- [ ] **Step 1: Add frontend result types**

In `types/learning.ts`, import or define the result item shape used by Context Lab:

```ts
import type { ExerciseResultItem } from "@/server/exerciseAgent/exerciseAgent";
```

Then add:

```ts
export type ContextLabSubmitResult = {
  results: ExerciseResultItem[];
  score: number;
  correctCount: number;
  wrongCount: number;
  weakWords: string[];
  nextSuggestions: string[];
};
```

In `server/learning.ts`, change `contextLabSubmit` to return `YTRequest<ContextLabSubmitResult>`.

- [ ] **Step 2: Write the failing result-review test**

Add to `ContextLabPage.test.tsx`:

```tsx
it("shows a result review with weak-word next actions after submitting answers", async () => {
  requestMock.mockImplementation((config) => {
    if (config.url === "/context-lab/history") {
      return Promise.resolve({
        list: [
          {
            id: 12,
            taskId: 12,
            status: "succeeded",
            sourceType: "custom",
            words: ["urban farming", "resilient"],
            articleExerciseId: 88,
            article: "Urban Farming\n\nUrban farming improves local food supply.",
            questions: [
              {
                id: "q1",
                stem: "What is the passage about?",
                options: ["Urban farming", "Space travel"],
              },
            ],
          },
        ],
        total: 1,
        page: 1,
        pageSize: 10,
      });
    }
    if (config.url === "/context-lab/submit") {
      return Promise.resolve({
        results: [
          {
            questionId: "q1",
            correct: false,
            correctIndex: 0,
            userSelectedIndex: 1,
            explanation: "错题解析",
          },
        ],
        score: 0,
        correctCount: 0,
        wrongCount: 1,
        weakWords: ["urban farming"],
        nextSuggestions: ["把薄弱词加入今日复习再练一轮"],
      });
    }
    return Promise.resolve({});
  });

  const user = userEvent.setup();
  render(<ContextLabPage />);

  await user.click(await screen.findByRole("button", { name: "开始练习" }));
  await user.click(await screen.findByLabelText("B. Space travel"));
  await user.click(screen.getByRole("button", { name: "提交练习" }));

  expect(await screen.findByText("结果复盘")).toBeInTheDocument();
  expect(screen.getByText("0")).toBeInTheDocument();
  expect(screen.getByText("错题 1")).toBeInTheDocument();
  expect(screen.getByText("urban farming")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "用薄弱词再练一套" })).toBeInTheDocument();
});
```

- [ ] **Step 3: Run the red result-review test**

Run:

```bash
pnpm --filter @font/english-world test -- --run src/page/englishWorld/contextLab/ContextLabPage.test.tsx
```

Expected: FAIL because result-review summary UI is not present.

- [ ] **Step 4: Store submit summary state**

In `ContextLabPage.tsx`, import `ContextLabSubmitResult` and add state:

```tsx
const [submitSummary, setSubmitSummary] =
  useState<ContextLabSubmitResult | null>(null);
```

Reset it in `handleGenerate` and `handleOpenTask`:

```tsx
setSubmitSummary(null);
```

After submit:

```tsx
setResults(response.results ?? []);
setSubmitSummary(response);
```

- [ ] **Step 5: Add result review renderer**

Add a small renderer below the question list and above submit actions:

```tsx
const renderResultReview = () => {
  if (!submitSummary) return null;
  return (
    <section className="context-lab-result-review" aria-label="结果复盘">
      <div>
        <Text className="learning-cockpit-label">Result</Text>
        <Title level={4}>结果复盘</Title>
      </div>
      <div className="context-lab-result-metrics">
        <strong>{submitSummary.score}</strong>
        <span>得分</span>
        <Tag color={submitSummary.wrongCount > 0 ? "orange" : "green"}>
          错题 {submitSummary.wrongCount}
        </Tag>
      </div>
      {submitSummary.weakWords.length > 0 && (
        <div className="learning-cockpit-word-strip">
          {submitSummary.weakWords.map((word) => (
            <Tag key={word} color="red">
              {word}
            </Tag>
          ))}
        </div>
      )}
      <ul>
        {submitSummary.nextSuggestions.map((suggestion) => (
          <li key={suggestion}>{suggestion}</li>
        ))}
      </ul>
      <Space wrap>
        <Button onClick={() => setSourceMode("custom")}>
          用薄弱词再练一套
        </Button>
        <Button onClick={() => window.location.assign("/englishWorld/words")}>
          打开词库
        </Button>
      </Space>
    </section>
  );
};
```

When clicking `用薄弱词再练一套`, also prefill `customWords`:

```tsx
onClick={() => {
  setSourceMode("custom");
  setCustomWords(submitSummary.weakWords.join(", "));
  setPracticeModalOpen(false);
}}
```

Render it inside the question pane:

```tsx
{renderResultReview()}
```

- [ ] **Step 6: Add result review CSS**

In `EnglishWorld.css`:

```css
.context-lab-result-review {
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: #eff6ff;
}

.context-lab-result-metrics {
  display: flex;
  align-items: center;
  gap: 10px;
}

.context-lab-result-metrics strong {
  color: #1d4ed8;
  font-size: 28px;
  line-height: 1;
}

.context-lab-result-review ul {
  margin: 0;
  padding-left: 18px;
  color: #334155;
}
```

- [ ] **Step 7: Run green frontend test**

Run:

```bash
pnpm --filter @font/english-world test -- --run src/page/englishWorld/contextLab/ContextLabPage.test.tsx
```

Expected: `ContextLabPage.test.tsx` passes.

- [ ] **Step 8: Commit Task 3**

```bash
git add apps/english-world/src/page/englishWorld/types/learning.ts apps/english-world/src/page/englishWorld/server/learning.ts apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.tsx apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.test.tsx apps/english-world/src/page/englishWorld/EnglishWorld.css
git commit -m "feat: show context lab result review"
```

---

### Task 4: Connect Cockpit Intent And Remove Misleading Demo Fallback

**Files:**
- Modify: `apps/english-world/src/page/englishWorld/cockpit/LearningCockpitPage.test.tsx`
- Modify: `apps/english-world/src/page/englishWorld/cockpit/LearningCockpitPage.tsx`
- Modify: `apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.tsx`
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.css`

**Interfaces:**
- Consumes: `DailyCoachSummary.weakWords`, React Router query params.
- Produces: Cockpit context action that opens Context Lab with weak words and shows explicit unavailable state on data failure.

- [ ] **Step 1: Write Cockpit navigation test**

In `LearningCockpitPage.test.tsx`, add:

```tsx
it("opens Context Lab with weak words from the daily context action", async () => {
  const navigate = vi.fn();
  vi.mocked(useNavigate).mockReturnValue(navigate);
  requestMock.mockImplementation((config) => {
    if (config.url === "/daily-coach/summary") {
      return Promise.resolve({
        totalWords: 2,
        todayNewWords: 0,
        reciteAccuracy: 50,
        levelDistribution: [],
        weakWords: [
          { id: 1, word: "fragile", level: 0 },
          { id: 2, word: "resilient", level: 1 },
        ],
        suggestedActions: [
          {
            type: "context",
            title: "进入语境练习",
            description: "用薄弱词生成练习",
            wordIds: [1, 2],
            estimatedMinutes: 8,
          },
        ],
      });
    }
    if (config.url === "/memory-map/overview") {
      return Promise.resolve({
        levels: [],
        dueWords: [],
        weakWords: [],
        recentMistakes: [],
        streakLikeStats: { recentSessions: 0, recentAccuracy: 0 },
      });
    }
    return Promise.resolve({});
  });

  render(<LearningCockpitPage />);

  await userEvent.click(await screen.findByRole("button", { name: "生成练习包" }));

  expect(navigate).toHaveBeenCalledWith(
    "/englishWorld/context-lab?source=cockpit&words=fragile%2Cresilient",
  );
});
```

- [ ] **Step 2: Write no-demo fallback test**

Add:

```tsx
it("shows a retryable unavailable state instead of demo metrics when coach loading fails", async () => {
  requestMock.mockRejectedValue(new Error("network down"));

  render(<LearningCockpitPage />);

  expect(await screen.findByText("今日任务暂不可用")).toBeInTheDocument();
  expect(screen.queryByText("Day 8 streak")).not.toBeInTheDocument();
});
```

- [ ] **Step 3: Run red Cockpit tests**

Run:

```bash
pnpm --filter @font/english-world test -- --run src/page/englishWorld/cockpit/LearningCockpitPage.test.tsx
```

Expected: FAIL until navigation and unavailable state are implemented.

- [ ] **Step 4: Implement weak-word Context Lab URL**

In `LearningCockpitPage.tsx`, replace direct context navigation with:

```tsx
const openContextLab = () => {
  const words = coachSummary.weakWords
    .map((word) => word.word)
    .filter(Boolean)
    .slice(0, 8);
  const suffix = words.length
    ? `?source=cockpit&words=${encodeURIComponent(words.join(","))}`
    : "";
  navigate(`/englishWorld/context-lab${suffix}`);
};
```

Use `openContextLab` for the Context Lab card and `CoachSummaryPanel` context action.

- [ ] **Step 5: Implement explicit unavailable state**

Track load errors:

```tsx
const [coachUnavailable, setCoachUnavailable] = useState(false);
```

On summary request failure:

```tsx
.catch(() => {
  if (mounted) setCoachUnavailable(true);
});
```

Render before stats/cards:

```tsx
{coachUnavailable && (
  <section className="learning-cockpit-card learning-cockpit-unavailable">
    <Title level={3}>今日任务暂不可用</Title>
    <p>学习数据加载失败。你仍然可以打开词库、复习或手动进入语境实验室。</p>
    <Button onClick={() => window.location.reload()}>重试</Button>
  </section>
)}
```

Do not replace failed real data with `demoCoachSummary`.

- [ ] **Step 6: Parse initial Context Lab query**

In `ContextLabPage.tsx`, import `useLocation`:

```tsx
import { useLocation } from "react-router-dom";
```

Initialize from query:

```tsx
const location = useLocation();

useEffect(() => {
  const params = new URLSearchParams(location.search);
  const words = (params.get("words") ?? "")
    .split(",")
    .map((word) => word.trim())
    .filter(Boolean)
    .slice(0, 20);
  if (params.get("source") === "cockpit" && words.length >= 3) {
    setSourceMode("custom");
    setCustomWords(words.join(", "));
  }
}, [location.search]);
```

- [ ] **Step 7: Add unavailable CSS**

In `EnglishWorld.css`:

```css
.learning-cockpit-unavailable {
  border-color: #fed7aa;
  background: #fff7ed;
}
```

- [ ] **Step 8: Run green Cockpit tests**

Run:

```bash
pnpm --filter @font/english-world test -- --run src/page/englishWorld/cockpit/LearningCockpitPage.test.tsx
```

Expected: `LearningCockpitPage.test.tsx` passes.

- [ ] **Step 9: Commit Task 4**

```bash
git add apps/english-world/src/page/englishWorld/cockpit/LearningCockpitPage.tsx apps/english-world/src/page/englishWorld/cockpit/LearningCockpitPage.test.tsx apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.tsx apps/english-world/src/page/englishWorld/EnglishWorld.css
git commit -m "feat: connect cockpit to context lab loop"
```

---

### Task 5: Full Verification And Final Commit Check

**Files:**
- Test only unless verification exposes a real defect.

**Interfaces:**
- Produces: evidence that frontend and backend pass the MVP verification set.

- [ ] **Step 1: Run frontend whitespace check**

```bash
git diff --check
```

Expected: no output, exit code 0.

- [ ] **Step 2: Run frontend focused tests**

```bash
pnpm --filter @font/english-world test -- --run src/page/englishWorld/contextLab/ContextLabPage.test.tsx src/page/englishWorld/cockpit/LearningCockpitPage.test.tsx
```

Expected: all focused tests pass.

- [ ] **Step 3: Run frontend full tests**

```bash
pnpm --filter @font/english-world test -- --run
```

Expected: all Vitest files pass. Existing warnings about browserslist, Ant Design deprecations, or jsdom pseudo-element support are acceptable only if the command exits 0.

- [ ] **Step 4: Run frontend build**

```bash
pnpm --filter @font/english-world build
```

Expected: TypeScript and Vite build pass. Existing large chunk warning is acceptable if the command exits 0.

- [ ] **Step 5: Run backend whitespace check**

From `/Users/liulin/Desktop/font/english/nestjs`:

```bash
git diff --check
```

Expected: no output, exit code 0.

- [ ] **Step 6: Run backend tests**

```bash
pnpm test --runInBand
```

Expected: all Jest suites pass.

- [ ] **Step 7: Run backend build**

```bash
pnpm build
```

Expected: Nest build passes.

- [ ] **Step 8: Inspect final worktree state**

```bash
git status --short --untracked-files=all
```

Expected: no uncommitted implementation changes in each repo unless deliberately left for user review.

## Self-Review

- Spec coverage: Tasks cover selected-text translate/add hardening, duplicate add behavior, backend result-review shape, frontend result-review UI, Cockpit-to-Context-Lab intent, no misleading demo fallback, and final verification.
- Red-flag scan: no unfinished markers or undefined task references remain.
- Type consistency: frontend `ContextLabSubmitResult` mirrors backend `ExerciseSubmitSummary`; `weakWords` is `string[]` on both sides; navigation query uses `source=cockpit&words=...`; existing `ExerciseResultItem` remains the per-question result type.
