# React Font Refactor Design

Date: 2026-05-22

## Scope

This design covers the first refactor phase for the `react-font` monorepo. The goal is to make the project easier to change without changing user-facing behavior.

Included:

- Restore a useful quality baseline by fixing current lint failures.
- Make API target configuration explicit and local-development safe.
- Refactor the `english-world` word-management feature so page components stop owning request orchestration, filter shaping, mutation flows, and statistics shaping.
- Keep desktop and mobile UI behavior compatible with the current app.

Not included:

- Large visual redesigns.
- Backend API changes.
- Database changes.
- Full bundle-size optimization beyond changes naturally enabled by cleaner boundaries.
- Rewriting `web-utils` pages beyond what is needed to pass lint.

## Current Problems

The repo builds, but it is hard to maintain.

- `apps/english-world/src/page/englishWorld/EnglishWorld.tsx` mixes routing state, filters, pagination, CRUD requests, modal state, and table rendering.
- `apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.tsx` is over 1,200 lines and repeats desktop business flows in mobile-specific code.
- AI and exercise tabs contain stream parsing and UI rendering in the same component.
- API target selection is implicit. In development it uses `/api`, and Vite proxies to a backend. `localhost` can resolve to the wrong local service when multiple listeners exist, so the proxy should use `127.0.0.1`.
- `pnpm lint` currently fails in `web-utils`.
- README still describes the Vite template rather than this monorepo.

## Architecture

The first phase introduces feature-level boundaries in `english-world` while preserving the existing app structure.

Proposed layout:

```text
apps/english-world/src/page/englishWorld/
  EnglishWorld.tsx
  component/
  hooks/
    useWordList.ts
    useWordMutations.ts
    useWordStats.ts
  utils/
    wordFilters.ts
    wordLabels.ts
```

The existing `server/*` modules remain request descriptor modules. They should not know about UI state. Hooks will sit between request descriptors and components.

`packages/api` remains the shared request layer. API base URL behavior should be explicit:

- Development default: `/api`
- Vite proxy target default: `http://127.0.0.1:3000`
- Production/default remote override: `VITE_API_BASE_URL`

## Components

### Word List Hook

`useWordList` owns:

- `wordList`
- `loading`
- `page`
- `pageSize`
- `total`
- current filters
- `fetchWordData`
- search/reset/page-change helpers

Components pass UI form values into a filter-normalizing utility instead of manually mutating ad hoc objects.

### Word Mutations Hook

`useWordMutations` owns:

- add
- edit
- delete
- existence checks
- refresh-after-mutation behavior

The hook exposes command functions. Desktop can show Ant Design `message`/`Modal`; mobile can show `Toast`/`Dialog`. UI-specific feedback stays in the caller or a thin adapter so the hook does not depend on both desktop and mobile component libraries.

### Word Stats Hook

`useWordStats` owns:

- selected level
- summary stats
- daily stats
- part-of-speech stats
- loading state
- conversion from API records to chart-ready arrays

Chart option objects should stay close to chart components unless shared calculation is needed.

### Filter and Label Utilities

`wordFilters.ts` owns:

- date-range conversion to `startTime` and `endTime`
- empty-value removal
- desktop and mobile filter normalization

`wordLabels.ts` owns:

- type labels
- level labels
- part-of-speech labels and colors

These utilities are pure functions and should have focused tests if the test setup is already practical. If test setup blocks progress, they should be written in a way that is easy to test in a follow-up.

## Data Flow

1. Page renders UI controls and reads form state.
2. Form state is normalized by `wordFilters.ts`.
3. `useWordList` calls `wordFilter` through `@font/api`.
4. Mutations use `wordAdd`, `wordUpdate`, `wordDel`, and `wordExist`.
5. After a successful mutation, the hook refreshes the current list with the current filters.
6. Components render the resulting state.

No backend payload shapes change in this phase.

## Error Handling

The shared Axios interceptor remains responsible for global request error messages. Feature hooks should:

- reset loading state in `finally`;
- return useful success/failure results to callers;
- avoid duplicate global and local error spam;
- preserve current user-facing success messages.

The local-development proxy bug is fixed by targeting `127.0.0.1` instead of `localhost` in Vite proxy configuration.

## Testing and Verification

Required verification for this phase:

- `pnpm --filter @font/english-world build`
- `pnpm --filter @font/web-utils build`
- `pnpm lint`

Expected current issue:

- `pnpm lint` fails before this phase because of existing `web-utils` lint errors. The phase is complete only when those errors are fixed or explicitly documented as out of scope by the user.

Manual smoke checks:

- Login works through the local Vite proxy.
- Desktop word list loads, filters, paginates, adds, edits, and deletes.
- Mobile word list loads, searches, filters, adds, edits, deletes, and loads more.
- Stats view still renders data.
- AI tool tabs still render.

## Implementation Order

1. Fix Vite proxy targets and API base configuration.
2. Fix current `web-utils` lint failures without changing behavior.
3. Add `wordFilters` and `wordLabels` utilities.
4. Extract `useWordList` from desktop behavior.
5. Extract mutation helpers and wire desktop page through them.
6. Reuse the shared utilities in mobile page, keeping mobile UI intact.
7. Run build and lint verification.

## Risks

- Desktop and mobile flows are similar but not identical. Shared logic should be extracted only where behavior is actually the same.
- React Query mutation typing in `@font/api` is custom; changes there should be conservative.
- The repo has limited automated tests, so manual smoke testing remains important after refactoring.
