# Word Library Batch Context Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users select 3–20 word cards, configure IELTS band and model in a modal, create one Context Lab task, and land on that task's live generation status.

**Architecture:** The word-library page calls the existing `contextLabCreateTask` request builder with `sourceType: "custom"`, then navigates to a source-qualified task URL. Context Lab treats `source=word-library` as a focused-task entry, loads and inserts that task without opening the existing source-article modal, and lets the current SSE subscription update it.

**Tech Stack:** React 18, TypeScript 5.7, Ant Design 5, React Router 7, Vitest + Testing Library, Cypress 15, pnpm.

## Global Constraints

- Only the word-library card batch mode receives this entry; the list view remains unchanged.
- A standard custom Context Lab task requires 3–20 selected words.
- IELTS band accepts 5–9 in 0.5 increments and defaults to 7.
- Model accepts `deepseek` or `gpt` and defaults to `deepseek`.
- Reuse `POST /context-lab/generate-task`; do not change backend code or database schema.
- Successful creation navigates to `/englishWorld/context-lab?source=word-library&taskId=<taskId>`.
- Existing `taskId` links without `source=word-library` must continue opening the source-article preview.
- A failed create request must keep the modal, word selection, IELTS band, and model intact.
- Do not retain card selection across page changes, view changes, or exiting batch mode.

---

## File Structure

- Modify `apps/english-world/src/page/englishWorld/EnglishWorld.tsx`: own batch-generation modal state, validate selection, create the task, and navigate.
- Modify `apps/english-world/src/page/englishWorld/EnglishWorld.test.tsx`: verify limits, payload, duplicate-submit protection, failure preservation, and navigation.
- Modify `apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.tsx`: parse the word-library entry, load/insert/focus the task, preserve it across history refreshes, and render active status.
- Modify `apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.test.tsx`: verify focused-task entry, SSE completion, and source-preview compatibility.
- Modify `apps/english-world/src/page/englishWorld/EnglishWorld.css`: style the batch modal word list and focused active-task banner.
- Create `apps/english-world/cypress/e2e/word-library-batch-context-lab.cy.ts`: cover the browser flow from card selection through focused pending task.

No new production module is needed: the existing page-owned modal pattern, API builders, task status utilities, and task-event subscription already provide the required boundaries.

---

### Task 1: Create Context Lab tasks from card batch mode

**Files:**
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.tsx:1-77,100-130,383-485,926-956,986-1045`
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.test.tsx:1-15,500-650`
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.css:1577-1608`

**Interfaces:**
- Consumes: `contextLabCreateTask(data: ContextLabGenerateParams): YTRequest<ContextLabTask>` from `./server/learning`.
- Consumes: `DEFAULT_IELTS_BAND`, `DEFAULT_CONTEXT_LAB_MODEL_PROVIDER`, `IELTS_BAND_MIN`, `IELTS_BAND_MAX`, `IELTS_BAND_STEP`, and `normalizeIeltsBand` from `./contextLab/contextLabPlanning`.
- Produces: navigation URL `/englishWorld/context-lab?source=word-library&taskId=<positive integer>` for Task 2.
- Produces: modal labels `生成语境练习`, `所选单词`, `雅思分数等级`, `生成模型`, and `开始生成` used by unit and Cypress tests.

- [ ] **Step 1: Add test helpers for routing and word fixtures**

Change the router import and add a location probe near the existing hoisted mocks:

```tsx
import { MemoryRouter, useLocation } from "react-router-dom";

function LocationProbe() {
  const location = useLocation();
  return (
    <div data-testid="location">{`${location.pathname}${location.search}`}</div>
  );
}

