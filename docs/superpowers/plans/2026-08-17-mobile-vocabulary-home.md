# English World Mobile Vocabulary and Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the search-first mobile home and every vocabulary-maintenance workflow: browse, filter, inspect, pronounce, add, edit, delete, AI-complete, upload images, and bulk import.

**Architecture:** Put server state behind stable React Query keys and mobile feature hooks, while reusing existing word API descriptors and pure label/filter/import utilities. The list remains compact and routes to a dedicated detail page. Forms and import input use the Phase 1 draft repository; successful mutations invalidate word/recent/stat query families and remove their drafts.

**Tech Stack:** React Query, Ant Design Mobile, existing word/word-agent APIs, IndexedDB storage, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-17-english-world-mobile-pwa-full-redesign-design.md`

## Global Constraints

- Home prioritizes search, manual add, AI completion, bulk import, and recent words before review.
- Word list uses compact rows and a separate detail route; swipe actions have an equivalent overflow/detail action.
- All supported `WordList` fields remain editable.
- AI and import preview require network and preserve input when offline.
- Delete is explicit, named, confirmed, and never queued for replay.

---

### Task 1: Create the shared mobile word query layer

**Files:**
- Create: `apps/english-world/src/page/englishWorldMobile/features/words/wordQueries.ts`
- Create: `apps/english-world/src/page/englishWorldMobile/features/words/wordQueries.test.ts`

**Interfaces:**
- Produces: `wordKeys`, `fetchMobileWords`, `fetchMobileWordDetail`, `findWordById`, `MobileWordPage`.
- Consumes: `wordFilter`, `wordFindList`, `FilterWordList`, `WordList`, `normalizeMobileWordFilters`.

- [ ] **Step 1: Write failing query tests**

~~~ts
expect(wordKeys.list({ page: 1, pageSize: 20, search: "retain" })).toEqual(["mobile", "words", "list", { page: 1, pageSize: 20, search: "retain" }]);
requestMock.mockResolvedValue({ list: [{ id: 4, englishWord: "retain" }], total: 1, totalPages: 1 });
expect(await fetchMobileWords({ page: 1, pageSize: 20, search: "retain" })).toMatchObject({ total: 1 });
~~~

- [ ] **Step 2: Verify the test fails**

Run: `pnpm --filter @font/english-world exec vitest run src/page/englishWorldMobile/features/words/wordQueries.test.ts`

Expected: FAIL because the query module does not exist.

- [ ] **Step 3: Implement stable keys and fetchers**

~~~ts
export type MobileWordFilters = {
  page: number;
  pageSize: number;
  search?: string;
  englishWord?: string;
  englishChinese?: string;
  englishPhonetic?: string;
  englishType?: number;
  englishLevel?: number;
  startTime?: string;
  endTime?: string;
};
export type MobileWordPage = { list: WordList[]; total: number; totalPages: number };
export const wordKeys = {
  all: ["mobile", "words"] as const,
  list: (filters: MobileWordFilters) => [...wordKeys.all, "list", filters] as const,
  detail: (id: number) => [...wordKeys.all, "detail", id] as const,
};
export async function fetchMobileWords(filters: MobileWordFilters): Promise<MobileWordPage> {
  const quick = normalizeMobileWordFilters(
    { englishType: filters.englishType, englishLevel: filters.englishLevel },
    filters.search ?? "",
  );
  return request(wordFilter({
    page: filters.page,
    pageSize: filters.pageSize,
    ...quick,
    ...(filters.englishWord ? { englishWord: filters.englishWord } : {}),
    ...(filters.englishChinese ? { englishChinese: filters.englishChinese } : {}),
    ...(filters.startTime ? { startTime: filters.startTime } : {}),
    ...(filters.endTime ? { endTime: filters.endTime } : {}),
    ...(filters.englishPhonetic ? { englishPhonetic: filters.englishPhonetic } : {}),
  } as FilterWordList & { englishPhonetic?: string }));
}
export async function fetchMobileWordDetail(id: number): Promise<WordList> {
  const words = await request<WordList[]>(wordFindList());
  const word = words.find((item) => item.id === id);
  if (!word) throw new Error("单词不存在或已被删除。");
  return word;
}
export function findWordById(pages: MobileWordPage[], id: number) {
  return pages.flatMap((page) => page.list).find((word) => word.id === id) ?? null;
}
~~~

- [ ] **Step 4: Run the test and commit**

~~~bash
pnpm --filter @font/english-world exec vitest run src/page/englishWorldMobile/features/words/wordQueries.test.ts
git add apps/english-world/src/page/englishWorldMobile/features/words
git commit -m "feat: add mobile word query layer"
~~~

### Task 2: Build the search-first home and recent-word cache

**Files:**
- Create: `apps/english-world/src/page/englishWorldMobile/features/home/MobileHomePage.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/features/home/MobileHomePage.test.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/features/home/recentWordStore.ts`
- Create: `apps/english-world/src/page/englishWorldMobile/features/home/recentWordStore.test.ts`
- Modify: `apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.tsx`

**Interfaces:**
- Produces: `recentWordStore.record(userId, word)` and `recentWordStore.list(userId, limit)`.
- Consumes: `mobileStorage`, `wordKeys`, `/mobile/words/:wordId`.

- [ ] **Step 1: Write failing priority and persistence tests**

~~~tsx
renderMobile(<MobileHomePage />, { route: "/mobile" });
const headings = screen.getAllByRole("heading").map((node) => node.textContent);
expect(headings.indexOf("最近查看")).toBeLessThan(headings.indexOf("今日学习"));
expect(screen.getByRole("searchbox", { name: "搜索单词、释义或标签" })).toBeVisible();
expect(screen.getByRole("link", { name: "手动添加" })).toHaveAttribute("href", "/mobile/words/new");
~~~

- [ ] **Step 2: Verify failure**

Run: `pnpm --filter @font/english-world exec vitest run src/page/englishWorldMobile/features/home`

- [ ] **Step 3: Implement the recent-word adapter and page**

~~~ts
const snapshotKey = "recent-words.v1";
export const recentWordStore = {
  async record(userId: number, word: WordList) {
    const current = (await mobileStorage.getSnapshot<WordList[]>(userId, snapshotKey)) ?? [];
    await mobileStorage.putSnapshot(userId, snapshotKey, [word, ...current.filter((item) => item.id !== word.id)].slice(0, 20));
  },
  async list(userId: number, limit = 5) {
    return ((await mobileStorage.getSnapshot<WordList[]>(userId, snapshotKey)) ?? []).slice(0, limit);
  },
};
~~~

Home submits non-empty search to `/mobile/words?q=...`, renders cached recent words when offline, and disables AI/new-task actions with explicit network copy while leaving local navigation available.

- [ ] **Step 4: Verify and commit**

~~~bash
pnpm --filter @font/english-world exec vitest run src/page/englishWorldMobile/features/home
git add apps/english-world/src/page/englishWorldMobile/features/home apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.tsx
git commit -m "feat: add search-first mobile home"
~~~

### Task 3: Build the compact word library

**Files:**
- Create: `apps/english-world/src/page/englishWorldMobile/features/words/MobileWordLibraryPage.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/features/words/MobileWordFiltersSheet.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/features/words/MobileWordRow.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/features/words/MobileWordSelectionBar.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/features/words/MobileWordLibraryPage.test.tsx`
- Modify: `apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.tsx`

**Interfaces:**
- Consumes: `fetchMobileWords`, `wordKeys`, `MobileBritishPronunciationButton`, label/filter utilities.
- Produces: URL-owned `q`, `word`, `meaning`, `phonetic`, `type`, `level`, `start`, `end`, `sort` filters, infinite-page rendering, and explicit batch-selection mode.

- [ ] **Step 1: Write failing list behavior tests**

~~~tsx
renderMobile(<MobileWordLibraryPage />, { route: "/mobile/words?q=ret" });
expect(await screen.findByRole("link", { name: /retain/ })).toHaveAttribute("href", "/mobile/words/4");
await user.click(screen.getByRole("button", { name: "播放 retain 的英式发音" }));
expect(navigateMock).not.toHaveBeenCalled();
await user.click(screen.getByRole("button", { name: "筛选" }));
expect(screen.getByRole("dialog", { name: "筛选词库" })).toBeVisible();
await user.click(screen.getByRole("button", { name: "选择" }));
await user.click(screen.getByRole("checkbox", { name: "选择 retain" }));
expect(screen.getByRole("toolbar", { name: "已选择 1 个词" })).toBeVisible();
~~~

- [ ] **Step 2: Verify failure**

Run: `pnpm --filter @font/english-world exec vitest run src/page/englishWorldMobile/features/words/MobileWordLibraryPage.test.tsx`

- [ ] **Step 3: Implement query-driven list and filter sheet**

Use `useInfiniteQuery` with `pageSize: 20`; `getNextPageParam` returns the next page only while flattened length is less than `total`. Search and filters update the URL with `replace`; pull-to-refresh invalidates `wordKeys.list(filters)`. The advanced filter sheet preserves every desktop filter: English word, Chinese meaning, type, date range, phonetic, and mastery. The row shows mastery dot, word, phonetic/meaning, pronunciation, and disclosure only.

~~~tsx
<MobileWordRow
  word={word}
  href={"/mobile/words/" + word.id}
  menuItems={[
    { key: "edit", label: "编辑" },
    { key: "delete", label: "删除", danger: true },
  ]}
/>
~~~

Selection mode exposes `全选当前页`, `使用当前筛选结果`, `开始混合记忆`, `生成语境题`, and `批量设为` in one bottom-safe action sheet. Resolve current-filter IDs with `wordFilter({ ...filters, page: 1, pageSize: total })` and reject when the returned total changed. Mixed learning allows at most 20 words; Context Lab requires 3–20 selected words; batch mastery uses `wordUpdateLevel` per selected ID, rolls optimistic rows back on any failed update, and invalidates `wordKeys.all` after success.

~~~ts
export type MobileWordSelection = { mode: "ids"; wordIds: number[] } | { mode: "current-filter"; filters: FilterWordList; expectedTotal: number };
const learningPath = "/mobile/learn?scope=selection&wordIds=" + selectedIds.join(",");
const contextPath = "/mobile/tools/context-lab/new?source=word-library&words=" + encodeURIComponent(selectedWords.join(","));
~~~

- [ ] **Step 4: Verify empty/error/offline states and commit**

~~~bash
pnpm --filter @font/english-world exec vitest run src/page/englishWorldMobile/features/words
git add apps/english-world/src/page/englishWorldMobile/features/words apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.tsx
git commit -m "feat: add compact mobile word library"
~~~

### Task 4: Add word detail and destructive maintenance actions

**Files:**
- Create: `apps/english-world/src/page/englishWorldMobile/features/words/MobileWordDetailPage.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/features/words/MobileWordDetailPage.test.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/components/MobileImageViewer.tsx`
- Modify: `apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.tsx`

**Interfaces:**
- Consumes: word query cache, `wordDel`, `wordUpdateLevel`, `recentWordStore`.
- Produces: detail sections and confirmed mutation invalidation.

- [ ] **Step 1: Write failing detail/delete tests**

~~~tsx
expect(await screen.findByRole("heading", { name: "retain" })).toBeVisible();
expect(screen.getByText("来源")).toBeVisible();
await user.click(screen.getByRole("button", { name: "删除单词" }));
expect(screen.getByRole("dialog", { name: "删除 retain？" })).toHaveTextContent("删除后无法恢复");
expect(requestMock).not.toHaveBeenCalledWith(expect.objectContaining({ url: "/english/delEnglishWord" }));
~~~

- [ ] **Step 2: Implement full detail and safe actions**

Render definition, pronunciation, examples/notes, tags, source, image, mastery, timestamps, edit, review, external dictionary query, and delete. `MobileImageViewer` uses the existing `react-photo-view` package and enables deliberate pinch/pan. The external query opens `https://www.baidu.com/s?wd=<encoded word>` with `noopener,noreferrer`. Confirmed delete calls `request(wordDel({ id }))`, invalidates `wordKeys.all`, and navigates to `/mobile/words`; it is blocked offline and never stored as a draft.

