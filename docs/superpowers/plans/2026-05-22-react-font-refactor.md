# React Font 重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 第一阶段重构 `react-font`，让 API 配置、lint 基线、`english-world` 单词业务逻辑和自动化测试进入可维护状态。

**Architecture:** 保留现有 monorepo 和页面结构，在 `english-world` 下增加 `utils`、`hooks` 和聚焦测试。请求描述仍放在 `server/*`，页面组件只编排 UI，业务状态和参数转换下沉到 hook/工具函数。`web-utils` 只做行为等价的 lint 修复。

**Tech Stack:** React 18、TypeScript、Vite、Vitest、Ant Design、Ant Design Mobile、TanStack React Query、pnpm/turbo。

---

## 文件结构

- Modify: `apps/english-world/package.json`，新增 `test` 脚本。
- Modify: `apps/english-world/vite.config.ts`，补充 Vitest test 配置，并保留 `127.0.0.1` 代理。
- Modify: `apps/web-utils/vite.config.ts`，保留 `127.0.0.1` 代理。
- Modify: `vite.config.ts`，保留 `127.0.0.1` 代理。
- Modify: `packages/api/src/axios.ts`，支持 `VITE_API_BASE_URL`。
- Create: `apps/english-world/src/page/englishWorld/utils/wordFilters.ts`，负责筛选参数归一化。
- Create: `apps/english-world/src/page/englishWorld/utils/wordLabels.ts`，负责标签和颜色映射。
- Create: `apps/english-world/src/page/englishWorld/hooks/useWordList.ts`，负责单词列表状态、分页和查询。
- Create: `apps/english-world/src/page/englishWorld/hooks/useWordStats.ts`，负责统计数据转换。
- Create: `apps/english-world/src/page/englishWorld/utils/wordFilters.test.ts`。
- Create: `apps/english-world/src/page/englishWorld/utils/wordLabels.test.ts`。
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.tsx`，接入 `useWordList` 和工具函数。
- Modify: `apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.tsx`，复用标签/筛选工具，保留移动 UI。
- Modify: `apps/web-utils/src/page/home/home.tsx`，移除 render 阶段 `Math.random()`。
- Modify: `apps/web-utils/src/page/transferSlash/transferSlash.tsx`，修复 `prefer-const`。
- Modify: `apps/web-utils/src/page/user/userList/userList.tsx`，修复 BroadcastChannel 生命周期、函数声明顺序和 `any`。
- Modify: `apps/web-utils/src/server/authId/authId.ts`，移除 `any`。

## Task 1: 测试脚本与 API 配置

**Files:**
- Modify: `apps/english-world/package.json`
- Modify: `apps/english-world/vite.config.ts`
- Modify: `packages/api/src/axios.ts`
- Test: `apps/english-world/src/page/englishWorld/utils/wordFilters.test.ts`

- [ ] **Step 1: 写一个会失败的 Vitest 测试**

Create `apps/english-world/src/page/englishWorld/utils/wordFilters.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { removeEmptyValues } from "./wordFilters";