function makeWordList(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    englishWord: `word-${index + 1}`,
    englishType: 0,
    englishLevel: index % 4,
  }));
}
```

- [ ] **Step 2: Write failing selection-boundary tests**

Import `message` from Ant Design and add these tests after the existing card batch tests:

```tsx
it("requires at least three cards before opening batch context generation", async () => {
  const user = userEvent.setup();
  requestMock.mockResolvedValue({
    list: makeWordList(2),
    total: 2,
    totalPages: 1,
  });

  render(
    <MemoryRouter initialEntries={["/englishWorld/words"]}>
      <EnglishWorld />
    </MemoryRouter>,
  );

  await user.click(screen.getByText("卡片"));
  await screen.findByText("word-1");
  await user.click(screen.getByRole("button", { name: "批量管理" }));
  await user.click(screen.getByRole("button", { name: "全选当前页" }));

  expect(
    screen.getByRole("button", { name: "生成语境题" }),
  ).toBeDisabled();
  expect(screen.queryByRole("dialog", { name: "生成语境练习" })).toBeNull();
});

it("rejects more than twenty selected cards without opening the modal", async () => {
  const user = userEvent.setup();
  const warningSpy = vi
    .spyOn(message, "warning")
    .mockImplementation(() => undefined as never);
  requestMock.mockResolvedValue({
    list: makeWordList(21),
    total: 21,
    totalPages: 1,
  });

  render(
    <MemoryRouter initialEntries={["/englishWorld/words"]}>
      <EnglishWorld />
    </MemoryRouter>,
  );

  await user.click(screen.getByText("卡片"));
  await screen.findByText("word-1");
  await user.click(screen.getByRole("button", { name: "批量管理" }));
  await user.click(screen.getByRole("button", { name: "全选当前页" }));
  await user.click(screen.getByRole("button", { name: "生成语境题" }));

  expect(warningSpy).toHaveBeenCalledWith(
    "每次最多选择 20 个词，请减少选择",
  );
  expect(screen.queryByRole("dialog", { name: "生成语境练习" })).toBeNull();
  expect(
    requestMock.mock.calls.filter(
      ([config]) => config.url === "/context-lab/generate-task",
    ),
  ).toHaveLength(0);
});
```

- [ ] **Step 3: Run the boundary tests and verify failure**

Run:

```bash
pnpm --filter @font/english-world exec vitest run apps/english-world/src/page/englishWorld/EnglishWorld.test.tsx -t "requires at least three|rejects more than twenty"
```

Expected: FAIL because no `生成语境题` button exists.

- [ ] **Step 4: Add modal state, selection derivation, and boundary handlers**

Extend imports in `EnglishWorld.tsx`:

```tsx
import React, { useEffect, useRef, useState } from "react";
import {
  Button,
  Checkbox,
  DatePicker,
  Dropdown,
  Empty,
  Form,
  Image,
  Input,
  InputNumber,
  message,
  Modal,
  Pagination,
  Segmented,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { contextLabCreateTask, contextLabDetail } from "./server/learning";
import type {
  ContextLabModelProvider,
  ContextLabTask,
} from "./types/learning";
import {
  DEFAULT_CONTEXT_LAB_MODEL_PROVIDER,
  DEFAULT_IELTS_BAND,
  IELTS_BAND_MAX,
  IELTS_BAND_MIN,
  IELTS_BAND_STEP,
  normalizeIeltsBand,
} from "./contextLab/contextLabPlanning";
import {
  AppstoreOutlined,
  BarsOutlined,
  DownOutlined,
  ExperimentOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  MoreOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  NodeIndexOutlined,
  TranslationOutlined,
  UpOutlined,
} from "@ant-design/icons";
```

Add state beside the existing batch state:

```tsx
const [batchContextModalOpen, setBatchContextModalOpen] = useState(false);
const [batchContextCreating, setBatchContextCreating] = useState(false);
const [batchContextIeltsBand, setBatchContextIeltsBand] = useState<
  number | null
>(DEFAULT_IELTS_BAND);
const [batchContextModelProvider, setBatchContextModelProvider] =
  useState<ContextLabModelProvider>(DEFAULT_CONTEXT_LAB_MODEL_PROVIDER);
const batchContextCreateInFlightRef = useRef(false);
```

Derive records in page order and add the open handler after `handleSelectCurrentPage`:

```tsx
const selectedCardRecords = wordList.filter((word) =>
  selectedCardIds.includes(word.id),
);

const handleOpenBatchContextLab = () => {
  if (selectedCardRecords.length > 20) {
    message.warning("每次最多选择 20 个词，请减少选择");
    return;
  }
  if (selectedCardRecords.length < 3) return;

  setBatchContextIeltsBand(DEFAULT_IELTS_BAND);
  setBatchContextModelProvider(DEFAULT_CONTEXT_LAB_MODEL_PROVIDER);
  setBatchContextModalOpen(true);
};
```

Add the toolbar action before `批量设为`:

```tsx
<Tooltip
  title={selectedCardRecords.length < 3 ? "至少选择 3 个词" : undefined}
>
  <span>
    <Button
      aria-label="生成语境题"
      disabled={selectedCardRecords.length < 3 || batchContextCreating}
      icon={<ExperimentOutlined aria-hidden="true" />}
      type="primary"
      onClick={handleOpenBatchContextLab}
    >
      生成语境题
    </Button>
  </span>
</Tooltip>
<span>批量设为</span>
```

Render the modal before the existing source-preview modal:

```tsx
<Modal
  cancelButtonProps={{ disabled: batchContextCreating }}
  cancelText="取消"
  closable={!batchContextCreating}
  confirmLoading={batchContextCreating}
  destroyOnHidden={false}
  maskClosable={!batchContextCreating}
  okText="开始生成"
  open={batchContextModalOpen}
  title="生成语境练习"
  onCancel={() => setBatchContextModalOpen(false)}
  onOk={() => void handleCreateBatchContextLab()}
>
  <Space className="word-batch-context-lab-modal" direction="vertical" size={16}>
    <div>
      <Text strong>所选单词</Text>
      <Text type="secondary">已选 {selectedCardRecords.length}/20</Text>
    </div>
    <div className="word-batch-context-lab-words">
      {selectedCardRecords.map((word) => (
        <Tag color="blue" key={word.id}>{word.englishWord}</Tag>
      ))}
    </div>
    <Space direction="vertical" size={6}>
      <Text>生成模型</Text>
      <Segmented
        aria-label="生成模型"
        options={[
          { label: "DeepSeek", value: "deepseek" },
          { label: "GPT-5.6", value: "gpt" },
        ]}
        value={batchContextModelProvider}
        onChange={(value) =>
          setBatchContextModelProvider(value as ContextLabModelProvider)
        }
      />
    </Space>
    <Space direction="vertical" size={6}>
      <Text>雅思分数等级</Text>
      <InputNumber
        aria-label="雅思分数等级"
        max={IELTS_BAND_MAX}
        min={IELTS_BAND_MIN}
        step={IELTS_BAND_STEP}
        value={batchContextIeltsBand}
        onBlur={() =>
          setBatchContextIeltsBand(normalizeIeltsBand(batchContextIeltsBand))
        }
        onChange={(value) => setBatchContextIeltsBand(value)}
      />
    </Space>
  </Space>
</Modal>
```

Declare the boundary-only handler so the modal compiles before creation behavior is added:

```tsx
const handleCreateBatchContextLab = async () => {
  if (batchContextCreateInFlightRef.current) return;
};
```

- [ ] **Step 5: Run the boundary tests and verify they pass**

Run the command from Step 3.

Expected: PASS for both boundary tests.

- [ ] **Step 6: Write failing creation, navigation, and failure-preservation tests**

Add these tests after the boundary tests:

```tsx
it("creates one configured custom task and navigates to its focused status", async () => {
  const user = userEvent.setup();
  const words = makeWordList(3);
  let resolveTask: ((value: unknown) => void) | undefined;
  requestMock.mockImplementation((config: { url?: string }) => {
    if (config.url === "/context-lab/generate-task") {
      return new Promise((resolve) => {
        resolveTask = resolve;
      });
    }
    return Promise.resolve({ list: words, total: 3, totalPages: 1 });
  });

  render(
    <MemoryRouter initialEntries={["/englishWorld/words"]}>
      <EnglishWorld />
      <LocationProbe />
    </MemoryRouter>,
  );

  await user.click(screen.getByText("卡片"));
  await screen.findByText("word-1");
  await user.click(screen.getByRole("button", { name: "批量管理" }));
  await user.click(screen.getByRole("button", { name: "全选当前页" }));
  await user.click(screen.getByRole("button", { name: "生成语境题" }));

  const dialog = screen.getByRole("dialog", { name: "生成语境练习" });
  expect(within(dialog).getByText("已选 3/20")).toBeInTheDocument();
  await user.click(within(dialog).getByText("GPT-5.6"));
  const band = within(dialog).getByRole("spinbutton", {
    name: "雅思分数等级",
  });
  await user.clear(band);
  await user.type(band, "7.5");
  await user.click(within(dialog).getByRole("button", { name: "开始生成" }));
  await user.click(within(dialog).getByRole("button", { name: "开始生成" }));

  await waitFor(() => {
    expect(
      requestMock.mock.calls.filter(
        ([config]) => config.url === "/context-lab/generate-task",
      ),
    ).toHaveLength(1);
  });
  expect(requestMock).toHaveBeenCalledWith({
    url: "/context-lab/generate-task",
    method: "POST",
    data: {
      sourceType: "custom",
      words: ["word-1", "word-2", "word-3"],
      ieltsBand: 7.5,
      modelProvider: "gpt",
    },
    __responseType: undefined,
  });

  resolveTask?.({
    id: 44,
    taskId: 44,
    status: "pending",
    sourceType: "custom",
    words: ["word-1", "word-2", "word-3"],
  });

  await waitFor(() => {
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/englishWorld/context-lab?source=word-library&taskId=44",
    );
  });
});

