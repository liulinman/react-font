# Mobile Context Lab Sync Design

Date: 2026-07-01

## Decision

Use a mobile-specific Context Lab reading flow that reuses the current Web Context Lab API contracts, types, and pure helpers. Do not embed the desktop `ContextLabPage` in mobile, and do not do a broad cross-platform rewrite in this pass.

This is the right first slice because the user's main break is mobile reading. Web already has the complete learning loop, while mobile still uses the older immediate `exercise-agent` flow. The mobile work should catch up to the Web learning loop without destabilizing desktop reading.

## Options Considered

### Option A: Responsive Wrapper Around Desktop Context Lab

Fastest to ship. Reuses most UI code directly.

Trade-off: the desktop page is built around a wide generator/history layout, a modal practice workspace, right-click selection, and Ant Design desktop controls. On a phone this would feel cramped and would not solve touch selection or bottom-action ergonomics well.

### Option B: Mobile Context Lab With Shared Contracts

Recommended.

Build a mobile-specific reading surface under `englishWorldMobile`, but call the existing `/context-lab/*`, `/word-agent/query`, and `/english/importMissingWords` endpoints. Share types and extract small pure helpers where Web and mobile need identical behavior.

Trade-off: more code than a wrapper, but much safer for UX and keeps backend changes narrow.

### Option C: Shared Context Lab Engine For Web And Mobile

Cleanest long-term structure. Extract a shared Context Lab state machine/hook used by both desktop and mobile.

Trade-off: larger refactor while both repos already have dirty reading-related changes. This is better as a second pass after mobile behavior matches Web.

## Scope

Included:

- Mobile Context Lab entry from the mobile home page.
- Generate practice packs through `/context-lab/generate-task`.
- Show practice pack history, status, source words, latest score, and retry/delete actions.
- Open a succeeded pack and read the article on mobile.
- Answer questions, submit through `/context-lab/submit`, and show score, wrong count, weak words, explanations, and next actions.
- Mark selected words or phrases while reading.
- AI-complete marked words through `/word-agent/query`.
- Preview and edit marked words before importing.
- Import only missing words through `/english/importMissingWords`, preserving the current skip-existing behavior.
- Show attempt history and attempt detail for a practice pack.
- Focused frontend and backend verification for the mobile reading loop.

Excluded:

- Rebuilding the whole mobile app shell.
- Replacing desktop Context Lab.
- A full shared Context Lab state-machine refactor.
- Offline reading or local drafts.
- New database tables.
- Payments, courses, class mode, or admin features.

## Current Gap

Desktop Web Context Lab already supports:

- Async practice-pack generation and status history.
- Opening previous packs instead of losing work after refresh.
- Reading pane plus question pane.
- Result review and attempt records.
- PDF download.
- Selected-text translation, add-to-library, mark-first/import-later, and duplicate-safe import.

Mobile currently has:

- Mobile word list, stats, AI word query, and a reading exercise tab.
- The reading exercise tab calls `/exercise-agent/generate` directly and stores the result only in component state.
- No Context Lab task history, no attempt records, no mark-first import flow, and no touch-friendly selected-text workflow.

## Product Flow

1. User opens `/englishWorldMobile`.
2. The home page keeps "今日复习" as the first action, but the "语境练习" card opens the mobile Context Lab view.
3. Mobile Context Lab shows a compact generator and recent practice packs.
4. User creates a pack from weak words, random words, or custom words.
5. Generated or pending packs appear in the history list with refreshable status.
6. User opens a succeeded pack.
7. Reading view uses a single-column flow:
   - article header and words
   - reading paragraphs
   - marked-word drawer/strip
   - question cards
   - sticky submit bar
8. User selects text in the reading article and uses a touch-friendly action sheet:
   - mark word
   - translate
   - add one word to library
9. User can preview all marked words, edit AI-completed fields, and import missing entries only.
10. After submit, mobile shows a result panel with weak words, score, explanations, and next actions.
11. User can open attempt history from the pack card.

