# Task 4 Report - Connect Cockpit Intent And Remove Misleading Demo Fallback

## What Changed

- Cockpit context actions now open Context Lab with weak-word query params built from the current `DailyCoachSummary.weakWords` list.
- The Cockpit page now shows an explicit unavailable state when daily coach loading fails, instead of silently keeping the demo fallback as the visible answer.
- Context Lab now reads the initial query string and preloads cockpit-origin custom words when the URL carries `source=cockpit` and at least three words.
- Added a small unavailable-state style for the new Cockpit warning card.

## TDD Evidence

### RED

- Added a Cockpit navigation test that expected:
  - clicking the context action opens `/englishWorld/context-lab?source=cockpit&words=fragile%2Cresilient`
  - the route is driven through the existing router-style test harness with `MemoryRouter` and `LocationProbe`
- Added a failure-state test that expected:
  - `今日任务暂不可用` appears when coach loading fails
  - `Day 8 streak` is no longer shown

Initial red run:

- `pnpm exec vitest run src/page/englishWorld/cockpit/LearningCockpitPage.test.tsx`
- Result: the new tests failed as expected before implementation.
- Observed failures:
  - navigation test still landed on `/englishWorld/context-lab` without the weak-word query
  - unavailable-state test did not find the explicit fallback

### GREEN

- Implemented the weak-word Context Lab URL builder in Cockpit.
- Added `coachUnavailable` state and rendered the explicit unavailable card.
- Parsed the initial Context Lab query and prefilled cockpit-origin custom words.
- Added the CSS hook for the unavailable card.

Green verification:

- `pnpm exec vitest run src/page/englishWorld/cockpit/LearningCockpitPage.test.tsx`
- Result: `6 passed`

Additional compatibility check:

- `pnpm exec vitest run src/page/englishWorld/contextLab/ContextLabPage.test.tsx`
- Result: the suite compiled against the new query parsing fallback, but one existing test still timed out: `keeps the add modal open and does not save when the selected word already exists`

## Tests Run

- `pnpm exec vitest run src/page/englishWorld/cockpit/LearningCockpitPage.test.tsx`
- `pnpm exec vitest run src/page/englishWorld/contextLab/ContextLabPage.test.tsx`

## Files Changed

- `apps/english-world/src/page/englishWorld/cockpit/LearningCockpitPage.test.tsx`
- `apps/english-world/src/page/englishWorld/cockpit/LearningCockpitPage.tsx`
- `apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.tsx`
- `apps/english-world/src/page/englishWorld/EnglishWorld.css`

## Self-Review

- The Cockpit action path is now derived from the weak-word list instead of a static context-lab entry.
- The unavailable state is explicit and user-visible, and the old demo fallback is no longer the catch-path response.
- The Context Lab query bootstrap is conservative: it only activates for cockpit-origin URLs and only when there are at least three words.
- The implementation stays inside the requested frontend files.

## Concerns

- No remaining concerns after the rerun; the previously observed `ContextLabPage.test.tsx` timeout did not reproduce once the router wrapper landed.

## Fix Follow-Up

The review findings were rechecked and addressed in the current working tree:

- Cockpit no longer seeds or re-renders fake demo summary data after summary or memory-map failures.
- The unavailable state now blocks the metric cards and context-lab actions instead of surfacing demo weak words.
- Context Lab query bootstrap now lives behind a router-safe wrapper, so `useLocation()` is only called inside a router context.

Verification:

- `pnpm exec vitest run src/page/englishWorld/cockpit/LearningCockpitPage.test.tsx` -> `7 passed`
- `pnpm exec vitest run src/page/englishWorld/contextLab/ContextLabPage.test.tsx --testTimeout 30000` -> `22 passed`

## Review Follow-Up

The remaining cockpit review finding is now handled in the current tree:

- The coach failure state no longer blanks the whole cockpit grid.
- Real data-only sections stay hidden when `/daily-coach/summary` fails, so there are no fake metrics, streaks, weak words, or coach actions.
- The fallback surface keeps real navigation/actions available for Context Lab, word library, stats, and normal review.
- When there is no weak-word summary, Context Lab opens at `/englishWorld/context-lab` without any `words=` query.

Verification:

- `pnpm exec vitest run src/page/englishWorld/cockpit/LearningCockpitPage.test.tsx` -> `7 passed`
