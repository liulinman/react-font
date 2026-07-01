# Mobile Context Lab Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile Context Lab reading flow that matches the core Web reading loop: generate or open packs, read, mark/import words, answer, review, and revisit attempts.

**Architecture:** Add a focused mobile Context Lab component under `englishWorldMobile`, while reusing Web Context Lab API descriptors and learning types. Keep `ExerciseAgentTabMobile.tsx` as a compatibility wrapper and extract small mobile-safe pure helpers for article parsing, text selection, import preview, answer keys, and result lookup.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Testing Library, Ant Design Mobile, existing `@font/api` request descriptors, NestJS Context Lab endpoints.

## Global Constraints

- Do not replace desktop `ContextLabPage`.
- Do not introduce new database tables.
- Do not change backend schemas unless a test exposes a real contract gap.
- Preserve existing mobile word list, stats, AI word query, and today review entry.
- Mark-first/import-later is the required reading UX.
- `/english/importMissingWords` must insert only missing words and skip existing or duplicate entries.
- Keep new Context Lab code in focused components instead of growing `EnglishWorldMobile.tsx`.
- Avoid overwriting current dirty desktop Context Lab changes.

---

## File Structure

- Create `apps/english-world/src/page/englishWorldMobile/mobileContextLab.ts`: pure helpers and mobile-specific types.
- Create `apps/english-world/src/page/englishWorldMobile/mobileContextLab.test.ts`: TDD coverage for helpers.
- Create `apps/english-world/src/page/englishWorldMobile/MobileContextLabPage.tsx`: mobile Context Lab orchestration and UI.
- Modify `apps/english-world/src/page/englishWorldMobile/ExerciseAgentTabMobile.tsx`: compatibility wrapper that exports `MobileContextLabPage`.
- Modify `apps/english-world/src/page/englishWorldMobile/ExerciseAgentTabMobile.test.tsx`: behavior tests for the mobile Context Lab flow through the stable import path.
- Modify `apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.test.tsx`: assert the mobile home card opens the Context Lab tab.
- Modify `apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.css`: styles for mobile Context Lab reading, history, marked words, import preview, and attempt drawer.
- Modify `apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.tsx`: update copy and active tab behavior only if the existing card does not naturally open the new flow.

### Task 1: Mobile Context Lab Pure Helpers

**Files:**
- Create: `apps/english-world/src/page/englishWorldMobile/mobileContextLab.ts`
- Create: `apps/english-world/src/page/englishWorldMobile/mobileContextLab.test.ts`

**Interfaces:**
- Produces:
  - `parseMobileContextArticle(article: string): { topic: string; paragraphs: string[] }`
  - `cleanMobileSelectedText(text: string): string`
  - `getMobileVocabularyKey(text: string): string`
  - `getMobileQuestionKey(question: { id?: string }, index: number): string`
  - `findMobileQuestionResult(results: ExerciseResultItem[] | null, questionId: string): ExerciseResultItem | undefined`
  - `buildMobileMarkedWord(text: string, task?: ContextLabTask | null): MobileMarkedWord`
  - `mergeMobileImportPreview(base: MobileMarkedWord[], aiWords: WordAgentItem[]): MobileMarkedWord[]`
  - `toMobileImportPayload(item: MobileMarkedWord): Omit<WordList, "id">`
- Consumes:
  - `ContextLabTask` from `../englishWorld/types/learning`
  - `ExerciseResultItem` from `@/server/exerciseAgent/exerciseAgent`
  - `WordList` from `@/server/word/word.type`
  - `WordAgentItem` from `@/server/wordAgent/wordAgent`

- [ ] **Step 1: Write the failing helper tests**

Add `apps/english-world/src/page/englishWorldMobile/mobileContextLab.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  buildMobileMarkedWord,
  cleanMobileSelectedText,
  findMobileQuestionResult,
  getMobileQuestionKey,
  getMobileVocabularyKey,
  mergeMobileImportPreview,
  parseMobileContextArticle,
  toMobileImportPayload,
} from "./mobileContextLab";

describe("mobileContextLab helpers", () => {
  it("parses a titled article into topic and body paragraphs", () => {
    expect(
      parseMobileContextArticle(
        "Urban Farming\n\nParagraph one.\n\nParagraph two.",
      ),
    ).toEqual({
      topic: "Urban Farming",
      paragraphs: ["Paragraph one.", "Paragraph two."],
    });
  });

  it("cleans selected vocabulary text and creates stable keys", () => {
    expect(cleanMobileSelectedText(" “Urban farming,” ")).toBe("Urban farming");
    expect(getMobileVocabularyKey("Urban   Farming")).toBe("urban farming");
  });

  it("creates stable question keys and finds matching results", () => {
    const results = [
      {
        questionId: "q1",
        correct: false,
        correctIndex: 2,
        userSelectedIndex: 0,
        explanation: "定位句说明答案是 C。",
      },
    ];

    expect(getMobileQuestionKey({ id: "q1" }, 0)).toBe("q1");
    expect(getMobileQuestionKey({}, 2)).toBe("q-2");
    expect(findMobileQuestionResult(results, "q1")?.correct).toBe(false);
  });

  it("builds marked words with context references and import payloads", () => {
    const marked = buildMobileMarkedWord("urban farming", {
      id: 12,
      taskId: 12,
      status: "succeeded",
      sourceType: "custom",
      words: ["urban farming"],
      articleExerciseId: 88,
    });

    expect(marked).toMatchObject({
      englishWord: "urban farming",
      englishType: 1,
      englishReference:
        "/englishWorld/context-lab?taskId=12&articleExerciseId=88&word=urban+farming",
    });
    expect(toMobileImportPayload(marked)).toMatchObject({
      englishWord: "urban farming",
      englishType: 1,
      englishLevel: 0,
    });
  });

  it("merges AI completed fields into marked word preview", () => {
    const base = [buildMobileMarkedWord("urban farming", null)];

    expect(
      mergeMobileImportPreview(base, [
        {
          word: "urban farming",
          phonetic: "/ˈɜːbən/",
          meaning: "城市农业",
          partSpeech: [1, 2],
        },
      ]),
    ).toEqual([
      expect.objectContaining({
        englishWord: "urban farming",
        englishPhonetic: "/ˈɜːbən/",
        englishChinese: "城市农业",
        englishPartSpeech: [1, 2],
      }),
    ]);
  });
});
```

- [ ] **Step 2: Run helper tests to verify RED**

Run:

```bash
pnpm --filter @font/english-world test -- --run src/page/englishWorldMobile/mobileContextLab.test.ts
```