~~~tsx
<MobilePage title={word.englishWord} backTo="/mobile/words">
  <WordDetailCard word={word} onImageOpen={() => setImageOpen(true)} />
  <Button onClick={() => navigate("/mobile/words/" + word.id + "/edit")}>编辑</Button>
  <a href={"https://www.baidu.com/s?wd=" + encodeURIComponent(word.englishWord)} target="_blank" rel="noopener noreferrer">百度查询</a>
  <Button color="danger" disabled={!online} onClick={() => setDeleteOpen(true)}>删除单词</Button>
  <Dialog visible={deleteOpen} title={"删除 " + word.englishWord + "？"} onConfirm={confirmDelete}>删除后无法恢复。</Dialog>
</MobilePage>
~~~

- [ ] **Step 3: Verify and commit**

~~~bash
pnpm --filter @font/english-world exec vitest run src/page/englishWorldMobile/features/words/MobileWordDetailPage.test.tsx
git add apps/english-world/src/page/englishWorldMobile/features/words apps/english-world/src/page/englishWorldMobile/components/MobileImageViewer.tsx apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.tsx
git commit -m "feat: add mobile word detail"
~~~

### Task 5: Add draft-safe word creation and editing

**Files:**
- Create: `apps/english-world/src/page/englishWorldMobile/features/words/MobileWordFormPage.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/features/words/wordForm.ts`
- Create: `apps/english-world/src/page/englishWorldMobile/features/words/MobileWordFormPage.test.tsx`
- Modify: `apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.tsx`

