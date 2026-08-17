# English World Mobile Learning and Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver daily review, wrong-word repair, mixed-learning setup/session/result, learning cockpit, and IELTS core as dedicated mobile experiences.

**Architecture:** Keep the existing recite APIs, learning contracts, query keys, reducer, activity registry, and planning/insight functions as authoritative domain logic. Add mobile page composition around them. Persist editable answers; persist stable request identities only for mixed-learning APIs that already accept them. Server responses remain authoritative after reconnect.

**Tech Stack:** React Query, Ant Design Mobile, existing recite and learning-session APIs, IndexedDB draft storage, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-17-english-world-mobile-pwa-full-redesign-design.md`

## Global Constraints

- Review renders one question at a time with safe-area actions.
- Input and request identity survive transient network loss; no answer is silently resubmitted.
- Mixed learning preserves every registered activity type and server-owned session transition.
- The bottom tab bar hides only during focused learning while a visible Back/Exit path remains.
- AI-generated/new sessions require connectivity; cached active content may remain readable offline.

---

### Task 1: Create a mobile daily-review controller

**Files:**
- Create: `apps/english-world/src/page/englishWorldMobile/features/review/useMobileReview.ts`
- Create: `apps/english-world/src/page/englishWorldMobile/features/review/mobileReviewDraft.ts`
- Create: `apps/english-world/src/page/englishWorldMobile/features/review/useMobileReview.test.tsx`

**Interfaces:**
- Produces: `MobileReviewState` and `useMobileReview(params)`.
- Consumes: `startRecite`, `submitAnswer`, `getReciteSessionResult`, `parsePlanReviewSearch`, `createReviewProgress`.
- Draft key: `review:<clientSessionKey>` with questions, direction, answers, current index, and last submit timestamp.

- [ ] **Step 1: Write failing state-transition tests**

~~~tsx
const review = renderHook(() => useMobileReview({ source: "repair", wordIds: [2, 5] }), { wrapper });
await act(() => review.result.current.start());
expect(review.result.current.state.phase).toBe("answering");
act(() => review.result.current.changeAnswer("fragile"));
expect(review.result.current.state.currentAnswer).toBe("fragile");
offlineSubmitRejects();
await act(() => review.result.current.submit());
expect(review.result.current.state.phase).toBe("sync-failed");
expect(storage.putDraft).toHaveBeenCalled();
~~~

- [ ] **Step 2: Verify failure**

Run: `pnpm --filter @font/english-world exec vitest run src/page/englishWorldMobile/features/review/useMobileReview.test.tsx`

- [ ] **Step 3: Implement explicit phases and retry identity**

~~~ts
export type MobileReviewState =
  | { phase: "planning"; title: string; wordIds: number[] }
  | { phase: "starting"; title: string }
  | { phase: "answering"; sessionKey: string; index: number; questions: Question[]; answers: AnswerItem[]; currentAnswer: string }
  | { phase: "submitting"; sessionKey: string; answers: AnswerItem[]; submitStartedAt: string }
  | { phase: "sync-failed"; sessionKey: string; answers: AnswerItem[]; submitStartedAt: string; message: string }
  | { phase: "result"; result: SubmitAnswerResponse };
~~~

`retrySubmit()` reuses the exact persisted answers only after the user confirms another submission. The current recite contract has no client idempotency key, so copy must not promise deduplication. `editAfterFailure()` returns to answering. A reload restores the draft but requires the user to press retry; it never auto-submits.

- [ ] **Step 4: Verify and commit**

~~~bash
pnpm --filter @font/english-world exec vitest run src/page/englishWorldMobile/features/review
git add apps/english-world/src/page/englishWorldMobile/features/review
git commit -m "feat: add mobile review controller"
~~~

### Task 2: Build the one-question review and result pages

**Files:**
- Create: `apps/english-world/src/page/englishWorldMobile/features/review/MobileReviewPage.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/features/review/MobileReviewResult.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/features/review/MobileReviewPage.test.tsx`
- Modify: `apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.tsx`

**Interfaces:**
- Consumes: Task 1 controller, `MobileBritishPronunciationButton`, `createReviewCardState`, `createReviewResultInsight`, `getWrongWordIds`, `getContextRepairWords`.
- Produces: `/mobile/review` and repair navigation.

- [ ] **Step 1: Write failing single-stage tests**

~~~tsx
expect(await screen.findByText("1 / 2")).toBeVisible();
expect(screen.getAllByRole("textbox")).toHaveLength(1);
expect(screen.getByRole("button", { name: "确认答案" })).toBeVisible();
expect(screen.queryByRole("tab")).not.toBeInTheDocument();
await user.type(screen.getByRole("textbox"), "fragile");
await user.click(screen.getByRole("button", { name: "确认答案" }));
expect(await screen.findByText("2 / 2")).toBeVisible();
~~~

- [ ] **Step 2: Implement plan → question → result composition**

Use `SafeAreaActions` for confirm/hint/unknown actions, `visualViewport`-aware spacing for the keyboard, and a linear progress bar with textual progress. Result uses existing insight functions, offers short wrong-word repair, Context Lab micro repair under `/mobile/tools/context-lab/new`, or completion. Record learning-loop events with existing event semantics.

~~~tsx
return state.phase === "result" ? (
  <MobileReviewResult result={state.result} insight={createReviewResultInsight(state.result.statistics)} />
) : (
  <MobilePage title="今日复习" hideTabs>
    <ProgressBar percent={createReviewProgress({ totalCount: state.questions.length, answeredCount: state.index }).percent} />
    <MobileReviewQuestion question={state.questions[state.index]} answer={state.currentAnswer} onChange={changeAnswer} />
    <SafeAreaActions><Button onClick={submit}>确认答案</Button></SafeAreaActions>
  </MobilePage>
);
~~~

- [ ] **Step 3: Verify recovery/result paths and commit**

~~~bash
pnpm --filter @font/english-world exec vitest run src/page/englishWorldMobile/features/review/MobileReviewPage.test.tsx
git add apps/english-world/src/page/englishWorldMobile/features/review apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.tsx
git commit -m "feat: add one-question mobile review"
~~~

### Task 3: Rebuild mixed-learning setup as a full mobile route

**Files:**
- Create: `apps/english-world/src/page/englishWorldMobile/features/learning/MobileLearningSetupPage.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/features/learning/MobileLearningSetupPage.test.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/features/learning/learningSetupIdentity.ts`
- Modify: `apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.tsx`

**Interfaces:**
- Consumes: `learningCapabilities`, `previewLearningSession`, `createLearningSession`, `learningKeys`, `MODE_ORDER`, `MAX_LEARNING_WORDS`.
- Produces: `/mobile/learn` and navigation to `/mobile/learn/session/:sessionId`.

- [ ] **Step 1: Write failing scope/capability tests**

~~~tsx
renderMobile(<MobileLearningSetupPage />, { route: "/mobile/learn?wordIds=1,2&scope=selection" });
expect(await screen.findByText("本次 2 个词")).toBeVisible();
expect(screen.getByRole("checkbox", { name: "听音记忆" })).toBeEnabled();
expect(screen.getByRole("button", { name: "创建学习任务" })).toBeDisabled();
~~~

- [ ] **Step 2: Implement the drawer logic as a page**

~~~ts
export type MobileLearningScope = { kind: "selection" | "current_filter"; wordIds: number[]; count: number; masteryFilterLabel: string };
export function createLearningRequestIdentity(payload: { wordIds: number[]; selectedModes: LearningMode[] }, previous?: { payloadKey: string; requestUid: string }) {
  const payloadKey = JSON.stringify(payload);
  return previous?.payloadKey === payloadKey ? previous : { payloadKey, requestUid: crypto.randomUUID() };
}
~~~

Render modes, unsupported reasons, word exclusions, preview, generation state, and errors in one column. Do not create a session offline. Reuse the same `requestUid` only when retrying an unchanged payload.

- [ ] **Step 3: Verify and commit**

~~~bash
pnpm --filter @font/english-world exec vitest run src/page/englishWorldMobile/features/learning/MobileLearningSetupPage.test.tsx
git add apps/english-world/src/page/englishWorldMobile/features/learning apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.tsx
git commit -m "feat: add mobile mixed-learning setup"
~~~

### Task 4: Adapt every mixed-learning activity to the mobile session shell

**Files:**
- Create: `apps/english-world/src/page/englishWorldMobile/features/learning/MobileLearningSessionPage.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/features/learning/MobileLearningSessionShell.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/features/learning/mobileActivityRegistry.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/features/learning/mobileLearningDraftRepository.ts`
- Create: `apps/english-world/src/page/englishWorldMobile/features/learning/MobileLearningSessionPage.test.tsx`
- Modify: `apps/english-world/src/page/englishWorld/learning/session/useLearningSession.ts`
- Modify: `apps/english-world/src/page/englishWorld/learning/shared/learningDraftStorage.ts`
- Modify: `apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.tsx`

**Interfaces:**
- Consumes: `useLearningSession`, `activityRegistry`, `LearningResultView`, `learningSessionReducer`.
- Produces: `mobileActivityRegistry: Record<LearningMode, ActivityRenderer>`.
- Changes the shared hook to accept an asynchronous draft repository; the desktop localStorage adapter preserves current behavior and the mobile adapter uses Phase 1 IndexedDB.

- [ ] **Step 1: Write failing registry and retry tests**

~~~ts
expect(Object.keys(mobileActivityRegistry).sort()).toEqual(Object.keys(activityRegistry).sort());
~~~

~~~tsx
await user.type(await screen.findByRole("textbox"), "learner-response");
await user.click(screen.getByRole("button", { name: "提交答案" }));
expect(await screen.findByRole("alert")).toHaveTextContent("提交未同步");
await user.click(screen.getByRole("button", { name: "重试提交" }));
expect(secondSubmit.data.attemptUid).toBe(firstSubmit.data.attemptUid);
~~~

- [ ] **Step 2: Add the asynchronous repository contract without changing desktop behavior**

~~~ts
export interface LearningDraftRepository {
  load(sessionId: number, itemUid: string): Promise<LearningAnswerDraft | null>;
  save(sessionId: number, itemUid: string, draft: LearningAnswerDraft): Promise<void>;
  clear(sessionId: number, itemUid: string): Promise<void>;
}
export const localStorageLearningDraftRepository: LearningDraftRepository = {
  async load(sessionId, itemUid) { return createLearningDraftStore(sessionId, itemUid).load(); },
  async save(sessionId, itemUid, draft) { createLearningDraftStore(sessionId, itemUid).save(draft); },
  async clear(sessionId, itemUid) { createLearningDraftStore(sessionId, itemUid).clear(); },
};
export function useLearningSession(
  sessionId: number,
  options: { draftRepository?: LearningDraftRepository } = {},
) {
  const draftRepository = options.draftRepository ?? localStorageLearningDraftRepository;
  const restoreDraft = useCallback(
    async (itemUid: string) => (await draftRepository.load(sessionId, itemUid)) ?? undefined,
    [draftRepository, sessionId],
  );
}
~~~

Await draft restoration before the first `createLearningSessionState` dispatch for an item; await saves/clears around reducer transitions without blocking text input. `mobileLearningDraftRepository` maps `(sessionId, itemUid)` to IndexedDB kind `learning`. Run all existing desktop session/draft tests to prove the localStorage adapter is behaviorally unchanged.

Implement mobile renderers for `listening`, `output`, `micro_scene`, `root_family`, and `confusion` using the same public item contracts and submit callbacks. Each renderer must keep one primary action above the keyboard and expose all hints as buttons, not gestures only.

- [ ] **Step 3: Run shared and mobile suites and commit**

~~~bash
pnpm --filter @font/english-world exec vitest run src/page/englishWorld/learning/session src/page/englishWorldMobile/features/learning
git add apps/english-world/src/page/englishWorld/learning/session/useLearningSession.ts apps/english-world/src/page/englishWorld/learning/shared/learningDraftStorage.ts apps/english-world/src/page/englishWorldMobile/features/learning apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.tsx
git commit -m "feat: add mobile mixed-learning session"
~~~

### Task 5: Add the learning cockpit

**Files:**
- Create: `apps/english-world/src/page/englishWorldMobile/features/cockpit/MobileLearningCockpitPage.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/features/cockpit/MobileLearningCockpitPage.test.tsx`
- Modify: `apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.tsx`

**Interfaces:**
- Consumes: `dailyCoachSummary`, `dailyCoachPlan`, `LearningSnapshot` data contract, `createPlanReviewSearch`.
- Produces: `/mobile/cockpit` launch links to review, Context Lab, and word library.

- [ ] **Step 1: Write failing action-routing tests**

~~~tsx
expect(await screen.findByRole("heading", { name: "学习驾驶舱" })).toBeVisible();
await user.click(screen.getByRole("link", { name: /复习薄弱词/ }));
expect(location).toContain("/mobile/review?");
~~~

- [ ] **Step 2: Implement cached summary and explicit online planning**

Render total/new/accuracy, weak words, suggested actions, reasons, and estimated minutes as grouped cards. Cache the latest summary snapshot; offline shows it with timestamp but disables `生成今日计划`. Route review actions through the shared query builder with the mobile base path.

~~~ts
const summaryQuery = useQuery({
  queryKey: ["mobile", "cockpit", "summary", 30],
  queryFn: () => request(dailyCoachSummary({ days: 30, timezoneOffsetMinutes: new Date().getTimezoneOffset() })),
  enabled: online,
});
const reviewPath = "/mobile/review?" + createPlanReviewSearch(action);
~~~

- [ ] **Step 3: Verify and commit**

~~~bash
pnpm --filter @font/english-world exec vitest run src/page/englishWorldMobile/features/cockpit
git add apps/english-world/src/page/englishWorldMobile/features/cockpit apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.tsx
git commit -m "feat: add mobile learning cockpit"
~~~

### Task 6: Add IELTS core review and vocabulary surfaces

**Files:**
- Create: `apps/english-world/src/page/englishWorldMobile/features/ieltsCore/MobileIeltsCorePage.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/features/ieltsCore/MobileIeltsCandidateSheet.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/features/ieltsCore/MobileIeltsCorePage.test.tsx`
- Modify: `apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.tsx`

**Interfaces:**
- Consumes: `wordIeltsCoreReview`, `wordIeltsCoreVocabularyList`, `wordIeltsCoreVocabularyRefresh` and IELTS types.
- Produces: `/mobile/tools/ielts-core` and review launch to `/mobile/review`.

- [ ] **Step 1: Write failing source and launch tests**

~~~tsx
expect(await screen.findByText("雅思核心词库")).toBeVisible();
expect(screen.getByText("来源已验证")).toBeVisible();
await user.click(screen.getByRole("button", { name: "开始复习 10 个词" }));
expect(location).toContain("/mobile/review?");
~~~

- [ ] **Step 2: Implement summary, filters, source sheet, and refresh**

Use compact list rows for candidates and vocabulary, a bottom sheet for source references, and visible verification labels. Daily/manual refresh and review planning require network; cached vocabulary remains readable offline. Route selected candidate IDs into the mobile review query.

~~~ts
const review = await request(wordIeltsCoreReview({ proficiencyLevels, count, useAi }));
const candidateIds = review.candidates.map((item) => item.id);
const reviewSearch = new URLSearchParams({ source: "ielts-core", title: "雅思核心复习", wordIds: candidateIds.join(",") });
navigate("/mobile/review?" + reviewSearch.toString());
~~~

- [ ] **Step 3: Verify and commit**

~~~bash
pnpm --filter @font/english-world exec vitest run src/page/englishWorldMobile/features/ieltsCore
git add apps/english-world/src/page/englishWorldMobile/features/ieltsCore apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.tsx
git commit -m "feat: add mobile IELTS core workflow"
~~~