Expected: FAIL because `./mobileContextLab` does not exist.

- [ ] **Step 3: Implement helper module**

Add `apps/english-world/src/page/englishWorldMobile/mobileContextLab.ts`:

```ts
import type { ExerciseResultItem } from "@/server/exerciseAgent/exerciseAgent";
import type { WordAgentItem } from "@/server/wordAgent/wordAgent";
import type { WordList } from "@/server/word/word.type";
import type { ContextLabTask } from "@/page/englishWorld/types/learning";

export type MobileArticleContent = {
  topic: string;
  paragraphs: string[];
};

export type MobileMarkedWord = Omit<WordList, "id"> & {
  key: string;
};

const EDGE_PUNCTUATION = /^[\s"'“”‘’.,!?;:()[\]{}<>，。！？；：（）【】]+|[\s"'“”‘’.,!?;:()[\]{}<>，。！？；：（）【】]+$/g;

export function parseMobileContextArticle(article: string): MobileArticleContent {
  const blocks = String(article ?? "")
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length <= 1) {
    return {
      topic: "",
      paragraphs: String(article ?? "")
        .split(/\n+/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean),
    };
  }

  return {
    topic: blocks[0],
    paragraphs: blocks.slice(1),
  };
}

export function cleanMobileSelectedText(text: string) {
  return String(text ?? "")
    .replace(/\s+/g, " ")
    .replace(EDGE_PUNCTUATION, "")
    .trim();
}

export function getMobileVocabularyKey(text: string) {
  return cleanMobileSelectedText(text).toLocaleLowerCase();
}

export function getMobileQuestionKey(question: { id?: string }, index: number) {
  const id = String(question.id ?? "").trim();
  return id || `q-${index}`;
}

export function findMobileQuestionResult(
  results: ExerciseResultItem[] | null,
  questionId: string,
) {
  return results?.find((result) => result.questionId === questionId);
}

export function buildMobileContextReference(
  task: ContextLabTask | null | undefined,
  word: string,
) {
  if (!task?.taskId) return "";

  const params = new URLSearchParams({ taskId: String(task.taskId) });
  if (task.articleExerciseId) {
    params.set("articleExerciseId", String(task.articleExerciseId));
  }
  params.set("word", cleanMobileSelectedText(word));
  return `/englishWorld/context-lab?${params.toString()}`;
}

export function buildMobileMarkedWord(
  text: string,
  task: ContextLabTask | null | undefined,
): MobileMarkedWord {
  const englishWord = cleanMobileSelectedText(text);

  return {
    key: getMobileVocabularyKey(englishWord),
    englishWord,
    englishType: englishWord.includes(" ") ? 1 : 0,
    englishLevel: 0,
    englishReference: buildMobileContextReference(task, englishWord),
    englishPartSpeech: [],
  };
}

export function mergeMobileImportPreview(
  base: MobileMarkedWord[],
  aiWords: WordAgentItem[],
): MobileMarkedWord[] {
  const aiByKey = new Map(
    aiWords.map((item) => [getMobileVocabularyKey(item.word), item]),
  );

  return base.map((item) => {
    const ai = aiByKey.get(item.key);
    if (!ai) return item;

    return {
      ...item,
      englishPhonetic: ai.phonetic || item.englishPhonetic,
      englishChinese: ai.meaning || item.englishChinese,
      englishPartSpeech: Array.isArray(ai.partSpeech)
        ? ai.partSpeech
        : item.englishPartSpeech,
    };
  });
}

export function toMobileImportPayload(
  item: MobileMarkedWord,
): Omit<WordList, "id"> {
  return {
    englishWord: cleanMobileSelectedText(item.englishWord),
    englishPhonetic: item.englishPhonetic,
    englishType: item.englishType ?? (item.englishWord.includes(" ") ? 1 : 0),
    englishChinese: item.englishChinese,
    englishNote: item.englishNote,
    englishLevel: item.englishLevel ?? 0,
    englishReference: item.englishReference,
    englishImg: item.englishImg,
    englishPartSpeech: item.englishPartSpeech,
  };
}
```

- [ ] **Step 4: Run helper tests to verify GREEN**

Run:

```bash
pnpm --filter @font/english-world test -- --run src/page/englishWorldMobile/mobileContextLab.test.ts
```

Expected: PASS.

### Task 2: Mobile Context Lab Page Skeleton And API Flow

**Files:**
- Create: `apps/english-world/src/page/englishWorldMobile/MobileContextLabPage.tsx`
- Modify: `apps/english-world/src/page/englishWorldMobile/ExerciseAgentTabMobile.tsx`
- Modify: `apps/english-world/src/page/englishWorldMobile/ExerciseAgentTabMobile.test.tsx`
- Modify: `apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.css`

**Interfaces:**
- Consumes helpers from Task 1.
- Consumes `contextLabCreateTask`, `contextLabHistory`, `contextLabDetail`, and `contextLabDeleteTask` from `@/page/englishWorld/server/learning`.
- Produces `MobileContextLabPage` default named export and wrapper `ExerciseAgentTabMobile`.

- [ ] **Step 1: Replace the old mobile exercise test with a failing Context Lab API test**

Rewrite `apps/english-world/src/page/englishWorldMobile/ExerciseAgentTabMobile.test.tsx` first test body to expect Context Lab history and task creation:

```ts
import "antd-mobile/es/global";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import request from "@font/api";
import { ExerciseAgentTabMobile } from "./ExerciseAgentTabMobile";

vi.mock("@font/api", () => ({
  default: vi.fn(),
  getApiBaseUrl: () => "/api",
}));

const requestMock = vi.mocked(request);

describe("ExerciseAgentTabMobile", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("loads mobile Context Lab history and creates a practice pack", async () => {
    const user = userEvent.setup();
    requestMock.mockImplementation(async (config: { url: string }) => {
      if (config.url === "/context-lab/history") {
        return {
          list: [
            {
              id: 12,
              taskId: 12,
              status: "succeeded",
              sourceType: "custom",
              words: ["urban farming", "supply", "rooftop"],
              articleExerciseId: 88,
              latestScore: 80,
              latestWrongCount: 1,
            },
          ],
          total: 1,
          page: 1,
          pageSize: 10,
        };
      }
      if (config.url === "/context-lab/generate-task") {
        return {
          id: 13,
          taskId: 13,
          status: "pending",
          sourceType: "proficiency",
          words: ["fragile", "steady", "recover"],
        };
      }
      throw new Error(`unexpected request ${config.url}`);
    });

    render(<ExerciseAgentTabMobile />);

    expect(await screen.findByText("移动语境练习")).toBeInTheDocument();
    expect(screen.getByText("urban farming / supply / rooftop")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "生成练习包" }));

    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/context-lab/generate-task",
        data: {
          sourceType: "proficiency",
          proficiencyLevels: [0, 1],
          count: 8,
        },
      }),
    );
    expect(await screen.findByText("fragile / steady / recover")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the mobile component test to verify RED**

Run:

```bash
pnpm --filter @font/english-world test -- --run src/page/englishWorldMobile/ExerciseAgentTabMobile.test.tsx
```

Expected: FAIL because the current component still calls `/exercise-agent/generate` and does not render "移动语境练习".

- [ ] **Step 3: Implement `MobileContextLabPage` skeleton and wrapper**

Create `apps/english-world/src/page/englishWorldMobile/MobileContextLabPage.tsx` with:

```tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Dialog, Empty, Input, Picker, Space, Tag, TextArea, Toast } from "antd-mobile";
import type { PickerActions } from "antd-mobile/es/components/picker";
import request from "@font/api";
import {
  contextLabCreateTask,
  contextLabDeleteTask,
  contextLabDetail,
  contextLabHistory,
} from "@/page/englishWorld/server/learning";
import type {
  ContextLabGenerateParams,
  ContextLabTask,
} from "@/page/englishWorld/types/learning";
import {
  parseMobileContextArticle,
} from "./mobileContextLab";

type SourceMode = "weak" | "random" | "custom";

function getSourceLabel(sourceType: ContextLabTask["sourceType"]) {
  const labels: Record<ContextLabTask["sourceType"], string> = {
    proficiency: "薄弱词",
    random: "随机词",
    custom: "手输词",
  };
  return labels[sourceType] ?? "练习包";
}

function getStatusLabel(status: ContextLabTask["status"]) {
  const labels: Record<ContextLabTask["status"], string> = {
    pending: "等待生成",
    processing: "生成中",
    succeeded: "可练习",
    failed: "生成失败",
  };
  return labels[status] ?? status;
}

function buildGenerateParams(
  sourceMode: SourceMode,
  count: number,
  customWords: string,
): ContextLabGenerateParams {
  if (sourceMode === "random") return { sourceType: "random", count };
  if (sourceMode === "custom") {
    return {
      sourceType: "custom",
      words: customWords
        .split(/[\s,，]+/)
        .map((word) => word.trim())
        .filter(Boolean),
    };
  }
  return {
    sourceType: "proficiency",
    proficiencyLevels: [0, 1],
    count,
  };
}