**Interfaces:**
- Produces: `MobileWordFormValues`, `toWordAddPayload`, `toWordUpdatePayload`.
- Consumes: `wordExist`, `wordAdd`, `wordUpdate`, `uploadFile`, `mobileStorage`, `useMobileActivityLock`.

- [ ] **Step 1: Write failing form and draft tests**

~~~ts
expect(toWordAddPayload({ englishWord: " retain ", englishPartSpeech: [] })).toMatchObject({
  englishWord: "retain", englishLevel: 0, englishType: 0, englishPartSpeech: [],
});
~~~

~~~tsx
await user.type(screen.getByLabelText("单词或短语"), "retain");
await waitFor(() => expect(storage.putDraft).toHaveBeenCalled());
expect(screen.getByRole("button", { name: "保存" })).toBeVisible();
~~~

- [ ] **Step 2: Implement complete full-screen form**

~~~ts
export type MobileWordFormValues = Omit<WordList, "id">;
export function toWordAddPayload(values: MobileWordFormValues): Omit<WordList, "id"> {
  const englishWord = values.englishWord.trim();
  return { ...values, englishWord, englishType: values.englishType ?? (englishWord.includes(" ") ? 1 : 0), englishLevel: values.englishLevel ?? 0, englishPartSpeech: values.englishPartSpeech ?? [] };
}
~~~

