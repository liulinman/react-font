# English World Route-First Cockpit Design

Date: 2026-06-24

## Goal

Reduce homepage clutter by turning the cockpit into one clear daily learning route instead of a dashboard where every module competes as a primary entry.

## Design

The homepage should lead with "今日学习路线". The user sees a compact status strip for total words, today's new words, and recent accuracy, then follows the main Daily Coach card.

Daily Coach remains the primary surface. Suggested actions are the route: review first, context practice second, and memory review after that. Duplicate bottom calls to action are removed when suggested actions exist.

Context Lab and Memory Map stay visible, but they become supporting steps and results. The word library and stats become utility links in the side column, not primary homepage destinations.

## Scope

- Modify `apps/english-world/src/page/englishWorld/cockpit/LearningCockpitPage.tsx`.
- Modify `apps/english-world/src/page/englishWorld/dailyCoach/CoachSummaryPanel.tsx`.
- Modify `apps/english-world/src/page/englishWorld/EnglishWorld.css`.
- Update cockpit tests to assert the route-first information hierarchy.
- Do not change backend contracts, routes, authentication, login screens, or mobile pages.

## Verification

- `pnpm --filter @font/english-world exec vitest run src/page/englishWorld/cockpit/LearningCockpitPage.test.tsx`
- `pnpm --filter @font/english-world build`
