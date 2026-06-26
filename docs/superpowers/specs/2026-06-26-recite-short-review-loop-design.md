# Recite Short Review Loop Design

Date: 2026-06-26

## Goal

Turn the existing word recite page into a focused daily short-review loop. The user should be able to start a small review set, answer one prompt at a time, submit the session, review mistakes, and immediately repeat only the wrong words.

This is a product-experience upgrade over the current working recite APIs. It should feel like a consumer learning flow, not an admin form.

## Product Decisions

- The first version uses a short-review loop, not a full exam mode.
- One screen shows one question. The user types the answer and presses Enter or clicks Next.
- Empty answers are allowed and count as incorrect on submit.
- The final question submits the whole session.
- The result screen focuses on wrong words first, then the overall score.
- The primary repair action is "再练错词"; it starts a new recite session using the failed word IDs.
- The secondary action returns to the daily route at `/englishWorld`.
- Existing history and stats remain available but move behind compact actions. They are not the main experience.

## User Flow

1. User opens `/englishWorld/recite`.
2. Idle state shows a compact task summary:
   - mode: 今日短复习
   - source: daily plan when `wordIds` query params exist, otherwise default user config
   - expected size and direction
3. User clicks "开始复习".
4. Page enters focused answering state:
   - shows progress, current index, remaining count
   - shows prompt text
   - shows a single answer input
   - Enter advances to the next question; on the last question it submits
   - Previous remains available for correction before submit
5. Submit calls `/recite/submit`.
6. Result state shows:
   - score summary
   - wrong words first
   - correct answer and user answer
   - pronunciation button for English words
   - "再练错词" if there are wrong words
   - "回到今日路线" as completion action
7. "再练错词" starts a new session by calling `/recite/start` with the wrong word IDs.

## Frontend Design

### Main Page

`RecitePage` remains the route owner. The page should be refactored into smaller render helpers or components so the flow is easier to reason about:

- `ReviewIntro`: idle task summary and start actions.
- `ReviewQuestionCard`: focused one-question answering workspace.
- `ReviewResultPanel`: mistake-first result summary and repair actions.
- `ReviewHistoryModal`: existing history modal, kept mostly intact.
- `ReviewStatsModal`: existing stats modal, kept mostly intact.

The visual style follows the current route-first cockpit:

- restrained white surfaces
- 8px or smaller radius
- compact metrics
- no decorative hero or marketing layout
- no nested cards for the main task surface

### Interaction Details

- Answer input is auto-focused when a session starts and when moving between questions.
- Enter advances, Shift+Enter is not needed because answers are single-line.
- The Next button is enabled even when empty, with subtle helper text explaining skipped answers count as wrong.
- Submit button appears on the last question.
- After submit, if all answers are correct, the primary button is "完成，回到今日路线".
- If there are wrong answers, the primary button is "再练错词".

## Backend Design

Existing endpoints stay in place:

- `POST /recite/start`
- `POST /recite/submit`
- `POST /recite/history`
- `POST /recite/stats`

Required backend behavior:

- `/recite/start` already accepts `wordIds`; keep this as the repair-session mechanism.
- `wordIds` must stay deduplicated, user-scoped, ordered by the incoming list, and capped at 50.
- `/recite/submit` returns enough data for a mistake-first result screen:
  - `wordId`
  - `englishWord`
  - `correctAnswer`
  - `userAnswer`
  - `isCorrect`
- Empty answers continue to be recorded as incorrect.
- Missing or unauthorized word IDs continue to return incorrect result items rather than exposing another user's data.

No new database table is required for this version. Per-question time, hint count, and multi-round session lineage are intentionally out of scope.

## Data Flow

Default review:

`RecitePage -> getSystemSettings -> /recite/start -> answer locally -> /recite/submit -> result screen`

Daily plan review:

`Daily Coach -> /englishWorld/recite?wordIds=... -> /recite/start(wordIds) -> /recite/submit`

Wrong-word repair:

`result.results.filter(!isCorrect).map(wordId) -> /recite/start(wordIds) -> new focused session`

## Error Handling

- Start failure shows the backend error message and returns to idle.
- Submit failure keeps answers in place and lets the user retry.
- If wrong-word repair returns no matching words, show the backend message and keep the result screen visible.
- History and stats loading failures should not interrupt the active review session.
- A session with zero questions should never enter answering state.

## Testing

### Frontend Unit Tests

- Idle state renders the short-review task summary.
- Starting from plan-review query params calls `/recite/start` with `wordIds`.
- Answering with Enter moves to the next question.
- Last-question Enter submits the session.
- Result screen renders wrong words before correct words.
- "再练错词" starts a new session with only failed word IDs.
- Submit failure preserves local answers.

### Backend Unit Tests

- `startRecite` keeps incoming `wordIds` order after DB lookup.
- `startRecite` caps repair sessions at 50 unique IDs.
- `submitAnswer` records empty answers as incorrect.
- `submitAnswer` returns incorrect result items for missing user-owned words without leaking data.
- `getReciteStats` remains compatible with existing history rows.

### Verification Commands

Frontend:

```bash
pnpm --filter @font/english-world exec vitest run src/page/englishWorld/recite/RecitePage.test.tsx src/page/englishWorld/recite/planReview.test.ts src/page/englishWorld/recite/reviewExperience.test.ts
pnpm --filter @font/english-world build
```

Backend:

```bash
pnpm test -- recite.service.spec.ts --runInBand
pnpm build
```

## Out of Scope

- Spaced-repetition algorithm changes.
- New database schema for per-question timing.
- AI-generated hints.
- Mobile recite redesign.
- Replacing Context Lab or Memory Map flows.
- Push notifications or daily streak mechanics.
