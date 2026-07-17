---
title: 'English World weak-word context repair loop'
type: 'feature'
created: '2026-07-17'
status: 'done'
baseline_commit: '86f5b6bce25d787daf1f373b81aa40b06ecf3c4c'
backend_baseline_commit: 'f7e0f624228c7cd755dce1a83429c05e2cf2bc13'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Recite can show real mistakes and Context Lab can generate exercises, but the two are disconnected, attribution is guessed, next-day review is not driven by real recent errors, and the product cannot measure the resulting funnel reliably.

**Approach:** Add a desktop-first loop that takes up to three verified wrong words from an owned Recite session into a 120–180 word, three-question micro context, records durable privacy-minimal events, and prioritizes those real mistakes in the next natural day's Daily Coach.

## Boundaries & Constraints

**Always:** Derive and verify repair words server-side from the current user's submitted Recite session; preserve standard Context Lab and old task behavior; map micro results only through explicit `targetWord`; persist only ID/count/status analytics with idempotency and 180-day expiry; preserve unrelated dirty files and keep AI failure isolated from submitted Recite results.

**Ask First:** Adding an external dependency, changing an existing learning table schema, changing the 1–3 word/three-question product boundary, or modifying unrelated user-owned work.

**Never:** Trust URL words as the source of truth, store answers/articles/questions/explanations in events, claim long-term mastery from same-day work, build a full SRS/mobile redesign, touch the dirty backend English module, or push remote changes.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Real mistakes | Owned submitted session with 1–3+ wrong words | Stable first three unique wrong words enter micro mode | None |
| Tampered source | Foreign/missing session or mismatched words | No task is created | 404 for ownership; `MICRO_REQUEST_INVALID` for mismatch |
| Micro output | 1–3 words and valid model result | 120–180 tokens, exactly 3 questions, all words covered by `targetWord` | `MICRO_OUTPUT_INVALID`; source result remains recoverable |
| Retry | Same exercise submitted again | New attempt; first attempt remains intact | Explanation failure uses rule-based fallback |
| Next day | Last wrong answer in prior local day, age 8–36 hours | Daily Coach prioritizes up to three word IDs | Query failure falls back to existing route |
| Duplicate event | Same user/eventUid sent twice | One persisted event is returned | Core learning flow remains non-blocking |

</frozen-after-approval>

## Code Map

- `../../../../nestjs/src/interface/exercise-agent/` -- micro contract, prompt, validation, attribution and attempts.
- `../../../../nestjs/src/interface/recite/` -- owned result recovery and previous-day mistakes.
- `../../../../nestjs/src/interface/daily-coach/` -- next-day prioritization.
- `../../../../nestjs/src/interface/learning-loop-event/` -- authenticated durable funnel events.
- `../../../../nestjs/src/database/` and `../../../../nestjs/migrations/` -- event model and additive migration.
- `../../../apps/english-world/src/page/englishWorld/recite/` -- result action, recovery and flow events.
- `../../../apps/english-world/src/page/englishWorld/contextLab/` -- focused micro entry and result UX.
- `../../../apps/english-world/src/page/englishWorld/analytics/` -- typed privacy-minimal event client.

## Tasks & Acceptance

**Execution:**
- [x] Add event storage/API with idempotency, ownership checks and expiry.
- [x] Add micro task DTO/prompt/output validation and exact server-side source verification.
- [x] Add explicit target-word result attribution, explanation fallback and non-overwriting retries.
- [x] Add Recite result recovery, previous-local-day mistake query and Daily Coach priority.
- [x] Connect Recite to focused Context Lab micro UX and persisted event calls.
- [x] Add backend/frontend tests, type checks and production build verification.
- [x] Complete independent code review and Gemini review loop.

**Acceptance Criteria:**
- Given a submitted Recite result with mistakes, when the user chooses context repair, then the verified first three unique mistakes open automatically as a short three-question exercise with a semantic icon and no second configuration step.
- Given refresh, AI failure or retry, when the user returns, then submitted Recite evidence and the first micro attempt remain recoverable.
- Given the next natural day, when Daily Coach loads with a minute timezone offset, then eligible real mistakes are prioritized without changing the fallback route.
- Given legacy Context Lab tasks and standard requests, when viewed or submitted, then their current behavior remains compatible.

### Review Findings

