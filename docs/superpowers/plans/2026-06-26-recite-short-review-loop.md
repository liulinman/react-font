# Recite Short Review Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/englishWorld/recite` into a short daily review loop with one-question answering, mistake-first results, and wrong-word repair.

**Architecture:** Keep the existing route and API endpoints. Add backend tests around submit semantics, extend frontend pure review helpers, then refactor `RecitePage` around idle, answering, submitted, history, and stats states. Use existing `wordIds` support for wrong-word repair sessions.

**Tech Stack:** React 18, TypeScript, Ant Design, Vitest, React Testing Library, NestJS, Jest, Sequelize.

## Global Constraints

- Existing endpoints stay in place: `POST /recite/start`, `POST /recite/submit`, `POST /recite/history`, `POST /recite/stats`.
- Do not add a database table.
- Do not redesign mobile recite in this version.
- Keep `/englishWorld/recite` as the canonical desktop route.
- Keep `wordIds` user-scoped, deduplicated, ordered by incoming list, and capped at 50.
- Empty answers count as incorrect.
- Result screen renders wrong words first.
- Primary repair action starts a new session with only failed word IDs.

---

## File Structure

- `nestjs/src/interface/recite/recite.service.spec.ts`: add submit-answer unit coverage and complete mocks for history/session persistence.
- `nestjs/src/interface/recite/recite.service.ts`: keep existing API shape, harden missing-word results if tests expose gaps.
- `react-font/apps/english-world/src/page/englishWorld/recite/reviewExperience.ts`: add pure helpers for wrong-word IDs and mistake-first ordering.
- `react-font/apps/english-world/src/page/englishWorld/recite/reviewExperience.test.ts`: test new helper behavior.
- `react-font/apps/english-world/src/page/englishWorld/recite/RecitePage.test.tsx`: cover start, Enter navigation, submit, result ordering, repair retry, and submit failure.
- `react-font/apps/english-world/src/page/englishWorld/recite/RecitePage.tsx`: refactor flow rendering and wire repair retry.
- `react-font/apps/english-world/src/page/englishWorld/EnglishWorld.css`: add restrained recite loop styles.

---

### Task 1: Backend Submit Semantics

**Files:**
- Modify: `nestjs/src/interface/recite/recite.service.spec.ts`
- Modify: `nestjs/src/interface/recite/recite.service.ts`

**Interfaces:**
- Consumes: `ReciteService.submitAnswer(userId: number, dto: SubmitAnswerDto)`
- Produces: submit results where empty answers are incorrect and missing user-owned words do not leak data.

- [ ] **Step 1: Write failing tests for empty and missing answers**

Add these mocks near the top of `recite.service.spec.ts`:

```ts
const mockEnglishFindAll = jest.fn();
const mockReciteSessionCreate = jest.fn();
const mockReciteHistoryBulkCreate = jest.fn();

jest.mock('src/database/init-models', () => ({
  initModels: jest.fn(() => ({
    english: {
      findAll: (...args: unknown[]) => mockEnglishFindAll(...args),
    },
    reciteHistory: {
      bulkCreate: (...args: unknown[]) => mockReciteHistoryBulkCreate(...args),
      findAll: jest.fn(),
    },
    reciteSession: {
      create: (...args: unknown[]) => mockReciteSessionCreate(...args),
      findAndCountAll: jest.fn(),
    },
  })),
}));
```

Then add:

```ts
describe('ReciteService submitAnswer', () => {
  const configService = { getConfig: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    mockReciteSessionCreate.mockResolvedValue({ id: 88 });
    mockReciteHistoryBulkCreate.mockResolvedValue([]);
  });

  it('records empty answers as incorrect without dropping the row', async () => {
    mockEnglishFindAll.mockResolvedValue([
      { id: 2, englishWord: 'fragile', englishChinese: '脆弱的' },
    ]);
    const service = new ReciteService(configService as any);

    const result = await service.submitAnswer(9, {
      direction: 0,
      answers: [{ wordId: 2, userAnswer: '' }],
    });

    expect(result.data.statistics).toEqual({
      totalCount: 1,
      correctCount: 0,
      errorCount: 1,
      accuracy: 0,
    });
    expect(result.data.results[0]).toEqual({
      wordId: 2,
      englishWord: 'fragile',
      correctAnswer: 'fragile',
      userAnswer: '',
      isCorrect: false,
    });
    expect(mockReciteHistoryBulkCreate).toHaveBeenCalledWith([
      expect.objectContaining({
        sessionId: 88,
        wordId: 2,
        userAnswer: '',
        isCorrect: false,
      }),
    ]);
  });

  it('marks missing or unauthorized words incorrect without exposing an answer', async () => {
    mockEnglishFindAll.mockResolvedValue([]);
    const service = new ReciteService(configService as any);

    const result = await service.submitAnswer(9, {
      direction: 0,
      answers: [{ wordId: 404, userAnswer: 'stolen' }],
    });

    expect(result.data.statistics).toEqual({
      totalCount: 1,
      correctCount: 0,
      errorCount: 1,
      accuracy: 0,
    });
    expect(result.data.results[0]).toEqual({
      wordId: 404,
      isCorrect: false,
      error: '单词不存在',
    });
    expect(mockReciteHistoryBulkCreate).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run backend test and verify failure or current pass**

Run:

```bash
cd /Users/liulin/Desktop/font/english/nestjs
pnpm test -- recite.service.spec.ts --runInBand
```

Expected before implementation: either FAIL from incomplete mocks/statistics, or PASS if current behavior already satisfies the contract.

- [ ] **Step 3: Implement minimal backend fix if needed**

If the missing-word statistics fail because `results` already includes the missing item but `historyRecords` does not, keep that behavior. If persistence mocks fail, update only the test mocks. If total statistics fail, ensure this block in `submitAnswer` remains based on `results`, not `historyRecords`:

```ts
const correctCount = results.filter((r) => r.isCorrect).length;
const totalCount = results.length;
const errorCount = totalCount - correctCount;
const accuracy = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;
```

- [ ] **Step 4: Run backend test and build**

Run:

```bash
cd /Users/liulin/Desktop/font/english/nestjs
pnpm test -- recite.service.spec.ts --runInBand
pnpm build
```

Expected: PASS and `nest build` exits 0.

- [ ] **Step 5: Commit backend behavior**

```bash
cd /Users/liulin/Desktop/font/english/nestjs
git add src/interface/recite/recite.service.spec.ts src/interface/recite/recite.service.ts
git commit -m "test: cover recite submit semantics"
```

---

### Task 2: Review Flow Pure Helpers

**Files:**
- Modify: `react-font/apps/english-world/src/page/englishWorld/recite/reviewExperience.ts`
- Modify: `react-font/apps/english-world/src/page/englishWorld/recite/reviewExperience.test.ts`

**Interfaces:**
- Consumes: `AnswerResult[]` from `@/server/recite/recite`
- Produces:
  - `getWrongWordIds(results: AnswerResult[]): number[]`
  - `orderResultsForReview(results: AnswerResult[]): AnswerResult[]`

- [ ] **Step 1: Write failing helper tests**

Add to `reviewExperience.test.ts`:

```ts
import type { AnswerResult } from "@/server/recite/recite";
import {
  getWrongWordIds,
  orderResultsForReview,
} from "./reviewExperience";

it("提取错词 id 并去重保序", () => {
  const results = [
    { wordId: 2, englishWord: "fragile", correctAnswer: "fragile", userAnswer: "", isCorrect: false },
    { wordId: 5, englishWord: "resilient", correctAnswer: "resilient", userAnswer: "resilient", isCorrect: true },
    { wordId: 2, englishWord: "fragile", correctAnswer: "fragile", userAnswer: "fragil", isCorrect: false },
  ] satisfies AnswerResult[];

  expect(getWrongWordIds(results)).toEqual([2]);
});