it("keeps the batch modal and configuration after task creation fails", async () => {
  const user = userEvent.setup();
  const errorSpy = vi
    .spyOn(message, "error")
    .mockImplementation(() => undefined as never);
  const words = makeWordList(3);
  requestMock.mockImplementation((config: { url?: string }) =>
    config.url === "/context-lab/generate-task"
      ? Promise.reject(new Error("AI 服务暂不可用"))
      : Promise.resolve({ list: words, total: 3, totalPages: 1 }),
  );

  render(
    <MemoryRouter initialEntries={["/englishWorld/words"]}>
      <EnglishWorld />
    </MemoryRouter>,
  );

  await user.click(screen.getByText("卡片"));
  await screen.findByText("word-1");
  await user.click(screen.getByRole("button", { name: "批量管理" }));
  await user.click(screen.getByRole("button", { name: "全选当前页" }));
  await user.click(screen.getByRole("button", { name: "生成语境题" }));
  const dialog = screen.getByRole("dialog", { name: "生成语境练习" });
  await user.click(within(dialog).getByText("GPT-5.6"));
  await user.click(within(dialog).getByRole("button", { name: "开始生成" }));

  await waitFor(() => {
    expect(errorSpy).toHaveBeenCalledWith("AI 服务暂不可用");
  });
  expect(screen.getByRole("dialog", { name: "生成语境练习" })).toBeVisible();
  expect(screen.getByText("已选 3/20")).toBeInTheDocument();
  expect(screen.getByText("GPT-5.6").closest(".ant-segmented-item")).toHaveClass(
    "ant-segmented-item-selected",
  );
});
```

- [ ] **Step 7: Run the creation tests and verify failure**

Run:

```bash
pnpm --filter @font/english-world exec vitest run apps/english-world/src/page/englishWorld/EnglishWorld.test.tsx -t "creates one configured|keeps the batch modal"
```

Expected: FAIL because the temporary create handler neither calls the API nor navigates.

- [ ] **Step 8: Implement guarded task creation**

Replace the temporary handler with:

```tsx
const handleCreateBatchContextLab = async () => {
  if (
    batchContextCreateInFlightRef.current ||
    selectedCardRecords.length < 3 ||
    selectedCardRecords.length > 20
  ) {
    return;
  }

  batchContextCreateInFlightRef.current = true;
  setBatchContextCreating(true);
  try {
    const task = await request<ContextLabTask>(
      contextLabCreateTask({
        sourceType: "custom",
        words: selectedCardRecords.map((record) => record.englishWord),
        ieltsBand: normalizeIeltsBand(batchContextIeltsBand),
        modelProvider: batchContextModelProvider,
      }),
    );
    setBatchContextModalOpen(false);
    setSelectedCardIds([]);
    message.success("语境练习任务已提交");
    navigate(
      `/englishWorld/context-lab?source=word-library&taskId=${task.taskId}`,
    );
  } catch (error: unknown) {
    message.error(error instanceof Error ? error.message : "任务提交失败");
  } finally {
    batchContextCreateInFlightRef.current = false;
    setBatchContextCreating(false);
  }
};
```

The synchronous ref guard closes the gap before React commits `batchContextCreating`; the modal loading state then supplies visible feedback and disables further interaction.

- [ ] **Step 9: Add modal layout styles**

Append near the batch toolbar styles:

```css
.word-batch-context-lab-modal {
  width: 100%;
}