Autosave after 400ms of inactivity under `word-form:new` or `word-form:<id>`. Use a bottom safe action region above the keyboard. On success remove the draft, invalidate query families, record the recent word, and route to detail. On unsaved back, confirm exit; on offline submit, keep the draft and state that saving requires network.

- [ ] **Step 3: Verify add, edit, duplicate, image failure, and commit**

~~~bash
pnpm --filter @font/english-world exec vitest run src/page/englishWorldMobile/features/words/MobileWordFormPage.test.tsx
git add apps/english-world/src/page/englishWorldMobile/features/words apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.tsx
git commit -m "feat: add mobile word forms"
~~~

### Task 6: Refactor AI word query into a routed mobile workflow

**Files:**
- Create: `apps/english-world/src/page/englishWorldMobile/features/aiWord/MobileAiWordPage.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/features/aiWord/wordAgentStream.ts`
- Create: `apps/english-world/src/page/englishWorldMobile/features/aiWord/MobileAiWordPage.test.tsx`
- Modify: `apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.tsx`
- Retain until Phase 6: `apps/english-world/src/page/englishWorldMobile/WordAgentTabMobile.tsx`

**Interfaces:**
- Produces: `queryWordAgent(input, signal, onItem)` and routes AI results into the shared word form.
- Consumes: `buildWordAgentRequestBody`, `wordAgentQuery`, `/word-agent/query-stream`.