it("复盘时把错词排在正确词前面并保持组内顺序", () => {
  const results = [
    { wordId: 1, englishWord: "alpha", correctAnswer: "alpha", userAnswer: "alpha", isCorrect: true },
    { wordId: 2, englishWord: "beta", correctAnswer: "beta", userAnswer: "", isCorrect: false },
    { wordId: 3, englishWord: "gamma", correctAnswer: "gamma", userAnswer: "gamma", isCorrect: true },
    { wordId: 4, englishWord: "delta", correctAnswer: "delta", userAnswer: "del", isCorrect: false },
  ] satisfies AnswerResult[];

  expect(orderResultsForReview(results).map((item) => item.wordId)).toEqual([
    2, 4, 1, 3,
  ]);
});
```

- [ ] **Step 2: Run helper tests and verify failure**

Run:

```bash
cd /Users/liulin/Desktop/font/english/react-font
pnpm --filter @font/english-world exec vitest run src/page/englishWorld/recite/reviewExperience.test.ts
```

Expected: FAIL because the new helper exports do not exist.

- [ ] **Step 3: Add helper implementations**

Add to `reviewExperience.ts`:

```ts
import type { AnswerResult, Statistics } from "@/server/recite/recite";
```

Replace the existing `Statistics`-only import with `import type { AnswerResult, Statistics } from "@/server/recite/recite";`, then append:

```ts
export function getWrongWordIds(results: AnswerResult[]): number[] {
  const seen = new Set<number>();
  const wordIds: number[] = [];

  results.forEach((result) => {
    if (result.isCorrect || seen.has(result.wordId)) {
      return;
    }
    seen.add(result.wordId);
    wordIds.push(result.wordId);
  });

  return wordIds;
}

export function orderResultsForReview(
  results: AnswerResult[],
): AnswerResult[] {
  return [...results].sort((a, b) => {
    if (a.isCorrect === b.isCorrect) {
      return 0;
    }
    return a.isCorrect ? 1 : -1;
  });
}
```

- [ ] **Step 4: Run helper tests**

Run:

```bash
cd /Users/liulin/Desktop/font/english/react-font
pnpm --filter @font/english-world exec vitest run src/page/englishWorld/recite/reviewExperience.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit helper changes**

```bash
cd /Users/liulin/Desktop/font/english/react-font
git add apps/english-world/src/page/englishWorld/recite/reviewExperience.ts apps/english-world/src/page/englishWorld/recite/reviewExperience.test.ts
git commit -m "feat: add recite review helpers"
```

---

### Task 3: Frontend Short Review Loop

**Files:**
- Modify: `react-font/apps/english-world/src/page/englishWorld/recite/RecitePage.test.tsx`
- Modify: `react-font/apps/english-world/src/page/englishWorld/recite/RecitePage.tsx`

**Interfaces:**
- Consumes:
  - `getWrongWordIds(results: AnswerResult[]): number[]`
  - `orderResultsForReview(results: AnswerResult[]): AnswerResult[]`
  - `startRecite(params?: StartReciteParams)`
  - `submitAnswer(params: SubmitAnswerParams)`
- Produces: a focused short-review UI with wrong-word repair.

- [ ] **Step 1: Replace request mock with stateful recite API mock**

In `RecitePage.test.tsx`, change the mock setup to:

```ts
const startQuestions = [
  { wordId: 2, question: "脆弱的", direction: 0 },
  { wordId: 5, question: "有复原力的", direction: 0 },
];

const repairQuestions = [
  { wordId: 2, question: "脆弱的", direction: 0 },
];

const requestMock = vi.fn((requestConfig: unknown) => {
  const config = requestConfig as { url?: string; data?: any };
  if (config.url === "/recite/start") {
    const usesRepair = Array.isArray(config.data?.wordIds) &&
      config.data.wordIds.length === 1 &&
      config.data.wordIds[0] === 2;
    return Promise.resolve({
      questions: usesRepair ? repairQuestions : startQuestions,
      direction: 0,
      totalCount: usesRepair ? 1 : 2,
    });
  }
  if (config.url === "/recite/submit") {
    return Promise.resolve({
      sessionId: 91,
      results: [
        {
          wordId: 2,
          englishWord: "fragile",
          correctAnswer: "fragile",
          userAnswer: config.data?.answers?.[0]?.userAnswer ?? "",
          isCorrect: false,
        },
        {
          wordId: 5,
          englishWord: "resilient",
          correctAnswer: "resilient",
          userAnswer: config.data?.answers?.[1]?.userAnswer ?? "",
          isCorrect: true,
        },
      ],
      statistics: {
        totalCount: 2,
        correctCount: 1,
        errorCount: 1,
        accuracy: 50,
      },
    });
  }
  return Promise.resolve({});
});
```

- [ ] **Step 2: Write failing interaction tests**

Add these tests:

```ts
it("uses Enter to move through questions and submit the final answer", async () => {
  const user = userEvent.setup();

  render(
    <MemoryRouter initialEntries={["/englishWorld/recite"]}>
      <RecitePage />
    </MemoryRouter>,
  );

  await user.click(screen.getByRole("button", { name: /开始复习|开始今日复习/ }));
  expect(await screen.findByText("脆弱的")).toBeInTheDocument();

  await user.type(screen.getByLabelText("你的答案"), "fragil{enter}");
  expect(await screen.findByText("有复原力的")).toBeInTheDocument();

  await user.type(screen.getByLabelText("你的答案"), "resilient{enter}");

  await waitFor(() => {
    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/recite/submit",
        data: expect.objectContaining({
          answers: [
            { wordId: 2, userAnswer: "fragil" },
            { wordId: 5, userAnswer: "resilient" },
          ],
        }),
      }),
    );
  });
  expect(await screen.findByText("fragile")).toBeInTheDocument();
});

it("renders wrong results first and starts a repair session from failed word ids", async () => {
  const user = userEvent.setup();

  render(
    <MemoryRouter initialEntries={["/englishWorld/recite"]}>
      <RecitePage />
    </MemoryRouter>,
  );

  await user.click(screen.getByRole("button", { name: /开始复习|开始今日复习/ }));
  await user.type(await screen.findByLabelText("你的答案"), "fragil{enter}");
  await user.type(await screen.findByLabelText("你的答案"), "resilient{enter}");

  const resultItems = await screen.findAllByTestId("recite-result-item");
  expect(resultItems[0]).toHaveTextContent("fragile");
  expect(resultItems[0]).toHaveTextContent("错误");

  await user.click(screen.getByRole("button", { name: "再练错词" }));

  await waitFor(() => {
    expect(requestMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        url: "/recite/start",
        data: expect.objectContaining({
          wordIds: [2],
          wordCount: 1,
        }),
      }),
    );
  });
  expect(await screen.findByText("脆弱的")).toBeInTheDocument();
});

it("keeps answers visible when submit fails", async () => {
  requestMock.mockImplementationOnce((requestConfig: unknown) => {
    const config = requestConfig as { url?: string };
    if (config.url === "/recite/start") {
      return Promise.resolve({
        questions: startQuestions,
        direction: 0,
        totalCount: 2,
      });
    }
    return Promise.resolve({});
  });
  requestMock.mockImplementationOnce(() => Promise.reject(new Error("提交失败")));
  const user = userEvent.setup();

  render(
    <MemoryRouter initialEntries={["/englishWorld/recite"]}>
      <RecitePage />
    </MemoryRouter>,
  );

  await user.click(screen.getByRole("button", { name: /开始复习|开始今日复习/ }));
  await user.type(await screen.findByLabelText("你的答案"), "fragil{enter}");
  await user.type(await screen.findByLabelText("你的答案"), "resilient{enter}");

  expect(await screen.findByDisplayValue("resilient")).toBeInTheDocument();
});
```

- [ ] **Step 3: Run page tests and verify failure**

Run:

```bash
cd /Users/liulin/Desktop/font/english/react-font
pnpm --filter @font/english-world exec vitest run src/page/englishWorld/recite/RecitePage.test.tsx
```

Expected: FAIL because labels, wrong-first result ordering, or repair action are not wired yet.

- [ ] **Step 4: Wire repair helpers and result ordering**

In `RecitePage.tsx`, update imports:

```ts
import {
  createReviewProgress,
  createReviewResultInsight,
  createReviewCardState,
  getWrongWordIds,
  orderResultsForReview,
} from "./reviewExperience";
```

Add derived values:

```ts
const orderedResults = results ? orderResultsForReview(results.results) : [];
const wrongWordIds = results ? getWrongWordIds(results.results) : [];
```

Add repair starter:

```ts
const handleRepairWrongWords = useCallback(async () => {
  if (wrongWordIds.length === 0) {
    navigate("/englishWorld");
    return;
  }

  try {
    setLoading(true);
    setStatus("loading");
    const response = await request<StartReciteResponse>(
      startRecite({
        wordIds: wrongWordIds,
        wordCount: wrongWordIds.length,
        direction,
      }),
    );

    setQuestions(response.questions);
    setDirection(response.direction);
    setAnswers({});
    setResults(null);
    setCurrentIndex(0);
    setStatus("practicing");
    form.resetFields();
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "错词复习加载失败，请重试";
    message.error(errorMessage);
    setStatus("submitted");
  } finally {
    setLoading(false);
  }
}, [direction, form, navigate, wrongWordIds]);
```

- [ ] **Step 5: Make the answer input accessible and stable**

In the question form, use an explicit label and stable value:

```tsx
<Form.Item label={<Text strong>你的答案</Text>}>
  <Input
    aria-label="你的答案"
    key={currentQuestion.wordId}
    autoFocus
    placeholder="输入后按 Enter 进入下一题"
    size="large"
    value={answers[currentQuestion.wordId] || ""}
    onChange={(e) =>
      handleAnswerChange(currentQuestion.wordId, e.target.value)
    }
    onPressEnter={(e) => {
      e.preventDefault();
      if (cardState.canGoNext) {
        goNextQuestion();
      } else {
        handleSubmit();
      }
    }}
  />
</Form.Item>
```

- [ ] **Step 6: Render submitted results with wrong-first list and repair CTA**

Replace `results.results.map` with:

```tsx
{orderedResults.map((result, index) => (
  <div
    key={`${result.wordId}-${index}`}
    data-testid="recite-result-item"
    className={`recite-result-item ${
      result.isCorrect ? "recite-result-item-correct" : "recite-result-item-wrong"
    }`}
  >
    <div className="recite-result-item-head">
      <Text strong>{result.englishWord}</Text>
      {result.isCorrect ? (
        <Tag color="success" icon={<CheckOutlined />}>正确</Tag>
      ) : (
        <Tag color="error" icon={<CloseOutlined />}>错误</Tag>
      )}
    </div>
    <div className="recite-result-answer">
      <Text type="secondary">正确答案: </Text>
      <Text strong>{result.correctAnswer}</Text>
    </div>
    {!result.isCorrect && (
      <div className="recite-result-answer">
        <Text type="secondary">你的答案: </Text>
        <Text strong>{result.userAnswer || "(未填写)"}</Text>
      </div>
    )}
  </div>
))}
```

Use this CTA block:

```tsx
<Button
  type="primary"
  size="large"
  danger={wrongWordIds.length > 0}
  icon={wrongWordIds.length > 0 ? <ReloadOutlined /> : <CheckOutlined />}
  onClick={wrongWordIds.length > 0 ? handleRepairWrongWords : () => navigate("/englishWorld")}
  loading={loading}
>
  {wrongWordIds.length > 0 ? "再练错词" : "完成，回到今日路线"}
</Button>
<Button size="large" onClick={() => navigate("/englishWorld")}>
  回到今日路线
</Button>
```

- [ ] **Step 7: Run page tests**

Run:

```bash
cd /Users/liulin/Desktop/font/english/react-font
pnpm --filter @font/english-world exec vitest run src/page/englishWorld/recite/RecitePage.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit frontend loop behavior**

```bash
cd /Users/liulin/Desktop/font/english/react-font
git add apps/english-world/src/page/englishWorld/recite/RecitePage.tsx apps/english-world/src/page/englishWorld/recite/RecitePage.test.tsx
git commit -m "feat: add recite short review loop"
```

---

### Task 4: Visual Polish and Full Verification

**Files:**
- Modify: `react-font/apps/english-world/src/page/englishWorld/EnglishWorld.css`
- Modify: `react-font/apps/english-world/src/page/englishWorld/recite/RecitePage.tsx`

**Interfaces:**
- Consumes: class names from `RecitePage`
- Produces: compact, route-first recite surfaces that do not look like nested admin cards.

- [ ] **Step 1: Add semantic recite class names**

Wrap the page content with:

```tsx
<div className="recite-loop">
  ...
</div>
```

Use these class names on existing sections:

```tsx
<section className="recite-loop-topbar">...</section>
<section className="recite-intro-panel">...</section>
<section className="recite-question-panel">...</section>
<section className="recite-result-panel">...</section>
<div className="recite-progress-meta">...</div>
<div className="recite-prompt-card">...</div>
```

- [ ] **Step 2: Add CSS**

Append to `EnglishWorld.css`:

```css
.recite-loop {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 1040px;
}

.recite-loop-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.recite-loop-topbar h2.ant-typography {
  margin: 0;
}

.recite-intro-panel,
.recite-question-panel,
.recite-result-panel {
  border: 1px solid #dbe7ff;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 18px 48px rgba(37, 99, 235, 0.08);
}

.recite-progress-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: #64748b;
  font-size: 13px;
}

.recite-prompt-card {
  margin: 12px 0 24px;
  padding: 36px 28px;
  border-radius: 8px;
  background: #f8fafc;
  text-align: center;
}

.recite-result-item {
  padding: 14px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
}

.recite-result-item + .recite-result-item {
  margin-top: 10px;
}

.recite-result-item-wrong {
  border-color: #fecaca;
  background: #fff7f7;
}

.recite-result-item-correct {
  border-color: #bbf7d0;
  background: #f7fff9;
}

.recite-result-item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.recite-result-answer {
  margin-top: 4px;
}
```

- [ ] **Step 3: Run focused frontend tests**

Run:

```bash
cd /Users/liulin/Desktop/font/english/react-font
pnpm --filter @font/english-world exec vitest run src/page/englishWorld/recite/RecitePage.test.tsx src/page/englishWorld/recite/reviewExperience.test.ts src/page/englishWorld/recite/planReview.test.ts
```

Expected: PASS.

- [ ] **Step 4: Run production build**

Run:

```bash
cd /Users/liulin/Desktop/font/english/react-font
pnpm --filter @font/english-world build
```

Expected: PASS.

- [ ] **Step 5: Run backend verification**

Run:

```bash
cd /Users/liulin/Desktop/font/english/nestjs
pnpm test -- recite.service.spec.ts --runInBand
pnpm build
```

Expected: PASS.

- [ ] **Step 6: Commit visual polish**

```bash
cd /Users/liulin/Desktop/font/english/react-font
git add apps/english-world/src/page/englishWorld/EnglishWorld.css apps/english-world/src/page/englishWorld/recite/RecitePage.tsx
git commit -m "style: polish recite review loop"
```

- [ ] **Step 7: Capture browser screenshot**

Start services if needed:

```bash
cd /Users/liulin/Desktop/font/english/react-font
pnpm --filter @font/english-world dev -- --host 127.0.0.1 --port 5173
```

Open `/englishWorld/recite`, start a review, submit a session, and save screenshots for:

- idle state
- one-question answering state
- submitted mistake-first result state

Expected: no overlapping text, no sidebar overlap, no nested-card feel, primary repair CTA visible when wrong words exist.