## UX Design

Mobile should feel like a focused reading tool, not a squeezed dashboard.

The mobile page has three lightweight states:

- `home`: generator plus practice-pack list.
- `practice`: current article, questions, marked words, and submit/result panel.
- `attempts`: bottom drawer for previous submissions.

The reading screen should avoid desktop-style side-by-side panes. Article and questions are stacked, with stable section anchors and a sticky submit bar. The user can read first, then answer, without losing position because a desktop modal closed.

Selected-text interaction must be touch-first. Desktop right-click becomes a small floating action sheet near the selection when possible, falling back to a bottom sheet on small screens. The action sheet closes on scroll, outside tap, route/view change, and import dialog open.

Marked words should be visible as a compact strip below the article and as highlights inside the article. The primary marked-word action is "预览并导入"; the system must not force immediate insertion while reading.

## Frontend Architecture

Primary files:

- `apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.tsx`
- `apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.css`
- `apps/english-world/src/page/englishWorldMobile/ExerciseAgentTabMobile.tsx`
- `apps/english-world/src/page/englishWorldMobile/ExerciseAgentTabMobile.test.tsx`
- `apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.tsx`
- `apps/english-world/src/page/englishWorld/contextLab/contextLabPlanning.ts`
- `apps/english-world/src/page/englishWorld/server/learning.ts`
- `apps/english-world/src/page/englishWorld/types/learning.ts`
- `apps/english-world/src/server/word/word.ts`
- `apps/english-world/src/server/word/word.type.ts`

Implementation shape:

- Replace the mobile "阅读+选择题" tab implementation with a mobile Context Lab component.
- Introduce `MobileContextLabPage.tsx` for the new mobile reading flow.
- Keep `ExerciseAgentTabMobile.tsx` as a compatibility wrapper that re-exports `MobileContextLabPage` during this pass, so existing imports and focused tests have a stable path while the implementation moves.
- Use `contextLabCreateTask`, `contextLabHistory`, `contextLabDetail`, `contextLabSubmit`, `contextLabAttemptHistory`, `contextLabAttemptDetail`, `contextLabDeleteAttempt`, and `contextLabDeleteTask` from `server/learning.ts`.
- Reuse `ContextLabGenerateParams`, `ContextLabTask`, `ContextLabSubmitResult`, and `ContextLabAttempt`.
- Extract only small shared pure helpers from desktop Context Lab when needed:
  - article parsing
  - selected-text cleanup
  - vocabulary key generation
  - import preview mapping
  - option/result formatting
- Do not move the entire desktop page into shared code in this pass.

Mobile-specific component split:

- `MobileContextLabPage`: orchestrates view state, history loading, task opening, and generation.
- `MobileContextLabGenerator`: weak/random/custom source controls.
- `MobileContextLabHistory`: pack cards, status, refresh, open, records, retry, delete.
- `MobileContextLabPractice`: article, questions, marked words, submit, result review.
- `MobileMarkedWordPreview`: AI-completed preview and import confirmation.
- `MobileAttemptDrawer`: attempt list and expandable detail.

## Backend Architecture

The backend should stay mostly unchanged because Web already has the needed contracts.

Primary backend files:

- `src/interface/context-lab/context-lab.controller.ts`
- `src/interface/context-lab/context-lab.service.ts`
- `src/interface/exercise-agent/exercise-agent.service.ts`
- `src/interface/english/english.controller.ts`
- `src/interface/english/english.service.ts`
- `src/interface/english/dto/english.dto.ts`

Backend expectations:

- Keep `/context-lab/generate-task` as the mobile generation entry.
- Keep `/context-lab/history` and `/context-lab/detail` as the source of resumable reading packs.
- Keep `/context-lab/submit` as the answer submission endpoint.
- Preserve attempt persistence when the pack came from Context Lab task history.
- Keep `/english/importMissingWords` duplicate-safe and user-scoped.
- Do not change schemas unless tests reveal a real contract gap.

