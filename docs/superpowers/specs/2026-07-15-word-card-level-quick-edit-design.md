# Word Card Mastery Quick Edit Design

Date: 2026-07-15

## Goal

Let users change word mastery directly from the card view without opening the full edit modal, and let them update multiple cards on the current page in one action.

## Interaction

Each card's current mastery tag becomes an accessible dropdown trigger. It shows `不会`, `一般`, `熟练`, or `精通`; choosing another level saves immediately and updates the tag in place.

The card-view toolbar adds `批量管理`. While active:

- every card shows a checkbox;
- `全选当前页` selects all cards currently rendered;
- the batch toolbar shows the selected count and four one-click level actions;
- choosing a level updates every selected card immediately;
- exiting batch mode, changing page, changing view, searching, or resetting clears the selection.

The full edit and delete actions remain available.

## Data Contract

Expose the existing backend `updateEnglishWordLevel` service through `POST /english/updateEnglishWordLevel` with `{ id, englishLevel }`. `englishLevel` is limited to integers `0` through `3`. The frontend uses this narrow endpoint for both single and parallel batch updates instead of sending a complete word record.

The frontend applies an optimistic local update. If a request fails, only the failed word rolls back. A batch uses parallel requests, reports successful and failed counts once, clears successful selections, and keeps failed cards selected for retry.

## States and Accessibility

- A card-level trigger is disabled while that card is saving and shows a loading icon.
- Batch controls are disabled while the batch is saving.
- Current mastery is marked in the dropdown.
- Buttons and checkboxes include the word name or target level in their accessible names.
- Selected cards use both a checkbox and a border/background change; color is not the only cue.

## Scope

- Card view only; list view stays unchanged.
- Current page only; selection never spans pagination.
- Exercise rendering and answer submission stay unchanged.
- No database migration or new dependency.

## Verification

- Backend service/controller behavior is covered by Jest and a production build.
- The quick-edit trigger and all four levels are covered by a focused component test.
- Word-library tests cover a single update, selecting all current cards, parallel batch update, selection reset, and failed rollback.
- The frontend full test suite, TypeScript build, and browser checks validate regression and layout behavior.