.word-batch-context-lab-modal > div:first-child {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.word-batch-context-lab-words {
  display: flex;
  max-height: 156px;
  flex-wrap: wrap;
  gap: 8px;
  overflow-y: auto;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
}

.word-batch-context-lab-words .ant-tag {
  margin: 0;
}
```

Keep the existing toolbar wrapping behavior; do not add a list-view button.

- [ ] **Step 10: Run the full word-library unit test file**

Run:

```bash
pnpm --filter @font/english-world exec vitest run apps/english-world/src/page/englishWorld/EnglishWorld.test.tsx
```

Expected: PASS, including the existing mastery batch tests.

- [ ] **Step 11: Commit Task 1**

```bash
git add apps/english-world/src/page/englishWorld/EnglishWorld.tsx apps/english-world/src/page/englishWorld/EnglishWorld.test.tsx apps/english-world/src/page/englishWorld/EnglishWorld.css
git commit -m "feat(english-world): create context tasks from word batch"
```

---

### Task 2: Focus and live-update a word-library task in Context Lab

**Files:**
- Modify: `apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.tsx:369-520,612-717,808-867,2240-2310`
- Modify: `apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.test.tsx:1-80,600-680`
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.css:3697-3734`

**Interfaces:**
- Consumes: URL `/englishWorld/context-lab?source=word-library&taskId=<positive integer>` from Task 1.
- Consumes: `contextLabDetail({ taskId })`, `ContextLabTask`, `isContextLabTaskActive`, and `subscribeContextLabTaskEvents`.
- Produces: `aria-label="批量生成任务状态"` while the focused task is `pending` or `processing`.
- Produces: a selected history item for the focused task and the existing `开始练习` action after an SSE `succeeded` event.

- [ ] **Step 1: Write the failing focused-entry and SSE test**

Add this test before the existing source-preview deep-link test:

```tsx
it("focuses a word-library task without opening source preview and follows SSE", async () => {
  requestMock.mockImplementation((config) => {
    if (config.url === "/context-lab/history") {
      return Promise.resolve({ list: [], total: 0, page: 1, pageSize: 10 });
    }
    if (config.url === "/context-lab/detail") {
      return Promise.resolve({
        id: 44,
        taskId: 44,
        status: "pending",
        sourceType: "custom",
        words: ["word-1", "word-2", "word-3"],
      });
    }
    return Promise.resolve({});
  });

  render(
    <MemoryRouter
      initialEntries={[
        "/englishWorld/context-lab?source=word-library&taskId=44",
      ]}
    >
      <ContextLabPage />
    </MemoryRouter>,
  );

  expect(
    await screen.findByRole("region", { name: "批量生成任务状态" }),
  ).toHaveTextContent("等待回调");
  expect(screen.queryByRole("dialog", { name: /单词来源文章/ })).toBeNull();
  expect(screen.getByText("word-1 / word-2 / word-3").closest("article"))
    .toHaveClass("context-lab-history-item-selected");

  act(() => {
    taskEventHandler?.({
      id: 44,
      taskId: 44,
      status: "succeeded",
      sourceType: "custom",
      words: ["word-1", "word-2", "word-3"],
      article: "A generated article.",
      questions: [
        {
          id: "q1",
          stem: "What is the article about?",
          options: ["Words", "Numbers", "Weather", "Travel"],
        },
      ],
    });
  });

  await waitFor(() => {
    expect(
      screen.queryByRole("region", { name: "批量生成任务状态" }),
    ).toBeNull();
  });
  expect(screen.getByRole("button", { name: "开始练习" })).toBeVisible();
});

it("keeps Context Lab usable when a focused word-library task is unavailable", async () => {
  const warningSpy = vi
    .spyOn(message, "warning")
    .mockImplementation(() => undefined as never);
  requestMock.mockImplementation((config) =>
    config.url === "/context-lab/detail"
      ? Promise.reject(new Error("not found"))
      : Promise.resolve({ list: [], total: 0, page: 1, pageSize: 10 }),
  );

  render(
    <MemoryRouter
      initialEntries={[
        "/englishWorld/context-lab?source=word-library&taskId=404",
      ]}
    >
      <ContextLabPage />
    </MemoryRouter>,
  );

  await waitFor(() => {
    expect(warningSpy).toHaveBeenCalledWith(
      "目标语境任务无法加载，请在练习包列表中查看",
    );
  });
  expect(screen.getByRole("main", { name: "练习包管理" })).toBeVisible();
  expect(screen.queryByRole("dialog", { name: /单词来源文章/ })).toBeNull();
});
```

The existing test `opens a referenced article as source preview without starting practice` remains the regression assertion for links without `source=word-library`.

- [ ] **Step 2: Run the focused-entry test and verify failure**

Run:

```bash
pnpm --filter @font/english-world exec vitest run apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.test.tsx -t "focuses a word-library task|focused word-library task is unavailable"
```

Expected: FAIL because the current `taskId` effect opens the source-preview modal and no active status region exists.

- [ ] **Step 3: Parse a strict positive word-library task ID**

Add this memo beside `microTaskId`:

```tsx
const wordLibraryTaskId = useMemo(() => {
  const params = new URLSearchParams(initialSearch);
  if (params.get("source") !== "word-library") return null;
  const value = Number(params.get("taskId"));
  return Number.isInteger(value) && value > 0 ? value : null;
}, [initialSearch]);
```

This parser intentionally rejects zero, negative, fractional, missing, and non-numeric task IDs.

- [ ] **Step 4: Preserve the focused task during history refreshes**

Replace `setHistory(nextHistory)` inside `loadHistory` with:

```tsx
setHistory((previousHistory) => {
  if (!wordLibraryTaskId) return nextHistory;
  const focusedTask = previousHistory.find(
    (task) => task.taskId === wordLibraryTaskId,
  );
  if (
    !focusedTask ||
    nextHistory.some((task) => task.taskId === wordLibraryTaskId)
  ) {
    return nextHistory;
  }
  return [focusedTask, ...nextHistory].slice(0, 10);
});
```

This handles both races: detail resolving before history and detail resolving after history.

- [ ] **Step 5: Add the focused-task loading effect**

Insert this effect before the existing source-reference effect:

```tsx
useEffect(() => {
  if (microEntry || !wordLibraryTaskId) return;

  let cancelled = false;
  void request<ContextLabTask>({
    ...contextLabDetail({ taskId: wordLibraryTaskId }),
    config: { suppressErrorMessage: true },
  })
    .then((task) => {
      if (cancelled) return;
      setHistory((previousHistory) => [
        task,
        ...previousHistory.filter((item) => item.taskId !== task.taskId),
      ].slice(0, 10));
      setCurrentTask(task);
      setAnswers({});
      setResults([]);
      setSubmitSummary(null);
      setElapsedSeconds(0);
      setHighlightWord("");
      setSourcePreviewFullscreen(false);
      setSourcePreviewOpen(false);
      setPracticeFullscreen(false);
      setPracticeModalOpen(false);
    })
    .catch(() => {
      if (!cancelled) {
        message.warning("目标语境任务无法加载，请在练习包列表中查看");
      }
    });

  return () => {
    cancelled = true;
  };
}, [microEntry, wordLibraryTaskId]);
```

Add `if (wordLibraryTaskId) return;` near the top of the existing source-reference effect and include `wordLibraryTaskId` in that effect's dependency array. This keeps legacy `taskId` links unchanged while preventing the source modal for the new entry.

- [ ] **Step 6: Render the active task status above history**

After the history search strip and before `historyLoading`, add:

```tsx
{currentTask &&
  wordLibraryTaskId === currentTask.taskId &&
  isContextLabTaskActive(currentTask.status) && (
    <section
      aria-label="批量生成任务状态"
      className="context-lab-word-library-task-status"
    >
      {renderTaskStatus(currentTask)}
    </section>
  )}
```

The existing SSE callback already merges matching history and `currentTask` records. Therefore a `succeeded` event removes this active-only banner and changes the history card to its existing `开始练习` state without a second subscription.

- [ ] **Step 7: Add compact active-status styles**

Place these rules after `.context-lab-task-status` styles, rather than reusing the old full-height `.context-lab-active-status` class:

```css
.context-lab-word-library-task-status {
  margin: 12px 0;
}

.context-lab-word-library-task-status > .context-lab-task-status {
  margin: 0;
  border-color: #bfdbfe;
  background: #eff6ff;
}
```

- [ ] **Step 8: Run focused-entry and legacy-source tests**

Run:

```bash
pnpm --filter @font/english-world exec vitest run apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.test.tsx -t "focuses a word-library task|opens a referenced article"
```

Expected: PASS for the new focused entry and the existing source-preview link.

- [ ] **Step 9: Run the complete Context Lab unit test file**

Run:

```bash
pnpm --filter @font/english-world exec vitest run apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.test.tsx
```

Expected: PASS with no changes to cockpit prefill, micro mode, history, practice, attempts, or source preview behavior.

- [ ] **Step 10: Commit Task 2**

```bash
git add apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.tsx apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.test.tsx apps/english-world/src/page/englishWorld/EnglishWorld.css
git commit -m "feat(context-lab): focus word-library batch tasks"
```

---

### Task 3: Cover the browser flow and run release verification

**Files:**
- Create: `apps/english-world/cypress/e2e/word-library-batch-context-lab.cy.ts`

**Interfaces:**
- Consumes: the accessible labels and URL produced by Tasks 1 and 2.
- Produces: a deterministic browser acceptance check for selection, configuration, request payload, navigation, and pending status.

- [ ] **Step 1: Write the Cypress scenario**

Create the file with this complete scenario:

```ts
describe("word-library batch Context Lab generation", () => {
  const words = ["fragile", "resilient", "steady"].map((englishWord, index) => ({
    id: index + 101,
    englishWord,
    englishType: 0,
    englishChinese: `释义 ${index + 1}`,
    englishLevel: index,
    englishPartSpeech: [0],
  }));

  it("creates and focuses a configured pending task", () => {
    cy.intercept("POST", "/api/user/getCurrentUser", {
      code: 200,
      message: "ok",
      data: { id: 1, username: "tester" },
    }).as("currentUser");
    cy.intercept("POST", "/api/config/getAll", {
      code: 200,
      message: "ok",
      data: {},
    });
    cy.intercept("POST", "/api/english/filterWordList", {
      code: 200,
      message: "ok",
      data: { list: words, total: 3, totalPages: 1 },
    }).as("wordList");

    const pendingTask = {
      id: 44,
      taskId: 44,
      status: "pending",
      sourceType: "custom",
      words: ["fragile", "resilient", "steady"],
    };
    cy.intercept("POST", "**/context-lab/generate-task", (request) => {
      expect(request.body).to.deep.equal({
        sourceType: "custom",
        words: ["fragile", "resilient", "steady"],
        ieltsBand: 7.5,
        modelProvider: "gpt",
      });
      request.reply({ code: 200, message: "ok", data: pendingTask });
    }).as("createContextTask");
    cy.intercept("POST", "**/context-lab/history", {
      code: 200,
      message: "ok",
      data: { list: [pendingTask], total: 1, page: 1, pageSize: 10 },
    }).as("contextHistory");
    cy.intercept("POST", "**/context-lab/detail", {
      code: 200,
      message: "ok",
      data: pendingTask,
    }).as("contextDetail");
    cy.intercept("GET", "**/context-lab/task-events", {
      statusCode: 200,
      body: "",
    });

    cy.visit("/englishWorld/words");
    cy.wait("@currentUser");
    cy.wait("@wordList");
    cy.contains("卡片").click();
    cy.contains("button", "批量管理").click();
    cy.contains("button", "全选当前页").click();
    cy.contains("button", "生成语境题").click();

    cy.contains(".ant-modal-title", "生成语境练习").should("be.visible");
    cy.contains("已选 3/20").should("be.visible");
    cy.contains(".ant-segmented-item", "GPT-5.6").click();
    cy.get('input[aria-label="雅思分数等级"]').clear().type("7.5");
    cy.contains("button", "开始生成").click();
    cy.wait("@createContextTask");

    cy.location("pathname").should("eq", "/englishWorld/context-lab");
    cy.location("search").should(
      "eq",
      "?source=word-library&taskId=44",
    );
    cy.wait("@contextDetail");
    cy.contains('[aria-label="批量生成任务状态"]', "等待回调").should(
      "be.visible",
    );
    cy.get(".context-lab-history-item-selected").should(
      "contain.text",
      "fragile / resilient / steady",
    );
    cy.contains(".ant-modal-title", "单词来源文章").should("not.exist");
  });
});
```

- [ ] **Step 2: Run the Cypress spec and verify behavior**

Run:

```bash
pnpm --filter @font/english-world exec start-server-and-test "vite --host 127.0.0.1 --port 5175 --strictPort" http://127.0.0.1:5175 "cypress run --spec cypress/e2e/word-library-batch-context-lab.cy.ts"
```

Expected: PASS with one test. The create intercept validates the exact words, IELTS band, and model.

- [ ] **Step 3: Run both affected unit suites together**

Run:

```bash
pnpm --filter @font/english-world exec vitest run apps/english-world/src/page/englishWorld/EnglishWorld.test.tsx apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.test.tsx
```

Expected: PASS.

- [ ] **Step 4: Run the production build**

Run:

```bash
pnpm --filter @font/english-world build
```

Expected: TypeScript compilation and Vite build both exit 0.

- [ ] **Step 5: Inspect the final diff for unintended backend or list-view changes**

Run:

```bash
git diff --check
git status --short
git diff --stat HEAD~2
```

Expected: no whitespace errors; only the six frontend/test files in this plan plus this plan/spec documentation are present; no `nestjs` file is changed.

- [ ] **Step 6: Commit Task 3**

```bash
git add apps/english-world/cypress/e2e/word-library-batch-context-lab.cy.ts
git commit -m "test(english-world): cover batch context lab flow"
```