describe("removeEmptyValues", () => {
  it("移除 undefined、null 和空字符串，但保留 0", () => {
    expect(
      removeEmptyValues({
        englishWord: "test",
        englishChinese: "",
        englishType: 0,
        englishLevel: undefined,
        startTime: null,
      }),
    ).toEqual({
      englishWord: "test",
      englishType: 0,
    });
  });
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run:

```bash
pnpm --filter @font/english-world test -- --run src/page/englishWorld/utils/wordFilters.test.ts
```

Expected: FAIL，因为 `test` 脚本或 `wordFilters` 尚不存在。

- [ ] **Step 3: 新增测试脚本和最小工具函数**

Modify `apps/english-world/package.json` scripts:

```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "lint": "eslint .",
  "test": "vitest",
  "preview": "vite preview"
}
```

Create `apps/english-world/src/page/englishWorld/utils/wordFilters.ts`:

```ts
export type WordFilterRecord = Record<string, unknown>;

export function removeEmptyValues<T extends WordFilterRecord>(values: T) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => {
      return value !== undefined && value !== null && value !== "";
    }),
  ) as Partial<T>;
}
```

- [ ] **Step 4: 让 Vite 测试配置可用，并修复 API base URL**

Modify `apps/english-world/vite.config.ts`:

```ts
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "jsdom",
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
});
```

Modify `packages/api/src/axios.ts`:

```ts
const API_BASE =
  import.meta.env?.VITE_API_BASE_URL ||
  (import.meta.env?.DEV ? "/api" : "http://47.108.140.63:3001");
```

- [ ] **Step 5: 验证测试通过**

Run:

```bash
pnpm --filter @font/english-world test -- --run src/page/englishWorld/utils/wordFilters.test.ts
```

Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add apps/english-world/package.json apps/english-world/vite.config.ts packages/api/src/axios.ts apps/english-world/src/page/englishWorld/utils/wordFilters.ts apps/english-world/src/page/englishWorld/utils/wordFilters.test.ts
git commit -m "test: add english world utility test baseline"
```

## Task 2: 筛选和标签纯函数

**Files:**
- Modify: `apps/english-world/src/page/englishWorld/utils/wordFilters.ts`
- Create: `apps/english-world/src/page/englishWorld/utils/wordLabels.ts`
- Modify: `apps/english-world/src/page/englishWorld/utils/wordFilters.test.ts`
- Create: `apps/english-world/src/page/englishWorld/utils/wordLabels.test.ts`

- [ ] **Step 1: 写筛选归一化失败测试**

Append to `wordFilters.test.ts`:

```ts
import dayjs from "dayjs";
import { normalizeDesktopWordFilters, normalizeMobileWordFilters } from "./wordFilters";

it("把桌面端时间范围转换为后端筛选参数", () => {
  expect(
    normalizeDesktopWordFilters({
      englishWord: "hello",
      englishChinese: "",
      englishType: 0,
      time: [dayjs("2026-05-01"), dayjs("2026-05-02")],
    }),
  ).toMatchObject({
    englishWord: "hello",
    englishType: 0,
    startTime: "2026-05-01 00:00:00",
    endTime: "2026-05-02 23:59:59",
  });
});

it("把移动端搜索词合并到 englishWord", () => {
  expect(
    normalizeMobileWordFilters(
      { englishType: 1, englishChinese: "" },
      "apple",
    ),
  ).toEqual({
    englishType: 1,
    englishWord: "apple",
  });
});
```

- [ ] **Step 2: 写标签失败测试**

Create `wordLabels.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getLevelLabel, getTypeLabel, getPartSpeechLabel } from "./wordLabels";

describe("wordLabels", () => {
  it("返回单词类型标签", () => {
    expect(getTypeLabel(1)).toEqual({ label: "短语", color: "success" });
  });

  it("返回掌握程度标签", () => {
    expect(getLevelLabel(3)).toEqual({ label: "精通", color: "success" });
  });

  it("返回词性标签", () => {
    expect(getPartSpeechLabel(2)).toEqual({ label: "名词", color: "success" });
  });
});
```

- [ ] **Step 3: 运行测试并确认失败**

Run:

```bash
pnpm --filter @font/english-world test -- --run src/page/englishWorld/utils
```

Expected: FAIL，因为新增函数尚不存在。

- [ ] **Step 4: 实现筛选工具**

Update `wordFilters.ts`:

```ts
import { convertToFormat } from "@font/utils";

export type WordFilterRecord = Record<string, unknown>;

export type DesktopWordFilterValues = WordFilterRecord & {
  time?: [unknown, unknown] | null;
};

export type MobileWordFilterValues = {
  englishType?: number;
  englishLevel?: number;
  englishChinese?: string;
};

export function removeEmptyValues<T extends WordFilterRecord>(values: T) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => {
      return value !== undefined && value !== null && value !== "";
    }),
  ) as Partial<T>;
}

export function normalizeDesktopWordFilters(values: DesktopWordFilterValues) {
  const { time, ...rest } = values;
  const normalized: WordFilterRecord = { ...rest };

  if (Array.isArray(time) && time[0] && time[1]) {
    normalized.startTime = convertToFormat(time[0], "start");
    normalized.endTime = convertToFormat(time[1], "end");
  }

  return removeEmptyValues(normalized);
}

export function normalizeMobileWordFilters(
  values: MobileWordFilterValues,
  searchKeyword: string,
) {
  return removeEmptyValues({
    ...values,
    englishWord: searchKeyword.trim() || undefined,
  });
}
```

- [ ] **Step 5: 实现标签工具**

Create `wordLabels.ts`:

```ts
export type WordTagColor =
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "default";

export type WordLabel = {
  label: string;
  color: WordTagColor;
};

const TYPE_LABELS: Record<number, WordLabel> = {
  0: { label: "单词", color: "primary" },
  1: { label: "短语", color: "success" },
  2: { label: "句子", color: "warning" },
};

const LEVEL_LABELS: Record<number, WordLabel> = {
  0: { label: "不会", color: "danger" },
  1: { label: "一般", color: "warning" },
  2: { label: "熟练", color: "primary" },
  3: { label: "精通", color: "success" },
};

