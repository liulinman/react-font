# English World Mobile Context Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Context Lab as a complete drill-down mobile flow covering tasks, generation, reading, selected-word actions, answering, results, attempt history, PDF actions, and deletion.

**Architecture:** Reuse the existing Context Lab API descriptors, planning normalizers, task-state helpers, article parsing/translation helpers, question labeling, and mobile selection/import utilities. Give each stage its own route and server query. Persist reader position, marked words, elapsed time, and answer drafts; server attempts remain authoritative.

**Tech Stack:** React Query, Ant Design Mobile, existing SSE/API contracts, IndexedDB, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-17-english-world-mobile-pwa-full-redesign-design.md`

## Global Constraints

- Route sequence is task list → create → read → answer → result → attempts.
- No desktop split pane or nested modal workspace.
- Selecting article text must coexist with iOS edge-back and image/reading zoom.
- Generating, translating, submitting, deleting, and downloading require network.
- Unsubmitted answers and reading position survive reload/offline; destructive actions are never replayed.

---

### Task 1: Create Context Lab route/query contracts

**Files:**
- Create: `apps/english-world/src/page/englishWorldMobile/features/contextLab/contextLabRoutes.ts`
- Create: `apps/english-world/src/page/englishWorldMobile/features/contextLab/contextLabQueries.ts`
- Create: `apps/english-world/src/page/englishWorldMobile/features/contextLab/contextLabRoutes.test.ts`

**Interfaces:**
- Produces: `mobileContextLabRoutes`, `contextLabKeys`, strict parameter readers.
- Consumes: `contextLabHistory`, `contextLabDetail`, `contextLabAttemptHistory`, `contextLabAttemptDetail`.

- [ ] **Step 1: Write failing route tests**

~~~ts
expect(readTaskId({ taskId: "42" })).toBe(42);
expect(() => readTaskId({ taskId: "0" })).toThrow("无效的练习任务");
expect(mobileContextLabRoutes.result(42, 9)).toBe("/mobile/tools/context-lab/42/result/9");
~~~

- [ ] **Step 2: Verify failure**

Run: `pnpm --filter @font/english-world exec vitest run src/page/englishWorldMobile/features/contextLab/contextLabRoutes.test.ts`

- [ ] **Step 3: Implement exact route and key builders**

~~~ts
export const mobileContextLabRoutes = {
  list: "/mobile/tools/context-lab",
  create: "/mobile/tools/context-lab/new",
  read: (taskId: number) => "/mobile/tools/context-lab/" + taskId + "/read",
  answer: (taskId: number) => "/mobile/tools/context-lab/" + taskId + "/answer",
  result: (taskId: number, attemptId: number) => "/mobile/tools/context-lab/" + taskId + "/result/" + attemptId,
  attempts: (taskId: number) => "/mobile/tools/context-lab/" + taskId + "/attempts",
};
export const contextLabKeys = {
  all: ["mobile", "context-lab"] as const,
  history: (filters: ContextLabHistoryParams) => [...contextLabKeys.all, "history", filters] as const,
  task: (taskId: number) => [...contextLabKeys.all, "task", taskId] as const,
  attempts: (taskId: number) => [...contextLabKeys.all, "attempts", taskId] as const,
  attempt: (attemptId: number) => [...contextLabKeys.all, "attempt", attemptId] as const,
};
~~~

- [ ] **Step 4: Verify and commit**

~~~bash
pnpm --filter @font/english-world exec vitest run src/page/englishWorldMobile/features/contextLab/contextLabRoutes.test.ts
git add apps/english-world/src/page/englishWorldMobile/features/contextLab
git commit -m "feat: add mobile Context Lab contracts"
~~~

### Task 2: Build the task list with live status updates

**Files:**
- Create: `apps/english-world/src/page/englishWorldMobile/features/contextLab/MobileContextTaskListPage.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/features/contextLab/MobileContextTaskRow.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/features/contextLab/MobileContextTaskListPage.test.tsx`
- Modify: `apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.tsx`

**Interfaces:**
- Consumes: `contextLabHistory`, `subscribeContextLabTaskEvents`, `isContextLabTaskActive`, status label/tone/description helpers.
- Produces: filtered task list and create/read/retry/attempt navigation.

- [ ] **Step 1: Write failing status-update tests**

~~~tsx
expect(await screen.findByText("生成中")).toBeVisible();
act(() => taskEventHandler({ ...task, status: "succeeded", articleExerciseId: 88 }));
expect(screen.getByRole("link", { name: /开始阅读/ })).toHaveAttribute("href", "/mobile/tools/context-lab/12/read");
~~~

- [ ] **Step 2: Implement query cache patching**

~~~ts
function mergeTaskUpdate(pages: ContextLabHistoryResponse[], updated: ContextLabTask) {
  return pages.map((page) => ({ ...page, list: page.list.map((task) => task.taskId === updated.taskId ? updated : task) }));
}
~~~

Subscribe only while online/authenticated. Patch matching list and detail caches on `task-updated`; refetch after reconnect. Render cached task rows offline with timestamps. Failed tasks link to create with their serializable source values.

- [ ] **Step 3: Verify and commit**

~~~bash
pnpm --filter @font/english-world exec vitest run src/page/englishWorldMobile/features/contextLab/MobileContextTaskListPage.test.tsx
git add apps/english-world/src/page/englishWorldMobile/features/contextLab apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.tsx
git commit -m "feat: add mobile Context Lab task list"
~~~

### Task 3: Build the full-screen task creator

**Files:**
- Create: `apps/english-world/src/page/englishWorldMobile/features/contextLab/MobileContextCreatePage.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/features/contextLab/MobileContextCreatePage.test.tsx`
- Modify: `apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.tsx`

**Interfaces:**
- Consumes: `buildContextLabGenerateParams`, supported question types, IELTS constants, `parseMicroContextEntry`, `buildMicroGenerateParams`, `contextLabCreateTask`.
- Draft key: `context-create:current`.

- [ ] **Step 1: Write failing source-mode tests**

~~~tsx
for (const label of ["今日薄弱词", "按掌握程度", "随机 IELTS", "雅思核心", "手输词", "粘贴材料"]) {
  expect(screen.getByRole("radio", { name: label })).toBeVisible();
}
await user.click(screen.getByRole("radio", { name: "粘贴材料" }));
expect(screen.getByLabelText("材料正文")).toBeVisible();
expect(screen.getByRole("group", { name: "题型" })).toBeVisible();
~~~

- [ ] **Step 2: Implement creation and idempotent retry**

Normalize every source through `buildContextLabGenerateParams`. Persist selected source and editable fields. Block duplicate taps while one identical generation request is in flight; preserve `requestUid` only for custom/micro payloads whose existing contract supports it. After creation navigate to list and show live pending state; for valid micro entries, create once and route to its task state. Offline keeps input and displays `新任务需要联网`.

~~~ts
const params = buildContextLabGenerateParams(formValues);
const payloadKey = JSON.stringify(params);
if (inFlightPayloadKey.current === payloadKey) return;
inFlightPayloadKey.current = payloadKey;
const task = await request(contextLabCreateTask(params));
navigate(mobileContextLabRoutes.list, { state: { createdTaskId: task.taskId } });
~~~

- [ ] **Step 3: Verify all source variants and commit**

~~~bash
pnpm --filter @font/english-world exec vitest run src/page/englishWorldMobile/features/contextLab/MobileContextCreatePage.test.tsx
git add apps/english-world/src/page/englishWorldMobile/features/contextLab apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.tsx
git commit -m "feat: add mobile Context Lab creation"
~~~

### Task 4: Build the reader with selection, translation, and word import

**Files:**
- Create: `apps/english-world/src/page/englishWorldMobile/features/contextLab/MobileContextReaderPage.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/features/contextLab/MobileSelectionToolbar.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/features/contextLab/contextReaderDraft.ts`
- Create: `apps/english-world/src/page/englishWorldMobile/features/contextLab/MobileContextReaderPage.test.tsx`
- Modify: `apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.tsx`

**Interfaces:**
- Consumes: `parseMobileContextArticle`, `cleanMobileSelectedText`, `buildMobileMarkedWord`, `mergeMobileImportPreview`, `toMobileImportPayload`, article translation helpers and word import APIs.
- Draft key: `context-reader:<taskId>`.

- [ ] **Step 1: Write failing reader/selection tests**

~~~tsx
expect(await screen.findByRole("heading", { name: "Why Cities Need More Quiet Spaces" })).toBeVisible();
selectText("significant");
expect(screen.getByRole("toolbar", { name: "选中文本操作" })).toBeVisible();
expect(screen.getByRole("button", { name: "标记单词" })).toBeVisible();
expect(screen.getByRole("button", { name: "翻译" })).toBeVisible();
expect(screen.getByRole("button", { name: "加入词库" })).toBeVisible();
~~~

- [ ] **Step 2: Implement reader state and gesture boundaries**

Store `scrollTop` and marked words after a short idle delay. Restore only after article content renders. The selection toolbar appears above the bottom safe area, never intercepts the left-edge back zone, and has a close button. Translation calls `contextLabTranslateArticle` online and caches blocks; word import uses preview, optional AI enrichment, and explicit confirmation.

~~~ts
export type ContextReaderDraftV1 = { version: 1; taskId: number; scrollTop: number; markedWords: MobileMarkedWord[] };
const saveReaderDraft = (draft: ContextReaderDraftV1) =>
  mobileStorage.putDraft({ key: String(draft.taskId), userId, kind: "context-reader", updatedAt: new Date().toISOString(), value: draft });
const translations = await request(contextLabTranslateArticle({ article: task.article ?? "", modelProvider }));
~~~

- [ ] **Step 3: Verify offline reading and commit**

~~~bash
pnpm --filter @font/english-world exec vitest run src/page/englishWorldMobile/features/contextLab/MobileContextReaderPage.test.tsx
git add apps/english-world/src/page/englishWorldMobile/features/contextLab apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.tsx
git commit -m "feat: add mobile Context Lab reader"
~~~

### Task 5: Build the answer route with durable drafts

**Files:**
- Create: `apps/english-world/src/page/englishWorldMobile/features/contextLab/MobileContextAnswerPage.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/features/contextLab/contextAnswerDraft.ts`
- Create: `apps/english-world/src/page/englishWorldMobile/features/contextLab/MobileContextAnswerPage.test.tsx`
- Modify: `apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.tsx`

**Interfaces:**
- Consumes: `getMobileQuestionKey`, `formatContextLabQuestionTypeLabel`, `contextLabSubmit`.
- Produces: `ContextAnswerDraftV1` and navigation to result.
- Draft key: `context-answer:<taskId>`.

- [ ] **Step 1: Write failing restore/submit tests**

~~~ts
export type ContextAnswerDraftV1 = { version: 1; taskId: number; sessionId: number; answers: Record<string, number>; elapsedSeconds: number; submitStartedAt?: string };
~~~

~~~tsx
expect(screen.getByText("第 1 / 8 题")).toBeVisible();
await user.click(screen.getByRole("radio", { name: "Urban farming" }));
expect(storage.putDraft).toHaveBeenCalled();
~~~

- [ ] **Step 2: Implement one-column answer flow**

Render one question at a time with visible previous/next controls and a question index sheet. Persist choice and elapsed time. Before submit, show unanswered count. Offline leaves submit disabled but retains all answers. Because the existing submit contract has no client idempotency key, a failed submission requires an explicit user-confirmed retry and copy cannot promise deduplication. Clear the draft only after `contextLabSubmit` returns an authoritative result and result route is established.

~~~tsx
<QuestionStage question={questions[index]} selectedIndex={draft.answers[questionKey]} onSelect={(selectedIndex) => updateAnswer(questionKey, selectedIndex)} />
<SafeAreaActions>
  <Button disabled={index === 0} onClick={() => setIndex(index - 1)}>上一题</Button>
  <Button onClick={index === questions.length - 1 ? openSubmitSummary : () => setIndex(index + 1)}>{index === questions.length - 1 ? "检查并提交" : "下一题"}</Button>
</SafeAreaActions>
~~~

- [ ] **Step 3: Verify and commit**

~~~bash
pnpm --filter @font/english-world exec vitest run src/page/englishWorldMobile/features/contextLab/MobileContextAnswerPage.test.tsx
git add apps/english-world/src/page/englishWorldMobile/features/contextLab apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.tsx
git commit -m "feat: add mobile Context Lab answers"
~~~

### Task 6: Add results and attempt history

**Files:**
- Create: `apps/english-world/src/page/englishWorldMobile/features/contextLab/MobileContextResultPage.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/features/contextLab/MobileContextAttemptsPage.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/features/contextLab/MobileAttemptDetailSheet.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/features/contextLab/MobileContextResults.test.tsx`
- Modify: `apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.tsx`

**Interfaces:**
- Consumes: attempt history/detail/delete APIs, `findMobileQuestionResult`, `formatElapsedSeconds`, PDF download functions.
- Produces: result and attempts routes with confirmed deletion.

- [ ] **Step 1: Write failing result/history tests**

~~~tsx
expect(await screen.findByText("本次得分 75")).toBeVisible();
expect(screen.getByText("错题 2")).toBeVisible();
expect(screen.getByText("薄弱词")).toBeVisible();
await user.click(screen.getByRole("link", { name: "查看练习记录" }));
expect(location).toBe("/mobile/tools/context-lab/12/attempts");
~~~

- [ ] **Step 2: Implement result, attempt detail, and deletion**

Group score, counts, weak words, suggestions, per-question explanations, and next actions. Attempt list pages by ten; detail uses one bottom sheet. Delete dialogs name the attempt/task and consequence, execute only online, then invalidate history/detail keys. PDF actions report browser download failure and never block reading.

~~~ts
async function deleteAttempt(attemptId: number, taskId: number) {
  if (!navigator.onLine) throw new Error("删除练习记录需要联网。");
  await request(contextLabDeleteAttempt({ attemptId }));
  await queryClient.invalidateQueries({ queryKey: contextLabKeys.attempts(taskId) });
  queryClient.removeQueries({ queryKey: contextLabKeys.attempt(attemptId) });
}
~~~

- [ ] **Step 3: Verify and commit**

~~~bash
pnpm --filter @font/english-world exec vitest run src/page/englishWorldMobile/features/contextLab/MobileContextResults.test.tsx
git add apps/english-world/src/page/englishWorldMobile/features/contextLab apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.tsx
git commit -m "feat: add mobile Context Lab results"
~~~

### Task 7: Add Context Lab route-level acceptance coverage

**Files:**
- Create: `apps/english-world/cypress/e2e/mobile-context-lab-flow.cy.ts`
- Modify: `apps/english-world/cypress/e2e/context-lab-selected-word-import.cy.ts`

**Interfaces:**
- Verifies: create → status → read → mark/import → answer → result → attempts.

- [ ] **Step 1: Add a fully stubbed mobile flow**

~~~ts
cy.viewport(390, 844);
cy.visit("/mobile/tools/context-lab");
cy.contains("新建练习").click();
cy.contains("手输词").click();
cy.get("textarea").type("retain, significant");
cy.contains("生成练习").click();
cy.contains("开始阅读").click();
cy.contains("开始答题").click();
cy.get('[role="radio"]').first().click();
cy.contains("提交答案").click();
cy.contains("本次得分").should("be.visible");
~~~

- [ ] **Step 2: Run the focused E2E and unit suite**

Run: `pnpm --filter @font/english-world exec vitest run src/page/englishWorldMobile/features/contextLab`

Run: `pnpm --filter @font/english-world e2e -- --spec cypress/e2e/mobile-context-lab-flow.cy.ts`

Expected: PASS; no horizontal overflow; drafts survive a reload inserted before submit.

- [ ] **Step 3: Commit**

~~~bash
git add apps/english-world/cypress/e2e/mobile-context-lab-flow.cy.ts apps/english-world/cypress/e2e/context-lab-selected-word-import.cy.ts
git commit -m "test: cover mobile Context Lab flow"
~~~