Possible narrow backend fixes:

- Ensure Context Lab responses are consistently wrapped by the existing interceptor for mobile requests.
- Ensure task detail includes article and questions only for succeeded tasks.
- Ensure submit result has score, wrong count, weak words, next suggestions, and attempt id when persistence succeeds.

## PM Responsibilities

- Treat this as the mobile reading parity milestone, not a full mobile redesign.
- Acceptance criteria are based on completing the reading loop on a phone:
  - generate or open a pack
  - read
  - mark words
  - import missing words
  - answer
  - review
  - revisit attempts
- Defer broad shell, stats, and word-list polish unless it blocks reading.

## Design Responsibilities

- Design one-handed mobile reading ergonomics.
- Keep article text readable with stable line height and no cramped cards inside cards.
- Use bottom sheets/action sheets for dense controls.
- Keep the marked-word strip visible but not dominant.
- Make result review compact and actionable.
- Avoid desktop-only interactions such as right-click as the only path.

## Frontend Responsibilities

- Implement the mobile Context Lab component set.
- Reuse existing API descriptors and shared types.
- Add focused Vitest coverage for generator/history/practice/marked-word import/attempt drawer.
- Preserve existing mobile word list, stats, AI word query, and today review entry.
- Avoid overwriting current dirty desktop Context Lab changes.

## Backend Responsibilities

- Verify current Context Lab and import endpoints satisfy mobile.
- Add only focused tests if mobile exposes a gap.
- Preserve current per-user duplicate handling in `english_word_user`.
- Avoid introducing a second reading-generation contract.

## QA Responsibilities

Automated checks:

- Mobile Context Lab renders generator and loads history.
- Creating a task calls `/context-lab/generate-task`.
- Opening a succeeded task calls `/context-lab/detail`.
- Submitting answers calls `/context-lab/submit` and renders score, wrong count, weak words, and explanations.
- Selecting and marking text renders a marked-word strip and article highlight.
- Preview import calls `/word-agent/query`.
- Confirm import calls `/english/importMissingWords` and handles inserted/skipped counts.
- Attempt drawer calls `/context-lab/attempt-history` and `/context-lab/attempt-detail`.

Manual smoke checks:

- iPhone-width viewport has no horizontal overflow.
- Long article paragraphs remain readable.
- Sticky submit bar does not cover question content.
- Selection action sheet is reachable by touch.
- Pending/failed/succeeded task states are understandable.
- Existing mobile word list and AI word query still work.

## Verification Commands

Frontend:

```bash
pnpm --filter @font/english-world test -- --run src/page/englishWorldMobile/ExerciseAgentTabMobile.test.tsx
pnpm --filter @font/english-world test -- --run src/page/englishWorld/contextLab/ContextLabPage.test.tsx
pnpm --filter @font/english-world build
git diff --check
```

Backend:

```bash
pnpm test -- english.service.spec.ts --runInBand
pnpm test -- exercise-agent.service.spec.ts --runInBand
pnpm build
git diff --check
```

## Risks

- Touch text selection behaves differently across mobile browsers. The design needs a bottom-sheet fallback.
- The current mobile component is large. Keep new Context Lab code in focused components instead of growing `EnglishWorldMobile.tsx`.
- Desktop Context Lab has dirty local changes. Do not refactor it broadly during the mobile pass.
- Async task generation may finish after the user leaves the view. History refresh and status cards must make this clear.

## Success Criteria

- A mobile user can complete the same core reading loop that Web supports today.
- Mobile reading no longer depends on the older direct `/exercise-agent/generate` path for Context Lab.
- Mark-first/import-later works on mobile, and existing words are skipped without failing the whole import.
- Practice history and attempt records survive refresh.
- Desktop Context Lab behavior remains intact.
