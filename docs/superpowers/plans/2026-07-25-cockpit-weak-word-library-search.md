# Cockpit Weak-Word Library Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every weak-word tag on the Today page open the word library with that word filled in and automatically searched.

**Architecture:** Carry the clicked word in the `englishWord` URL query parameter. The cockpit owns navigation, while the word-library page consumes the parameter, resets its form, and delegates the filtered request to the existing `useWordList.search` API.

**Tech Stack:** React 18, React Router 7, Ant Design 5, TypeScript 5.7, Vitest, Testing Library.

## Global Constraints

- Preserve all existing manual word-library filters, pagination, list/card views, and mobile behavior.
- Clear every other desktop word-library filter when opening a weak word.
- Ignore an absent or whitespace-only `englishWord` query parameter.
- Keep the query reproducible after refresh and usable with keyboard navigation.
- Do not add a backend endpoint or dependency.

---

### Task 1: Navigate from a weak-word tag

**Files:**
- Modify: `apps/english-world/src/page/englishWorld/cockpit/LearningCockpitPage.test.tsx`
- Modify: `apps/english-world/src/page/englishWorld/dailyCoach/CoachSummaryPanel.tsx`
- Modify: `apps/english-world/src/page/englishWorld/cockpit/LearningCockpitPage.tsx`

**Interfaces:**
- Consumes: `DailyCoachSummary.weakWords: LearningWord[]`
- Produces: `CoachSummaryPanelProps.onOpenWordLibrary?: (word: string) => void`
- Produces: `/englishWorld/words?englishWord=<encoded word>` navigation

- [ ] **Step 1: Write the failing navigation test**

Add this test to `LearningCockpitPage.test.tsx`:

```tsx
it("opens the word library and searches the clicked weak word", async () => {
  const user = userEvent.setup();
  requestMock.mockImplementation((requestConfig: unknown) => {
    const config = requestConfig as { url?: string };
    if (config.url === "/daily-coach/summary") {
      return Promise.resolve({
        totalWords: 2,
        todayNewWords: 0,
        reciteAccuracy: 50,
        levelDistribution: [],
        weakWords: [
          { id: 1, word: "urban farming", level: 0 },
          { id: 2, word: "culinary", level: 1 },
        ],
        suggestedActions: [],
      } as never);
    }
    if (config.url === "/memory-map/overview") {
      return Promise.resolve({
        levels: [],
        dueWords: [],
        weakWords: [],
        recentMistakes: [],
        streakLikeStats: { recentSessions: 0, recentAccuracy: 0 },
      } as never);
    }
    return Promise.reject(new Error("offline"));
  });

  render(
    <MemoryRouter initialEntries={["/englishWorld"]}>
      <LearningCockpitPage />
      <LocationProbe />
    </MemoryRouter>,
  );

  await user.click(
    await screen.findByRole("button", {
      name: "在词库中查询 urban farming",
    }),
  );

  expect(screen.getByTestId("location")).toHaveTextContent(
    "/englishWorld/words?englishWord=urban+farming",
  );

  const culinaryButton = screen.getByRole("button", {
    name: "在词库中查询 culinary",
  });
  culinaryButton.focus();
  await user.keyboard(" ");

  expect(screen.getByTestId("location")).toHaveTextContent(
    "/englishWorld/words?englishWord=culinary",
  );
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
pnpm --filter @font/english-world test --run src/page/englishWorld/cockpit/LearningCockpitPage.test.tsx
```

Expected: FAIL because no button named `在词库中查询 urban farming` exists.

- [ ] **Step 3: Implement accessible weak-word navigation**

Extend the props and weak-word rendering in `CoachSummaryPanel.tsx`:

```tsx
type CoachSummaryPanelProps = {
  summary: DailyCoachSummary;
  onStartReview?: (action?: DailyCoachAction) => void;
  onOpenContextLab?: (action?: DailyCoachAction) => void;
  onOpenWordLibrary?: (word: string) => void;
};
```

Destructure `onOpenWordLibrary`, then replace each weak-word tag with an
accessible interactive tag:

```tsx
<Tag
  key={word.id}
  color={word.level === 0 ? "red" : "orange"}
  role="button"
  tabIndex={0}
  aria-label={`在词库中查询 ${word.word}`}
  onClick={() => onOpenWordLibrary?.(word.word)}
  onKeyDown={(event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpenWordLibrary?.(word.word);
    }
  }}
  style={{ cursor: "pointer" }}
>
  {word.word}
</Tag>
```

Add the callback and prop in `LearningCockpitPage.tsx`:

```tsx
const openWordLibrary = (word: string) => {
  const search = new URLSearchParams({ englishWord: word });
  navigate(`/englishWorld/words?${search.toString()}`);
};
```

```tsx
<CoachSummaryPanel
  summary={coachSummary}
  onStartReview={openReview}
  onOpenContextLab={openContextLab}
  onOpenWordLibrary={openWordLibrary}
/>
```

- [ ] **Step 4: Run the navigation test and verify GREEN**

Run:

```bash
pnpm --filter @font/english-world test --run src/page/englishWorld/cockpit/LearningCockpitPage.test.tsx
```

Expected: all tests in the file PASS.

- [ ] **Step 5: Commit the navigation slice**

```bash
git add apps/english-world/src/page/englishWorld/cockpit/LearningCockpitPage.test.tsx apps/english-world/src/page/englishWorld/dailyCoach/CoachSummaryPanel.tsx apps/english-world/src/page/englishWorld/cockpit/LearningCockpitPage.tsx
git commit -m "feat(english-world): link weak words to library"
```

### Task 2: Consume the word query in the library

**Files:**
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.test.tsx`
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.tsx`
- Modify: `apps/english-world/src/page/englishWorld/hooks/useWordList.ts`

**Interfaces:**
- Consumes: `location.search` with optional `englishWord`
- Consumes: `search(filters: Record<string, unknown>): Promise<void>` from `useWordList`
- Produces: a reset form with `{ englishWord: string }` and a filtered `/english/filterWordList` request

- [ ] **Step 1: Write the failing automatic-search test**

Add this test to `EnglishWorld.test.tsx`:

```tsx
it("fills and automatically searches the word from the URL", async () => {
  render(
    <MemoryRouter
      initialEntries={[
        "/englishWorld/words?englishWord=urban+farming",
      ]}
    >
      <EnglishWorld />
    </MemoryRouter>,
  );

  expect(await screen.findByRole("textbox", { name: "英文" })).toHaveValue(
    "urban farming",
  );

  await waitFor(() => {
    const filterCalls = requestMock.mock.calls.filter(
      ([config]) => config.url === "/english/filterWordList",
    );
    expect(filterCalls.at(-1)?.[0]).toEqual({
      url: "/english/filterWordList",
      method: "POST",
      data: {
        englishWord: "urban farming",
        page: 1,
        pageSize: 10,
      },
    });
  });

  expect(screen.getByRole("textbox", { name: "中文" })).toHaveValue("");
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
pnpm --filter @font/english-world test --run src/page/englishWorld/EnglishWorld.test.tsx
```

Expected: FAIL because the English input remains empty and the final filter request has no `englishWord`.

- [ ] **Step 3: Implement URL-driven form reset and search**

First make `search` referentially stable in `useWordList.ts`:

```tsx
const search = useCallback(async (filters: Record<string, unknown>) => {
  setQueryState((current) => ({
    ...current,
    page: 1,
    filters,
    revision: current.revision + 1,
  }));
}, []);
```

Then, in `EnglishWorld.tsx`, derive the query value after `activeNav`:

```tsx
const libraryWordQuery =
  new URLSearchParams(location.search).get("englishWord")?.trim() ?? "";
```

Add an effect after the legacy-hash effect:

```tsx
useEffect(() => {
  if (activeNav !== "words" || !libraryWordQuery) {
    return;
  }

  setSelectedCardIds([]);
  form.resetFields();
  form.setFieldValue("englishWord", libraryWordQuery);
  void search({ englishWord: libraryWordQuery });
}, [activeNav, form, libraryWordQuery, search]);
```

- [ ] **Step 4: Run both focused test files and verify GREEN**

Run:

```bash
pnpm --filter @font/english-world test --run src/page/englishWorld/EnglishWorld.test.tsx src/page/englishWorld/cockpit/LearningCockpitPage.test.tsx
```

Expected: both test files PASS with zero failures.

- [ ] **Step 5: Run project verification**

Run:

```bash
pnpm --filter @font/english-world test --run
pnpm --filter @font/english-world lint
pnpm --filter @font/english-world build
```

Expected: Vitest reports zero failures, ESLint exits 0, and TypeScript/Vite build exits 0.

- [ ] **Step 6: Commit the library slice**

```bash
git add apps/english-world/src/page/englishWorld/EnglishWorld.test.tsx apps/english-world/src/page/englishWorld/EnglishWorld.tsx apps/english-world/src/page/englishWorld/hooks/useWordList.ts docs/superpowers/plans/2026-07-25-cockpit-weak-word-library-search.md
git commit -m "feat(english-world): auto-search linked weak word"
```
