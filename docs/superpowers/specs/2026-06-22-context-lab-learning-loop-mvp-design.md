# Context Lab Learning Loop MVP Design

Date: 2026-06-22

## Goal

Make English World commercially usable as a daily AI learning loop centered on Context Lab:

`Cockpit today mission -> Context Lab IELTS reading practice -> select text to translate or add to word library -> submit answers -> review weak words -> continue review or generate the next practice pack`.

This pass should turn the existing AI learning modules into one repeatable workflow rather than adding new product areas.

## Product Scope

Included:

- Cockpit entry into Context Lab with today's weak words as the natural starting point.
- A clear Context Lab workflow state: select words, generate, read and answer, review result.
- Stable selected-text actions inside the reading pane: translate and AI-complete into the word library.
- A confirmation modal before adding AI-completed words or phrases to the library.
- Duplicate-word handling that tells the user the word already exists and avoids a misleading failure.
- Answer-submission result review with score, wrong count, weak words, and next-step actions.
- Honest empty and error states when live data is unavailable.
- Focused frontend tests around the learning loop and selected-text actions.
- Backend response-shape support for result review if the current submit response is not enough.

Excluded:

- Payments, subscriptions, admin consoles, course publishing, or class mode.
- A full knowledge graph editor.
- A mobile redesign.
- A broad rewrite of the word library, review runner, or Memory Map.
- Making AI generation automatic on page load.

## User Experience

### Cockpit Entry

The Cockpit remains the first product surface. Its Context Lab call to action should feel like the next step in today's mission, not an unrelated tool link.

When weak words are available, the entry should carry those word ids or words into Context Lab so the user does not need to reselect them. When no weak words are available, the entry should still open Context Lab with a friendly empty state and a manual-word path.

### Context Lab Workflow

Context Lab should present a compact progress model:

1. Select words.
2. Generate practice.
3. Read and answer.
4. Review result.

The UI should preserve the current two-pane practice workspace: article reading on the left, questions on the right. The generation history stays visible as a way to resume or inspect previous practice packs.

Pending and processing tasks should show status and refresh behavior. Failed tasks should show the failure reason and a retry path that keeps the source words.

### Reading Pane Word Actions

Inside a generated article, selecting a word or phrase and opening the context menu should expose two actions:

- Translate: call the AI word query endpoint and show word, phonetic text, and Chinese meaning inline near the selection menu.
- Add to word library: call the same AI completion source, open the existing add-word modal with prefilled fields, and let the user confirm or edit before saving.

The selection menu must close predictably on scroll, outside pointer down, modal close, or practice modal close. It should show loading states for translation and add actions separately.

Selected phrases should default to the phrase type. Single words should default to the word type. Trim quotes, punctuation, and extra whitespace before querying or saving.

### Duplicate Handling

When saving from the selection flow, the app should check whether the cleaned word already exists. If it exists, the modal should stay usable and show a clear message such as "该词已在词库，无需重复添加". The flow should not claim the add failed because of an unknown error.

### Result Review

After answer submission, Context Lab should show:

- Score or correct count.
- Wrong question count.
- Weak words from the result when available.
- Next actions:
  - Start review for weak words.
  - Generate another Context Lab pack from weak words.
  - Open the word library.

The result review can be compact, but the user must understand what to do next.

## Frontend Architecture

Primary files:

- `apps/english-world/src/page/englishWorld/cockpit/LearningCockpitPage.tsx`
- `apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.tsx`
- `apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.test.tsx`
- `apps/english-world/src/page/englishWorld/contextLab/contextLabTask.ts`
- `apps/english-world/src/page/englishWorld/recite/planReview.ts`
- `apps/english-world/src/page/englishWorld/server/learning.ts`
- `apps/english-world/src/page/englishWorld/types/learning.ts`
- `apps/english-world/src/page/englishWorld/EnglishWorld.css`

Preferred structure:

- Keep `ContextLabPage.tsx` as the page orchestrator for this pass.
- Extract small pure helpers when behavior is easier to test, especially selected-text cleaning and result-to-next-action mapping.
- Reuse `EditAddModal` for selected-word confirmation.
- Reuse existing word APIs: `wordAgentQuery`, `wordExist`, and `wordAdd`.
- Avoid moving large blocks across files unless needed for testability.

The frontend should stop using demo fallback data in places where it can be mistaken for the user's real learning state. If a live request fails, show an explicit retryable error or empty state. Static examples are acceptable only when clearly labeled as examples or when used inside tests/prototypes.

## Backend Architecture

Primary files:

- `src/interface/context-lab/context-lab.controller.ts`
- `src/interface/context-lab/context-lab.service.ts`
- `src/interface/context-lab/context-lab.service.spec.ts`
- `src/interface/exercise-agent/exercise-agent.service.ts`
- `src/interface/exercise-agent/exercise-agent.service.spec.ts`
- `src/interface/word-agent/word-agent.service.ts`
- `src/interface/daily-coach/daily-coach.service.ts`

Backend changes should be narrow:

- Keep `word-agent/query` as the source for selected-word translation and add-modal prefill.
- Ensure `context-lab/submit` exposes enough result data for frontend review: score or correct count, weak words, and next suggestions.
- Preserve the existing async task and history model.
- Do not add a second AI query mechanism for selected text.

## Data Flow

1. Cockpit loads Daily Coach summary.
2. User opens Context Lab from the recommended context action.
3. Context Lab initializes its source from the recommended weak words when available.
4. User creates or opens a generated task.
5. User reads the article and selects text.
6. Translate action queries `word-agent/query` and displays the result in the context menu.
7. Add action queries `word-agent/query`, opens `EditAddModal`, checks duplicate status with `wordExist`, then saves through `wordAdd`.
8. User submits answers through `context-lab/submit`.
9. Result review presents weak words and routes the user to review, another generation, or the word library.

## Error Handling

- AI query failure: keep the selection menu open and show a concise error message.
- Duplicate word: show an explicit duplicate message and do not close the modal as if a save succeeded.
- Add save failure: keep modal input intact and show the backend or fallback error.
- Generation failure: show task failure status, reason, and retry action.
- Submit failure: keep answers visible and let the user retry.
- Cockpit data failure: do not show fake user metrics; show a retryable unavailable state.

## Testing

Frontend tests should cover:

- Context Lab selected-text translation calls `word-agent/query` and renders the returned meaning.
- Selected-text add opens the add modal with AI-completed fields.
- Duplicate selected-word add shows duplicate feedback and does not call `wordAdd`.
- Selection menu closes on reading-pane scroll and practice modal close.
- Submit result renders score or wrong count plus next-step actions.
- Cockpit-to-Context-Lab navigation preserves weak-word intent where supported.

Backend tests should cover:

- `context-lab/submit` result contains result-review fields.
- Existing exercise-agent task/history tests continue to pass.
- Word-agent missing-key and malformed-response behavior stays explicit.

## Verification

Required commands:

- Frontend focused test: `pnpm --filter @font/english-world test -- --run src/page/englishWorld/contextLab/ContextLabPage.test.tsx`
- Frontend full test: `pnpm --filter @font/english-world test -- --run`
- Frontend build: `pnpm --filter @font/english-world build`
- Backend test: `pnpm test --runInBand`
- Backend build: `pnpm build`
- Git whitespace check in each repo: `git diff --check`

## Success Criteria

- A real user can start from Cockpit and reach a generated Context Lab practice without guessing the next step.
- The user can translate selected reading text and add an AI-completed word or phrase to the library.
- Duplicate adds are handled clearly.
- The user can submit answers and see what to practice next.
- Live-data failures do not silently show demo learning data.
- Existing word library, AI word query, review, Memory Map, stats, and settings routes remain reachable.