- [ ] **Step 1: Characterize stream fallback and offline input**

~~~tsx
await user.type(screen.getByLabelText("AI 查词输入"), "confront");
fireEvent(window, new Event("offline"));
expect(screen.getByRole("button", { name: "查询" })).toBeDisabled();
expect(screen.getByText("AI 查词需要联网。你的输入已保留。")).toBeVisible();
~~~

- [ ] **Step 2: Extract the stream parser and build the page**

~~~ts
export async function queryWordAgent(
  input: string,
  signal: AbortSignal,
  onItem: (item: WordAgentItem) => void,
): Promise<void> {
  const body = buildWordAgentRequestBody(input);
  const response = await fetch(`${getApiBaseUrl()}/word-agent/query-stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok || !response.body || !response.headers.get("content-type")?.includes("event-stream")) {
    const fallback = await request<WordAgentResponse>(wordAgentQuery(body));
    fallback.words.forEach(onItem);
    return;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const event = JSON.parse(line.slice(6)) as { type: string; data?: WordAgentItem; message?: string };
        if (event.type === "word" && event.data) onItem(event.data);
        if (event.type === "error") throw new Error(event.message ?? "AI 查询失败");
      } catch (error) {
        if (error instanceof SyntaxError) continue;
        throw error;
      }
    }
  }
}
~~~

The result card offers pronunciation, correction explanation, examples, IELTS case, and `编辑并添加`, which navigates to `/mobile/words/new` with serializable route state rather than opening a nested popup. Add tests for malformed SSE payloads, stream errors, fallback responses, and abort without displaying an error toast.

- [ ] **Step 3: Verify stream, fallback, abort, and commit**

~~~bash
pnpm --filter @font/english-world exec vitest run src/page/englishWorldMobile/features/aiWord
git add apps/english-world/src/page/englishWorldMobile/features/aiWord apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.tsx
git commit -m "feat: add routed mobile AI word query"
~~~

### Task 7: Rebuild bulk import as a mobile step flow

**Files:**
- Create: `apps/english-world/src/page/englishWorldMobile/features/bulkImport/MobileBulkImportPage.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/features/bulkImport/MobileImportPreviewPage.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/features/bulkImport/MobileImportConflictSheet.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/features/bulkImport/MobileBulkImportPage.test.tsx`
- Modify: `apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.tsx`

**Interfaces:**
- Consumes: `isValidImportSourceUrl`, `toBulkImportWordPayload`, `wordBulkImportPreview`, `wordImportMissingPreview`, `wordImportMissing`.
- Produces: draft key `bulk-import:current` and route state between input and preview.

- [ ] **Step 1: Write failing preview/conflict tests**

~~~tsx
await user.type(screen.getByLabelText("导入内容"), "mitigate 缓解\nresilient");
await user.click(screen.getByRole("button", { name: "生成预览" }));
expect(await screen.findByRole("heading", { name: "导入预览" })).toBeVisible();
expect(screen.getByText("2 个词条")).toBeVisible();
~~~

- [ ] **Step 2: Implement input → preview → conflict → result**

Use full routes for input and preview, one bottom sheet for conflicts, and grouped list rows instead of desktop tables. Draft raw text, source metadata, default level, maximum items, and AI flag. Preserve input on network error. Require explicit confirmation for `overwriteExisting`; do not enqueue it offline.

~~~ts
export type MobileBulkImportDraft = {
  rawText: string;
  source: SharedImportSource;
  defaultLevel: number;
  maxItems: number;
  useAi: boolean;
};
async function confirmImport(words: Array<Omit<WordList, "id">>, overwriteExisting: boolean) {
  if (!navigator.onLine) throw new Error("导入需要联网。你的输入已保留。");
  return request(wordImportMissing({ words, overwriteExisting }));
}
~~~

- [ ] **Step 3: Verify result accounting and commit**

~~~bash
pnpm --filter @font/english-world exec vitest run src/page/englishWorldMobile/features/bulkImport
git add apps/english-world/src/page/englishWorldMobile/features/bulkImport apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.tsx
git commit -m "feat: add mobile bulk import flow"
~~~