const PART_SPEECH_LABELS: Record<number, WordLabel> = {
  1: { label: "动词", color: "primary" },
  2: { label: "名词", color: "success" },
  3: { label: "形容词", color: "warning" },
  4: { label: "副词", color: "default" },
  5: { label: "代词", color: "danger" },
  6: { label: "介词", color: "default" },
  7: { label: "连词", color: "default" },
  8: { label: "感叹词", color: "default" },
  9: { label: "未分类", color: "default" },
};

export function getTypeLabel(type?: number) {
  return TYPE_LABELS[type ?? 0] ?? TYPE_LABELS[0];
}

export function getLevelLabel(level?: number) {
  return LEVEL_LABELS[level ?? 0] ?? LEVEL_LABELS[0];
}

export function getPartSpeechLabel(partSpeech?: number) {
  return PART_SPEECH_LABELS[partSpeech ?? 9] ?? PART_SPEECH_LABELS[9];
}
```

- [ ] **Step 6: 验证测试通过**

Run:

```bash
pnpm --filter @font/english-world test -- --run src/page/englishWorld/utils
```

Expected: PASS。

- [ ] **Step 7: 提交**

```bash
git add apps/english-world/src/page/englishWorld/utils
git commit -m "refactor: add word filter and label utilities"
```

## Task 3: 抽出桌面端单词列表 Hook

**Files:**
- Create: `apps/english-world/src/page/englishWorld/hooks/useWordList.ts`
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.tsx`

- [ ] **Step 1: 写 hook 文件骨架**

Create `useWordList.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from "react";
import request from "@font/api";
import { wordFilter } from "@/server/word/word";
import type { FilterWordList, WordList } from "@/server/word/word.type";

type ListData = {
  list: WordList[];
  total: number;
  totalPages: number;
};

export function useWordList(initialPageSize = 10) {
  const [wordList, setWordList] = useState<WordList[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [totalNum, setTotalNum] = useState(0);
  const filterParamsRef = useRef<Record<string, unknown>>({});

  const fetchWordData = useCallback(
    async (
      nextPage: number,
      nextPageSize: number,
      filters: Record<string, unknown> = filterParamsRef.current,
    ) => {
      setLoading(true);
      try {
        const res = await request<ListData>(
          wordFilter({
            page: nextPage,
            pageSize: nextPageSize,
            ...filters,
          } as FilterWordList),
        );
        setWordList(res.list);
        setTotalNum(res.total);
      } catch (error) {
        console.error("加载数据失败:", error);
        setWordList([]);
        setTotalNum(0);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchWordData(page, pageSize);
  }, [fetchWordData, page, pageSize]);

  const search = async (filters: Record<string, unknown>) => {
    filterParamsRef.current = filters;
    setPage(1);
    await fetchWordData(1, pageSize, filters);
  };

  const reset = async () => {
    filterParamsRef.current = {};
    setPage(1);
    setPageSize(initialPageSize);
    await fetchWordData(1, initialPageSize, {});
  };

  const refresh = async () => {
    await fetchWordData(page, pageSize, filterParamsRef.current);
  };

  const changePage = (nextPage: number, nextPageSize: number) => {
    setPage(nextPage);
    setPageSize(nextPageSize);
  };

  return {
    wordList,
    loading,
    page,
    pageSize,
    totalNum,
    currentFilters: filterParamsRef.current,
    fetchWordData,
    search,
    reset,
    refresh,
    changePage,
  };
}
```

- [ ] **Step 2: 接入桌面页面**

Modify `EnglishWorld.tsx`:

```ts
import { useWordList } from "./hooks/useWordList";
import { normalizeDesktopWordFilters } from "./utils/wordFilters";
```

Replace local list state and `fetchWordData` with:

```ts
const {
  wordList,
  loading,
  page,
  pageSize,
  totalNum,
  currentFilters,
  search,
  reset,
  refresh,
  changePage,
} = useWordList(10);
```

Update handlers:

```ts
const handleSearch = async () => {
  await search(normalizeDesktopWordFilters(form.getFieldsValue()));
};

const handleReset = async () => {
  form.resetFields();
  await reset();
};

const handlePageChange = (page: number, pageSize: number) => {
  changePage(page, pageSize);
};
```

After successful edit:

```ts
await refresh();
```

After successful add:

```ts
await search(currentFilters);
```

- [ ] **Step 3: 验证构建**

Run:

```bash
pnpm --filter @font/english-world build
```

Expected: PASS。

- [ ] **Step 4: 提交**

```bash
git add apps/english-world/src/page/englishWorld/hooks/useWordList.ts apps/english-world/src/page/englishWorld/EnglishWorld.tsx
git commit -m "refactor: extract desktop word list hook"
```

## Task 4: 移动端复用工具函数

**Files:**
- Modify: `apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.tsx`

- [ ] **Step 1: 替换移动端内联标签函数**

Import:

```ts
import {
  getLevelLabel,
  getPartSpeechLabel,
  getTypeLabel,
} from "@/page/englishWorld/utils/wordLabels";
import { normalizeMobileWordFilters } from "@/page/englishWorld/utils/wordFilters";
```

Remove local `getTypeLabel`、`getLevelLabel` and `partSpeechOptions` duplication. Define `partSpeechOptions` from utility calls:

```ts
const partSpeechOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((value) => ({
  value,
  ...getPartSpeechLabel(value),
}));
```

- [ ] **Step 2: 替换移动端请求参数拼接**

In `loadWordData`, replace inline object:

```ts
wordFilter({
  page: pageNum,
  pageSize,
  ...normalizeMobileWordFilters(filterValues, searchKeyword),
})
```

- [ ] **Step 3: 验证测试和构建**

Run:

```bash
pnpm --filter @font/english-world test -- --run src/page/englishWorld/utils
pnpm --filter @font/english-world build
```

Expected: both PASS。

- [ ] **Step 4: 提交**

```bash
git add apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.tsx
git commit -m "refactor: reuse word utilities in mobile page"
```

## Task 5: 修复 web-utils lint 基线

**Files:**
- Modify: `apps/web-utils/src/page/home/home.tsx`
- Modify: `apps/web-utils/src/page/transferSlash/transferSlash.tsx`
- Modify: `apps/web-utils/src/page/user/userList/userList.tsx`
- Modify: `apps/web-utils/src/server/authId/authId.ts`

- [ ] **Step 1: 修复 Home render 随机数**

Move generated data outside component:

```ts
const data = Array.from({ length: 100 }, (_, index) => {
  const rowNumber = index + 1;
  return {
    key: String(rowNumber),
    name: names[rowNumber % names.length],
    age: 20 + (rowNumber % 41),
    address: addresses[rowNumber % addresses.length],
    details: details[rowNumber % details.length],
  };
});
```

- [ ] **Step 2: 修复 prefer-const**

In `transferSlash.tsx`, replace:

```ts
let textArea = document.createElement("textarea");
let successful = document.execCommand("copy");
let msg = successful ? "successful" : "unsuccessful";
```

with:

```ts
const textArea = document.createElement("textarea");
const successful = document.execCommand("copy");
const msg = successful ? "successful" : "unsuccessful";
```

- [ ] **Step 3: 修复 UserList 生命周期和类型**

Use:

```ts
type UserRow = {
  key?: React.Key;
  userName?: string;
  userPhone?: string;
  userSex?: string;
  userAge?: number;
};

const getUserList = useCallback(async () => {
  const res = await request<{ data?: UserRow[] }>(userFindList());
  setDataSource(res?.data ?? []);
}, []);

useEffect(() => {
  const channel = new BroadcastChannel("ADD");
  channel.onmessage = (event) => {
    if (event.data === "UPDATE") {
      void getUserList();
    }
  };

  void getUserList();

  return () => channel.close();
}, [getUserList]);
```

- [ ] **Step 4: 修复 authId request 类型**

Use:

```ts
export type AuthIdPayload = Record<string, unknown>;

export const userCreate = (data: AuthIdPayload) => {
  return {
    url: "/auth-id-map/createCookie",
    data,
    method: "POST",
  };
};

export const findModel = (data: AuthIdPayload) => {
  return {
    url: "/auth-id-map/findModel",
    data,
    method: "POST",
  };
};
```

- [ ] **Step 5: 验证 lint**

Run:

```bash
pnpm lint
```

Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add apps/web-utils/src/page/home/home.tsx apps/web-utils/src/page/transferSlash/transferSlash.tsx apps/web-utils/src/page/user/userList/userList.tsx apps/web-utils/src/server/authId/authId.ts
git commit -m "fix: restore web utils lint baseline"
```

## Task 6: 最终验证

**Files:**
- Modify only if verification exposes a concrete regression.

- [ ] **Step 1: 跑自动化测试**

```bash
pnpm --filter @font/english-world test -- --run
```

Expected: PASS。

- [ ] **Step 2: 跑构建**

```bash
pnpm --filter @font/english-world build
pnpm --filter @font/web-utils build
```

Expected: both PASS。

- [ ] **Step 3: 跑全量 lint**

```bash
pnpm lint
```

Expected: PASS。

- [ ] **Step 4: 检查工作区**

```bash
git status --short
```

Expected: only intentional files changed; `.turbo/cookies/2.cookie` remains untracked and should not be committed.

## 自检

- 设计文档中的 API 配置、lint 基线、单词工具函数、桌面 hook、移动复用和自动化测试均有任务覆盖。
- 计划未包含视觉重做、后端 API 或数据库变更。
- 自动化测试从 Task 1 开始建立，并在最终验证中强制执行。