export function MobileContextLabPage() {
  const [sourceMode, setSourceMode] = useState<SourceMode>("weak");
  const [count, setCount] = useState(8);
  const [customWords, setCustomWords] = useState("");
  const [history, setHistory] = useState<ContextLabTask[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [currentTask, setCurrentTask] = useState<ContextLabTask | null>(null);
  const [openingTaskId, setOpeningTaskId] = useState<number | null>(null);
  const sourcePickerRef = React.useRef<PickerActions>(null);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const response = await request(contextLabHistory({ page: 1, pageSize: 20 }));
      setHistory(response.list ?? []);
    } catch (error) {
      Toast.show({
        icon: "fail",
        content: error instanceof Error ? error.message : "读取练习包失败",
      });
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const handleGenerate = async () => {
    const params = buildGenerateParams(sourceMode, count, customWords);
    if (params.sourceType === "custom" && params.words.length < 3) {
      Toast.show({ icon: "fail", content: "自定义单词至少需要 3 个" });
      return;
    }

    setCreating(true);
    try {
      const task = await request(contextLabCreateTask(params));
      setHistory((prev) => [task, ...prev.filter((item) => item.taskId !== task.taskId)]);
      Toast.show({ icon: "success", content: "练习包已提交" });
    } catch (error) {
      Toast.show({
        icon: "fail",
        content: error instanceof Error ? error.message : "生成练习包失败",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleOpenTask = async (task: ContextLabTask) => {
    if (task.status !== "succeeded") return;
    setOpeningTaskId(task.taskId);
    try {
      const detail = await request(contextLabDetail({ taskId: task.taskId }));
      setCurrentTask(detail);
    } catch (error) {
      Toast.show({
        icon: "fail",
        content: error instanceof Error ? error.message : "打开练习包失败",
      });
    } finally {
      setOpeningTaskId(null);
    }
  };

  const handleDeleteTask = (task: ContextLabTask) => {
    Dialog.confirm({
      content: "删除后练习包和记录会从列表移除。",
      confirmText: "删除",
      cancelText: "取消",
      onConfirm: async () => {
        await request(contextLabDeleteTask({ taskId: task.taskId }));
        setHistory((prev) => prev.filter((item) => item.taskId !== task.taskId));
      },
    });
  };

  const currentArticle = useMemo(
    () => parseMobileContextArticle(currentTask?.article ?? ""),
    [currentTask?.article],
  );

  if (currentTask) {
    return (
      <div className="mobile-context-lab">
        <div className="mobile-context-lab-toolbar">
          <Button size="small" onClick={() => setCurrentTask(null)}>
            返回练习包
          </Button>
          <Tag color="primary">{currentTask.words.length} 词</Tag>
        </div>
        <article aria-label="阅读材料" className="mobile-context-reading">
          <div className="mobile-context-section-heading">
            <span>Reading</span>
            <h3>{currentArticle.topic || "阅读材料"}</h3>
          </div>
          <div className="mobile-context-reading-body">
            {currentArticle.paragraphs.map((paragraph, index) => (
              <p key={`${paragraph}-${index}`}>{paragraph}</p>
            ))}
          </div>
        </article>
      </div>
    );
  }

  return (
    <div className="mobile-context-lab">
      <Card className="mobile-context-hero">
        <div className="mobile-context-eyebrow">Context Lab</div>
        <h2>移动语境练习</h2>
        <p>生成、继续和复盘阅读练习包，手机上也能完成完整阅读闭环。</p>
      </Card>

      <Card className="mobile-context-generator">
        <div className="mobile-context-section-heading">
          <span>Create</span>
          <h3>生成练习包</h3>
        </div>
        <div className="mobile-context-field" onClick={() => sourcePickerRef.current?.open()}>
          <span>选词方式</span>
          <strong>
            {sourceMode === "weak"
              ? "今日薄弱词"
              : sourceMode === "random"
                ? "随机词"
                : "手输词"}
          </strong>
          <Picker
            ref={sourcePickerRef as React.RefObject<PickerActions>}
            columns={[
              [
                { label: "今日薄弱词", value: "weak" },
                { label: "随机词", value: "random" },
                { label: "手输词", value: "custom" },
              ],
            ]}
            value={[sourceMode]}
            onConfirm={(value) => setSourceMode(value[0] as SourceMode)}
          />
        </div>
        {sourceMode === "custom" ? (
          <TextArea
            placeholder="输入至少 3 个单词，用逗号或空格分隔"
            rows={3}
            value={customWords}
            onChange={setCustomWords}
          />
        ) : (
          <Input
            type="number"
            min={3}
            max={20}
            value={String(count)}
            onChange={(value) =>
              setCount(Math.min(20, Math.max(3, Number(value || 8))))
            }
          />
        )}
        <Button block color="primary" loading={creating} onClick={handleGenerate}>
          生成练习包
        </Button>
      </Card>

      <section aria-label="练习包列表" className="mobile-context-history">
        <div className="mobile-context-history-head">
          <h3>练习包</h3>
          <Button size="small" loading={historyLoading} onClick={loadHistory}>
            刷新
          </Button>
        </div>
        {history.length === 0 && !historyLoading ? (
          <Empty description="还没有练习包" />
        ) : (
          <div className="mobile-context-history-list">
            {history.map((task) => (
              <Card key={task.taskId} className="mobile-context-task-card">
                <div className="mobile-context-task-kicker">
                  <Tag>{getStatusLabel(task.status)}</Tag>
                  <span>{getSourceLabel(task.sourceType)}</span>
                </div>
                <h4>{task.words.slice(0, 5).join(" / ")}</h4>
                <div className="mobile-context-task-meta">
                  <span>{task.words.length} 个词</span>
                  {task.latestScore != null && <span>得分 {task.latestScore}</span>}
                  {task.latestWrongCount != null && <span>错题 {task.latestWrongCount}</span>}
                </div>
                <Space wrap>
                  {task.status === "succeeded" && (
                    <Button
                      color="primary"
                      size="small"
                      loading={openingTaskId === task.taskId}
                      onClick={() => void handleOpenTask(task)}
                    >
                      开始练习
                    </Button>
                  )}
                  <Button size="small" onClick={() => handleDeleteTask(task)}>
                    删除
                  </Button>
                </Space>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
```

Replace `apps/english-world/src/page/englishWorldMobile/ExerciseAgentTabMobile.tsx` with:

```tsx
export { MobileContextLabPage as ExerciseAgentTabMobile } from "./MobileContextLabPage";
```

- [ ] **Step 4: Add skeleton CSS**

Append to `apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.css`:

```css
.mobile-context-lab {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 0 28px;
}

.mobile-context-hero,
.mobile-context-generator,
.mobile-context-task-card,
.mobile-context-reading {
  border-radius: 8px;
}

.mobile-context-eyebrow,
.mobile-context-section-heading span,
.mobile-context-task-kicker {
  color: #5f6f89;
  font-size: 12px;
}

.mobile-context-hero h2,
.mobile-context-section-heading h3,
.mobile-context-history-head h3,
.mobile-context-task-card h4 {
  margin: 4px 0;
}

.mobile-context-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 44px;
  border-bottom: 1px solid #eef1f5;
}

.mobile-context-history-head,
.mobile-context-lab-toolbar,
.mobile-context-task-kicker,
.mobile-context-task-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.mobile-context-history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mobile-context-task-meta {
  justify-content: flex-start;
  color: #607086;
  font-size: 12px;
  margin: 8px 0 12px;
}

.mobile-context-reading {
  background: #fff;
  padding: 14px;
}

.mobile-context-reading-body {
  color: #1f2937;
  font-size: 16px;
  line-height: 1.8;
}
```

- [ ] **Step 5: Run mobile component test to verify GREEN**

Run:

```bash
pnpm --filter @font/english-world test -- --run src/page/englishWorldMobile/ExerciseAgentTabMobile.test.tsx
```

Expected: PASS.

### Task 3: Practice Questions, Submit, And Result Review

**Files:**
- Modify: `apps/english-world/src/page/englishWorldMobile/MobileContextLabPage.tsx`
- Modify: `apps/english-world/src/page/englishWorldMobile/ExerciseAgentTabMobile.test.tsx`
- Modify: `apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.css`

**Interfaces:**
- Consumes helpers from Task 1.
- Consumes `contextLabSubmit`.
- Produces mobile question answering and result review.

- [ ] **Step 1: Add failing submit test**

Append to `ExerciseAgentTabMobile.test.tsx`:

```ts
it("opens a succeeded pack, submits answers, and renders result review", async () => {
  const user = userEvent.setup();
  requestMock.mockImplementation(async (config: { url: string; data?: unknown }) => {
    if (config.url === "/context-lab/history") {
      return {
        list: [
          {
            id: 12,
            taskId: 12,
            status: "succeeded",
            sourceType: "custom",
            words: ["urban farming", "supply", "rooftop"],
            articleExerciseId: 88,
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
      };
    }
    if (config.url === "/context-lab/detail") {
      return {
        id: 12,
        taskId: 12,
        status: "succeeded",
        sourceType: "custom",
        words: ["urban farming", "supply", "rooftop"],
        articleExerciseId: 88,
        article:
          "Urban Farming\n\nUrban farming improves local food supply.",
        questions: [
          {
            id: "q1",
            stem: "What is the passage mainly about?",
            options: ["Urban farming", "Ocean travel", "Space flight", "Weather"],
          },
        ],
      };
    }
    if (config.url === "/context-lab/submit") {
      return {
        attemptId: 5,
        score: 100,
        correctCount: 1,
        wrongCount: 0,
        weakWords: [],
        nextSuggestions: ["用新词再生成一套练习"],
        results: [
          {
            questionId: "q1",
            correct: true,
            correctIndex: 0,
            userSelectedIndex: 0,
            explanation: "文章主旨围绕 urban farming。",
          },
        ],
      };
    }
    throw new Error(`unexpected request ${config.url}`);
  });

  render(<ExerciseAgentTabMobile />);

  await user.click(await screen.findByRole("button", { name: "开始练习" }));
  expect(await screen.findByRole("article", { name: "阅读材料" })).toBeInTheDocument();

  await user.click(screen.getByLabelText("A. Urban farming"));
  await user.click(screen.getByRole("button", { name: "提交练习" }));

  expect(requestMock).toHaveBeenCalledWith(
    expect.objectContaining({
      url: "/context-lab/submit",
      data: {
        sessionId: 88,
        answers: [{ questionId: "q1", selectedIndex: 0 }],
      },
    }),
  );
  expect(await screen.findByRole("region", { name: "结果复盘" })).toHaveTextContent("100");
  expect(screen.getByText("文章主旨围绕 urban farming。")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run submit test to verify RED**

Run:

```bash
pnpm --filter @font/english-world test -- --run src/page/englishWorldMobile/ExerciseAgentTabMobile.test.tsx
```

Expected: FAIL because questions and submit are not implemented.

- [ ] **Step 3: Implement questions, submit, and review**

Update `MobileContextLabPage.tsx`:

```tsx
// Add imports
import { Radio } from "antd-mobile";
import { contextLabSubmit } from "@/page/englishWorld/server/learning";
import type { ContextLabSubmitResult } from "@/page/englishWorld/types/learning";
import {
  findMobileQuestionResult,
  getMobileQuestionKey,
} from "./mobileContextLab";

// Add state inside component
const [answers, setAnswers] = useState<Record<string, number>>({});
const [submitSummary, setSubmitSummary] = useState<ContextLabSubmitResult | null>(null);
const [submitting, setSubmitting] = useState(false);

// Add submit handler inside component
const handleSubmit = async () => {
  if (!currentTask?.questions?.length || !currentTask.articleExerciseId) {
    Toast.show({ icon: "fail", content: "练习包还不能提交" });
    return;
  }

  const unanswered = currentTask.questions.filter((question, index) => {
    const key = getMobileQuestionKey(question, index);
    return answers[key] == null;
  });
  if (unanswered.length > 0) {
    Toast.show({ icon: "fail", content: `还有 ${unanswered.length} 题未作答` });
    return;
  }

  setSubmitting(true);
  try {
    const response = await request(
      contextLabSubmit({
        sessionId: currentTask.articleExerciseId,
        answers: currentTask.questions.map((question, index) => {
          const key = getMobileQuestionKey(question, index);
          return {
            questionId: question.id || key,
            selectedIndex: answers[key],
          };
        }),
      }),
    );
    setSubmitSummary(response);
  } catch (error) {
    Toast.show({
      icon: "fail",
      content: error instanceof Error ? error.message : "提交失败",
    });
  } finally {
    setSubmitting(false);
  }
};

// Reset practice state inside handleOpenTask after setCurrentTask(detail)
setAnswers({});
setSubmitSummary(null);

// Replace the practice JSX after article with this question section
<section aria-label="选择题作答区" className="mobile-context-questions">
  <div className="mobile-context-section-heading">
    <span>Questions</span>
    <h3>选择题</h3>
  </div>
  {currentTask.questions?.map((question, index) => {
    const key = getMobileQuestionKey(question, index);
    const result = findMobileQuestionResult(submitSummary?.results ?? null, key);
    return (
      <Card key={key} className="mobile-context-question-card">
        <div className="mobile-context-question-title">
          <span>第 {index + 1} 题</span>
          {result && (
            <Tag color={result.correct ? "success" : "danger"}>
              {result.correct ? "正确" : "需要复盘"}
            </Tag>
          )}
        </div>
        <p>{question.stem}</p>
        <Radio.Group
          value={answers[key]}
          disabled={submitSummary != null}
          onChange={(value) =>
            setAnswers((prev) => ({
              ...prev,
              [key]: Number(value),
            }))
          }
        >
          {question.options.map((option, optionIndex) => (
            <Radio
              key={`${key}-${optionIndex}`}
              value={optionIndex}
              className="mobile-context-option"
              aria-label={`${String.fromCharCode(65 + optionIndex)}. ${option}`}
            >
              <span>{String.fromCharCode(65 + optionIndex)}. {option}</span>
              {result?.correctIndex === optionIndex && !result.correct && (
                <em>正确答案</em>
              )}
            </Radio>
          ))}
        </Radio.Group>
        {result?.explanation && (
          <div className="mobile-context-explanation">
            {result.explanation}
          </div>
        )}
      </Card>
    );
  })}
</section>

{submitSummary && (
  <section aria-label="结果复盘" className="mobile-context-result">
    <div>
      <span>得分</span>
      <strong>{submitSummary.score ?? 0}</strong>
    </div>
    <Tag color={(submitSummary.wrongCount ?? 0) > 0 ? "warning" : "success"}>
      错题 {submitSummary.wrongCount ?? 0}
    </Tag>
    {submitSummary.weakWords.length > 0 && (
      <div className="mobile-context-word-strip">
        {submitSummary.weakWords.map((word) => (
          <Tag key={word} color="danger">{word}</Tag>
        ))}
      </div>
    )}
    {submitSummary.nextSuggestions.length > 0 && (
      <ul>
        {submitSummary.nextSuggestions.map((suggestion) => (
          <li key={suggestion}>{suggestion}</li>
        ))}
      </ul>
    )}
  </section>
)}

{!submitSummary && (
  <div className="mobile-context-submit-bar">
    <span>完成阅读后提交</span>
    <Button color="primary" loading={submitting} onClick={handleSubmit}>
      提交练习
    </Button>
  </div>
)}
```

- [ ] **Step 4: Add question/result CSS**

Append:

```css
.mobile-context-questions,
.mobile-context-question-card,
.mobile-context-result {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mobile-context-question-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: #607086;
  font-size: 13px;
}

.mobile-context-option {
  align-items: flex-start;
  width: 100%;
  padding: 8px 0;
}

.mobile-context-explanation {
  margin-top: 10px;
  border-left: 3px solid #3b82f6;
  padding: 8px 10px;
  background: #f3f7ff;
  color: #334155;
  line-height: 1.6;
}

.mobile-context-result {
  border-radius: 8px;
  background: #fff;
  padding: 14px;
}

.mobile-context-result strong {
  display: block;
  color: #111827;
  font-size: 32px;
}

.mobile-context-word-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.mobile-context-submit-bar {
  position: sticky;
  bottom: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid #e5eaf2;
  background: rgba(255, 255, 255, 0.96);
  padding: 10px 0;
}
```

- [ ] **Step 5: Run submit test to verify GREEN**

Run:

```bash
pnpm --filter @font/english-world test -- --run src/page/englishWorldMobile/ExerciseAgentTabMobile.test.tsx
```

Expected: PASS.

### Task 4: Marked Words, AI Preview, And Import Missing

**Files:**
- Modify: `apps/english-world/src/page/englishWorldMobile/MobileContextLabPage.tsx`
- Modify: `apps/english-world/src/page/englishWorldMobile/ExerciseAgentTabMobile.test.tsx`
- Modify: `apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.css`

**Interfaces:**
- Consumes helpers from Task 1.
- Consumes `wordAgentQuery`, `wordImportMissing`.
- Produces touch-friendly selected text marking and duplicate-safe import preview.

- [ ] **Step 1: Add failing marked-word import test**

Append to `ExerciseAgentTabMobile.test.tsx`:

```ts
it("marks selected reading text, previews AI completion, and imports missing words", async () => {
  const user = userEvent.setup();
  requestMock.mockImplementation(async (config: { url: string }) => {
    if (config.url === "/context-lab/history") {
      return {
        list: [
          {
            id: 12,
            taskId: 12,
            status: "succeeded",
            sourceType: "custom",
            words: ["urban farming", "supply", "rooftop"],
            articleExerciseId: 88,
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
      };
    }
    if (config.url === "/context-lab/detail") {
      return {
        id: 12,
        taskId: 12,
        status: "succeeded",
        sourceType: "custom",
        words: ["urban farming", "supply", "rooftop"],
        articleExerciseId: 88,
        article:
          "Urban Farming\n\nUrban farming improves local food supply.",
        questions: [],
      };
    }
    if (config.url === "/word-agent/query") {
      return {
        words: [
          {
            word: "urban farming",
            phonetic: "/ˈɜːbən/",
            meaning: "城市农业",
            partSpeech: [1],
          },
        ],
      };
    }
    if (config.url === "/english/importMissingWords") {
      return {
        received: 1,
        normalized: 1,
        inserted: 1,
        skippedExisting: 0,
        skippedDuplicate: 0,
        insertedWords: ["urban farming"],
        skippedWords: [],
      };
    }
    throw new Error(`unexpected request ${config.url}`);
  });

  render(<ExerciseAgentTabMobile />);

  await user.click(await screen.findByRole("button", { name: "开始练习" }));
  const reading = await screen.findByRole("article", { name: "阅读材料" });

  vi.spyOn(window, "getSelection").mockReturnValue({
    toString: () => "urban farming",
    removeAllRanges: vi.fn(),
  } as unknown as Selection);

  await user.pointer({ keys: "[MouseRight]", target: within(reading).getByText(/Urban farming improves/) });
  await user.click(await screen.findByRole("button", { name: "标记生词" }));

  const markedRegion = await screen.findByRole("region", { name: "已标记生词" });
  expect(within(markedRegion).getByText("urban farming")).toBeInTheDocument();

  await user.click(within(markedRegion).getByRole("button", { name: "预览并导入" }));

  const preview = await screen.findByRole("dialog", { name: "导入预览" });
  expect(within(preview).getByDisplayValue("城市农业")).toBeInTheDocument();

  await user.click(within(preview).getByRole("button", { name: "确认导入" }));

  expect(requestMock).toHaveBeenCalledWith(
    expect.objectContaining({
      url: "/english/importMissingWords",
      data: {
        words: [
          expect.objectContaining({
            englishWord: "urban farming",
            englishChinese: "城市农业",
          }),
        ],
      },
    }),
  );
});
```

- [ ] **Step 2: Run marked-word test to verify RED**

Run:

```bash
pnpm --filter @font/english-world test -- --run src/page/englishWorldMobile/ExerciseAgentTabMobile.test.tsx
```

Expected: FAIL because marking and import preview are not implemented.

- [ ] **Step 3: Implement selected text marking and import preview**

Update `MobileContextLabPage.tsx`:

```tsx
// Add imports
import { Popup } from "antd-mobile";
import { wordImportMissing } from "@/server/word/word";
import { wordAgentQuery } from "@/server/wordAgent/wordAgent";
import {
  buildMobileMarkedWord,
  cleanMobileSelectedText,
  mergeMobileImportPreview,
  toMobileImportPayload,
  type MobileMarkedWord,
} from "./mobileContextLab";

// Add state
const [selectedText, setSelectedText] = useState("");
const [selectionOpen, setSelectionOpen] = useState(false);
const [markedWords, setMarkedWords] = useState<MobileMarkedWord[]>([]);
const [previewOpen, setPreviewOpen] = useState(false);
const [previewWords, setPreviewWords] = useState<MobileMarkedWord[]>([]);
const [previewLoading, setPreviewLoading] = useState(false);
const [importing, setImporting] = useState(false);

// Add handlers
const handleReadingContextMenu = (event: React.MouseEvent<HTMLElement>) => {
  const text = cleanMobileSelectedText(window.getSelection()?.toString() ?? "");
  if (!text) return;
  event.preventDefault();
  setSelectedText(text);
  setSelectionOpen(true);
};

const handleMarkSelected = () => {
  const text = cleanMobileSelectedText(selectedText);
  if (!text) return;
  const item = buildMobileMarkedWord(text, currentTask);
  setMarkedWords((prev) =>
    prev.some((word) => word.key === item.key) ? prev : [...prev, item],
  );
  setSelectionOpen(false);
  window.getSelection()?.removeAllRanges();
};

const handleOpenImportPreview = async () => {
  if (markedWords.length === 0) {
    Toast.show({ icon: "fail", content: "还没有标记生词" });
    return;
  }
  setPreviewWords(markedWords);
  setPreviewOpen(true);
  setPreviewLoading(true);
  try {
    const response = await request(
      wordAgentQuery({ words: markedWords.map((item) => item.englishWord) }),
    );
    setPreviewWords((prev) =>
      mergeMobileImportPreview(prev.length ? prev : markedWords, response.words ?? []),
    );
  } catch (error) {
    Toast.show({
      icon: "fail",
      content: error instanceof Error ? error.message : "AI 补全失败",
    });
  } finally {
    setPreviewLoading(false);
  }
};

const handleUpdatePreviewWord = (
  key: string,
  patch: Partial<MobileMarkedWord>,
) => {
  setPreviewWords((prev) =>
    prev.map((item) => (item.key === key ? { ...item, ...patch } : item)),
  );
};

const handleConfirmImport = async () => {
  setImporting(true);
  try {
    const response = await request(
      wordImportMissing({
        words: previewWords.map(toMobileImportPayload),
      }),
    );
    const skipped = response.skippedExisting + response.skippedDuplicate;
    Toast.show({
      icon: response.inserted > 0 ? "success" : "success",
      content:
        response.inserted > 0
          ? `已导入 ${response.inserted} 个，跳过 ${skipped} 个`
          : "标记词都已在词库",
    });
    setPreviewOpen(false);
    setPreviewWords([]);
    setMarkedWords([]);
  } catch (error) {
    Toast.show({
      icon: "fail",
      content: error instanceof Error ? error.message : "导入失败",
    });
  } finally {
    setImporting(false);
  }
};
```

Add `onContextMenu={handleReadingContextMenu}` to the reading article and render marked/import UI inside practice view:

```tsx
{markedWords.length > 0 && (
  <section aria-label="已标记生词" className="mobile-context-marked">
    <div>
      <strong>已标记 {markedWords.length} 个生词</strong>
      <Button size="small" color="primary" onClick={handleOpenImportPreview}>
        预览并导入
      </Button>
    </div>
    <div className="mobile-context-word-strip">
      {markedWords.map((item) => (
        <Tag
          key={item.key}
          closeable
          onClose={() =>
            setMarkedWords((prev) => prev.filter((word) => word.key !== item.key))
          }
        >
          {item.englishWord}
        </Tag>
      ))}
    </div>
  </section>
)}

<Popup
  visible={selectionOpen}
  onMaskClick={() => setSelectionOpen(false)}
  bodyStyle={{ borderRadius: "8px 8px 0 0" }}
>
  <div className="mobile-context-selection-sheet">
    <strong>{selectedText}</strong>
    <Button block color="primary" onClick={handleMarkSelected}>
      标记生词
    </Button>
  </div>
</Popup>

<Popup
  visible={previewOpen}
  onMaskClick={() => setPreviewOpen(false)}
  bodyStyle={{ maxHeight: "80vh", overflow: "auto", borderRadius: "8px 8px 0 0" }}
>
  <section aria-label="导入预览" role="dialog" className="mobile-context-preview">
    <div className="mobile-context-section-heading">
      <span>Import</span>
      <h3>导入预览</h3>
    </div>
    <p>{previewLoading ? "AI 正在补全释义..." : "确认后只导入词库中不存在的词。"}</p>
    {previewWords.map((item, index) => (
      <Card key={item.key} className="mobile-context-preview-item">
        <Input
          aria-label={`第 ${index + 1} 个词单词`}
          value={item.englishWord}
          onChange={(value) => handleUpdatePreviewWord(item.key, { englishWord: value })}
        />
        <Input
          aria-label={`第 ${index + 1} 个词音标`}
          value={item.englishPhonetic ?? ""}
          onChange={(value) => handleUpdatePreviewWord(item.key, { englishPhonetic: value })}
        />
        <TextArea
          aria-label={`第 ${index + 1} 个词释义`}
          value={item.englishChinese ?? ""}
          onChange={(value) => handleUpdatePreviewWord(item.key, { englishChinese: value })}
        />
      </Card>
    ))}
    <Button block color="primary" loading={importing} onClick={handleConfirmImport}>
      确认导入
    </Button>
  </section>
</Popup>
```

- [ ] **Step 4: Add marked/import CSS**

Append:

```css
.mobile-context-marked,
.mobile-context-selection-sheet,
.mobile-context-preview {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  background: #fff;
}

.mobile-context-marked {
  border-radius: 8px;
}

.mobile-context-marked > div:first-child {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.mobile-context-preview-item {
  border-radius: 8px;
}
```

- [ ] **Step 5: Run marked-word test to verify GREEN**

Run:

```bash
pnpm --filter @font/english-world test -- --run src/page/englishWorldMobile/ExerciseAgentTabMobile.test.tsx
```

Expected: PASS.

### Task 5: Attempt Drawer And Mobile Home Entry

**Files:**
- Modify: `apps/english-world/src/page/englishWorldMobile/MobileContextLabPage.tsx`
- Modify: `apps/english-world/src/page/englishWorldMobile/ExerciseAgentTabMobile.test.tsx`
- Modify: `apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.test.tsx`
- Modify: `apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.css`
- Modify: `apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.tsx`

**Interfaces:**
- Consumes `contextLabAttemptHistory`, `contextLabAttemptDetail`, and `contextLabDeleteAttempt`.
- Produces attempt bottom drawer and confirmed mobile home navigation to Context Lab.

- [ ] **Step 1: Add failing attempt drawer test**

Append:

```ts
it("opens attempt history and expands attempt detail", async () => {
  const user = userEvent.setup();
  requestMock.mockImplementation(async (config: { url: string }) => {
    if (config.url === "/context-lab/history") {
      return {
        list: [
          {
            id: 12,
            taskId: 12,
            status: "succeeded",
            sourceType: "custom",
            words: ["urban farming", "supply", "rooftop"],
            articleExerciseId: 88,
            attemptCount: 1,
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
      };
    }
    if (config.url === "/context-lab/attempt-history") {
      return {
        list: [
          {
            id: 5,
            attemptId: 5,
            taskId: 12,
            articleExerciseId: 88,
            score: 60,
            correctCount: 3,
            wrongCount: 2,
            weakWords: ["supply"],
            nextSuggestions: ["复盘错题"],
            answers: [],
            results: [],
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
      };
    }
    if (config.url === "/context-lab/attempt-detail") {
      return {
        id: 5,
        attemptId: 5,
        taskId: 12,
        articleExerciseId: 88,
        score: 60,
        correctCount: 3,
        wrongCount: 2,
        weakWords: ["supply"],
        nextSuggestions: ["复盘错题"],
        answers: [{ questionId: "q1", selectedIndex: 1 }],
        results: [
          {
            questionId: "q1",
            correct: false,
            correctIndex: 0,
            userSelectedIndex: 1,
            explanation: "错在定位句。",
          },
        ],
      };
    }
    throw new Error(`unexpected request ${config.url}`);
  });

  render(<ExerciseAgentTabMobile />);

  await user.click(await screen.findByRole("button", { name: "记录" }));

  const drawer = await screen.findByRole("dialog", { name: "练习记录" });
  expect(within(drawer).getByText("得分 60")).toBeInTheDocument();

  await user.click(within(drawer).getByRole("button", { name: "查看详情" }));

  expect(await within(drawer).findByText("错在定位句。")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run attempt drawer test to verify RED**

Run:

```bash
pnpm --filter @font/english-world test -- --run src/page/englishWorldMobile/ExerciseAgentTabMobile.test.tsx
```

Expected: FAIL because attempt drawer is missing.

- [ ] **Step 3: Implement attempt drawer**

Update `MobileContextLabPage.tsx`:

```tsx
// Add imports
import {
  contextLabAttemptDetail,
  contextLabAttemptHistory,
  contextLabDeleteAttempt,
} from "@/page/englishWorld/server/learning";
import type { ContextLabAttempt } from "@/page/englishWorld/types/learning";

// Add state
const [attemptDrawerOpen, setAttemptDrawerOpen] = useState(false);
const [attemptTask, setAttemptTask] = useState<ContextLabTask | null>(null);
const [attempts, setAttempts] = useState<ContextLabAttempt[]>([]);
const [attemptDetails, setAttemptDetails] = useState<Record<number, ContextLabAttempt>>({});
const [attemptLoading, setAttemptLoading] = useState(false);

// Add handlers
const handleOpenAttempts = async (task: ContextLabTask) => {
  setAttemptTask(task);
  setAttemptDrawerOpen(true);
  setAttemptLoading(true);
  try {
    const response = await request(contextLabAttemptHistory({ taskId: task.taskId }));
    setAttempts(response.list ?? []);
  } catch (error) {
    Toast.show({
      icon: "fail",
      content: error instanceof Error ? error.message : "读取记录失败",
    });
  } finally {
    setAttemptLoading(false);
  }
};

const handleOpenAttemptDetail = async (attempt: ContextLabAttempt) => {
  if (attemptDetails[attempt.attemptId]) return;
  const detail = await request(contextLabAttemptDetail({ attemptId: attempt.attemptId }));
  setAttemptDetails((prev) => ({ ...prev, [attempt.attemptId]: detail }));
};

const handleDeleteAttempt = async (attempt: ContextLabAttempt) => {
  await request(contextLabDeleteAttempt({ attemptId: attempt.attemptId }));
  setAttempts((prev) => prev.filter((item) => item.attemptId !== attempt.attemptId));
};
```

Add a `记录` button to succeeded task cards and render drawer:

```tsx
<Button size="small" onClick={() => void handleOpenAttempts(task)}>
  记录
</Button>

<Popup
  visible={attemptDrawerOpen}
  onMaskClick={() => setAttemptDrawerOpen(false)}
  bodyStyle={{ maxHeight: "80vh", overflow: "auto", borderRadius: "8px 8px 0 0" }}
>
  <section aria-label="练习记录" role="dialog" className="mobile-context-attempts">
    <div className="mobile-context-section-heading">
      <span>Attempts</span>
      <h3>练习记录</h3>
    </div>
    {attemptLoading ? (
      <p>正在读取记录...</p>
    ) : attempts.length === 0 ? (
      <Empty description="还没有提交记录" />
    ) : (
      attempts.map((attempt) => {
        const detail = attemptDetails[attempt.attemptId];
        return (
          <Card key={attempt.attemptId} className="mobile-context-attempt-card">
            <div className="mobile-context-task-meta">
              <span>得分 {attempt.score}</span>
              <span>错题 {attempt.wrongCount}</span>
            </div>
            {attempt.weakWords.length > 0 && (
              <div className="mobile-context-word-strip">
                {attempt.weakWords.map((word) => (
                  <Tag key={word} color="danger">{word}</Tag>
                ))}
              </div>
            )}
            <Space>
              <Button size="small" onClick={() => void handleOpenAttemptDetail(attempt)}>
                查看详情
              </Button>
              <Button size="small" onClick={() => void handleDeleteAttempt(attempt)}>
                删除
              </Button>
            </Space>
            {detail?.results?.length > 0 && (
              <div className="mobile-context-attempt-detail">
                {detail.results.map((result) => (
                  <p key={result.questionId}>{result.explanation || result.questionId}</p>
                ))}
              </div>
            )}
          </Card>
        );
      })
    )}
  </section>
</Popup>
```

- [ ] **Step 4: Add home-entry test**

In `EnglishWorldMobile.test.tsx`, extend the existing test:

```ts
expect(screen.getByText("语境练习")).toBeInTheDocument();
```

Add a new test:

```ts
it("opens mobile Context Lab from the home context card", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <EnglishWorldMobile />
    </MemoryRouter>,
  );

  await user.click(screen.getByText("语境练习"));

  expect(await screen.findByText("Mock Exercise Agent")).toBeInTheDocument();
});
```

If the current mocked component name changes, keep the mock text in `EnglishWorldMobile.test.tsx` as `Mock Exercise Agent` so this test stays focused on routing.

- [ ] **Step 5: Add attempt CSS and run tests**

Append:

```css
.mobile-context-attempts,
.mobile-context-attempt-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
}

.mobile-context-attempt-detail {
  border-top: 1px solid #e5eaf2;
  color: #334155;
  line-height: 1.6;
  padding-top: 8px;
}
```

Run:

```bash
pnpm --filter @font/english-world test -- --run src/page/englishWorldMobile/ExerciseAgentTabMobile.test.tsx src/page/englishWorldMobile/EnglishWorldMobile.test.tsx
```

Expected: PASS.

### Task 6: Verification And Cleanup

**Files:**
- Modify only files needed to resolve verification failures.

**Interfaces:**
- Consumes all prior tasks.
- Produces a verified mobile Context Lab implementation.

- [ ] **Step 1: Run focused frontend tests**

Run:

```bash
pnpm --filter @font/english-world test -- --run src/page/englishWorldMobile/mobileContextLab.test.ts src/page/englishWorldMobile/ExerciseAgentTabMobile.test.tsx src/page/englishWorldMobile/EnglishWorldMobile.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run desktop Context Lab regression tests**

Run:

```bash
pnpm --filter @font/english-world test -- --run src/page/englishWorld/contextLab/ContextLabPage.test.tsx
```

Expected: PASS or only pre-existing failures unrelated to mobile changes. If failures are caused by shared helper changes, fix them before continuing.

- [ ] **Step 3: Run frontend type/build check**

Run:

```bash
pnpm --filter @font/english-world build
```

Expected: PASS.

- [ ] **Step 4: Run backend focused tests if backend files changed**

Run only if NestJS backend files were modified:

```bash
cd /Users/liulin/Desktop/font/english/nestjs
pnpm test -- english.service.spec.ts --runInBand
pnpm test -- exercise-agent.service.spec.ts --runInBand
pnpm build
```

Expected: PASS.

- [ ] **Step 5: Run whitespace check**

Run:

```bash
git diff --check
```

Expected: no output.

- [ ] **Step 6: Commit implementation**

Run:

```bash
git status --short
git add \
  apps/english-world/src/page/englishWorldMobile/mobileContextLab.ts \
  apps/english-world/src/page/englishWorldMobile/mobileContextLab.test.ts \
  apps/english-world/src/page/englishWorldMobile/MobileContextLabPage.tsx \
  apps/english-world/src/page/englishWorldMobile/ExerciseAgentTabMobile.tsx \
  apps/english-world/src/page/englishWorldMobile/ExerciseAgentTabMobile.test.tsx \
  apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.tsx \
  apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.test.tsx \
  apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.css
git commit -m "feat: add mobile context lab reading flow"
```

Expected: commit succeeds and does not include unrelated dirty desktop files.