- [x] [Review][Patch] Preserve `targetWord` in task detail and SSE responses [nestjs/src/interface/exercise-agent/exercise-agent.service.ts:1103]
- [x] [Review][Patch] Persist the Recite result URL and restore its direction without leaking stale state [apps/english-world/src/page/englishWorld/recite/RecitePage.tsx:131]
- [x] [Review][Patch] Restore micro tasks from the URL and poll through missed SSE updates [apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.tsx:409]
- [x] [Review][Patch] Send the browser minute timezone offset to Daily Coach [apps/english-world/src/page/englishWorld/cockpit/LearningCockpitPage.tsx:61]
- [x] [Review][Patch] Fail micro submission when its first attempt cannot be persisted [nestjs/src/interface/exercise-agent/exercise-agent.service.ts:482]
- [x] [Review][Patch] Enforce short wrong-answer-only micro explanations with a comparison example [nestjs/src/interface/exercise-agent/exercise-agent.service.ts:440]
- [x] [Review][Patch] Distinguish invalid micro links from standard Context Lab [apps/english-world/src/page/englishWorld/contextLab/microContext.ts:10]
- [x] [Review][Patch] Serialize duplicate generation callbacks before creating an article [nestjs/src/interface/exercise-agent/exercise-agent.service.ts:808]
- [x] [Review][Patch] Enforce the 8-36 hour previous-day evidence window [nestjs/src/interface/recite/recite.service.ts:317]
- [x] [Review][Patch] Pair every Recite round with a new flow and suppress duplicate submits/zero-correct repair events [apps/english-world/src/page/englishWorld/recite/RecitePage.tsx:208]
- [x] [Review][Patch] Validate required event relations and conflicting idempotency retries [nestjs/src/interface/learning-loop-event/learning-loop-event.service.ts:40]
- [x] [Review][Patch] Delete learning-loop evidence after its 180-day expiry [nestjs/src/interface/learning-loop-event/learning-loop-event.service.ts:48]
- [x] [Review][Patch] Filter deleted words from next-day Daily Coach actions [nestjs/src/interface/daily-coach/daily-coach.service.ts:59]
- [x] [Review][Patch] Reject micro generation through legacy non-task endpoints [nestjs/src/interface/exercise-agent/exercise-agent.service.ts:173]
- [x] [Review][Patch] Retry event writes and only mark generated evidence after success [apps/english-world/src/page/englishWorld/analytics/learningEvents.ts:34]
- [x] [Review][Patch] Make micro task creation idempotent across lost HTTP responses [nestjs/src/interface/exercise-agent/exercise-agent.service.ts:610]
- [x] [Review][Patch] Reject answer choices that become empty after label stripping [nestjs/src/interface/exercise-agent/exercise-agent.service.ts:1218]
- [x] [Review][Patch] Remove vocabulary marking and import controls from focused micro mode [apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.tsx:1384]
- [x] [Review][Patch] Map micro generation failures to stable error codes and structured logs [nestjs/src/interface/exercise-agent/exercise-agent.service.ts:965]
- [x] [Review][Patch] Offer an explicit retry for transient result-recovery failures [apps/english-world/src/page/englishWorld/recite/RecitePage.tsx:813]
- [x] [Review][Defer] Replace the existing in-process Context Lab generator with a durable external queue [nestjs/src/interface/exercise-agent/exercise-agent.service.ts:617] — deferred, pre-existing architecture

## Design Notes

`learning_loop_event` is analytics evidence, not a learning-state table. A stable `(userId,eventUid)` key absorbs retries; `flowId` pairs ordinary Recite start/completion. The treatment cohort starts only at the earliest micro task's first completed attempt, never at generation success.

## Verification

**Commands:**
- `cd ../../../../nestjs && pnpm exec jest --runInBand` -- 25 suites and 124 tests pass.
- `cd ../../../apps/english-world && pnpm exec vitest run` -- 41 files and 200 tests pass.
- `cd ../../../../nestjs && pnpm build` -- backend production build succeeds.
- `cd ../../.. && pnpm --filter @font/english-world build` -- production build succeeds.
- Targeted frontend and backend ESLint -- zero errors; frontend retains two existing warnings.
- `git diff --check` in both repositories -- passes.
- Live browser: Recite mistakes → micro task → three answers → pass → URL reload recovery.
- Gemini backend and frontend blocking reviews -- both return exact `PASS`.

## Suggested Review Order

1. [Approved spec and acceptance](./spec-weak-word-context-repair-loop.md)
2. [Recite result recovery and repair entry](../../../apps/english-world/src/page/englishWorld/recite/RecitePage.tsx)
3. [Focused micro Context Lab UX](../../../apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.tsx)
4. [Micro generation, validation and attempt persistence](../../../../nestjs/src/interface/exercise-agent/exercise-agent.service.ts)
5. [Next-day prioritization](../../../../nestjs/src/interface/daily-coach/daily-coach.service.ts)
6. [Privacy-minimal learning events](../../../../nestjs/src/interface/learning-loop-event/learning-loop-event.service.ts)
