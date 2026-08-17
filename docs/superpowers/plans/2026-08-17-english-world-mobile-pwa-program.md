# English World Mobile PWA Program Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the legacy mobile single page with a complete, installable, iPhone-first PWA that exposes every English World desktop capability without changing desktop behavior.

**Architecture:** Build an independent lazy-loaded `/mobile/*` route tree under a shared `MobileAppShell`. Reuse API descriptors, domain functions, React Query keys, learning contracts, reducers, and state machines; keep Ant Design desktop components out of mobile page composition. Store resumable user drafts and recent read-only snapshots in user-scoped IndexedDB, while a service worker owns only the shell/static cache and safe update lifecycle.

**Tech Stack:** React 18, TypeScript 5.7, React Router 7, Ant Design Mobile 5, TanStack React Query 5, IndexedDB, Vite 6, Vitest, Testing Library, Cypress regression tests, Playwright WebKit mobile tests.

**Spec:** `docs/superpowers/specs/2026-08-17-english-world-mobile-pwa-full-redesign-design.md`

## Global Constraints

- Desktop routes under `/englishWorld/*` keep their existing UI and behavior.
- Mobile starts at `/mobile`; `/englishWorldMobile` is a compatibility redirect.
- No `/mobile/*` route may render a desktop page, Ant Design desktop workspace, wide table, split pane, or hover-only action.
- Bottom navigation has exactly `学习`, `词库`, `工具`, `我的`.
- iPhone portrait is primary; 320, 375, 390, 393, and 430 CSS-pixel widths plus representative landscape widths must remain operable.
- Editable controls use at least `16px` text; actionable targets are at least `44px` in both dimensions.
- Do not disable intentional pinch zoom globally. Images and long-form reading remain zoomable.
- Respect `env(safe-area-inset-*)`, dynamic viewport height, software keyboard, dark mode, Dynamic Type, and Reduced Motion.
- Offline mode may show the shell and recent cached content and preserve unfinished input. AI, refreshed statistics, and new server tasks require connectivity.
- Never automatically replay delete, overwrite, or another destructive mutation after reconnect.
- Updates may download in the background but cannot reload while a draft, review, or learning session is active.
- In-app notifications remain; system push, App Store, TestFlight, native wrapper, and formal physical-device certification are outside scope.
- All feature work follows test-first development and ends in a focused commit.

---

## Program Decomposition

The approved specification spans six independently reviewable subsystems. Execute these plans in order; each leaves the application runnable and has its own acceptance gate.

| Phase | Plan | Independently testable outcome |
|---|---|---|
| 1 | `2026-08-17-mobile-pwa-foundation.md` | Lazy `/mobile/*` routes, four-tab shell, design primitives, IndexedDB draft layer, manifest/service worker/update lifecycle. |
| 2 | `2026-08-17-mobile-vocabulary-home.md` | Search-first home, recent words, full word library/detail/add/edit/delete, AI word query, bulk import. |
| 3 | `2026-08-17-mobile-learning-review.md` | Daily review, repair/result, mixed-learning setup/session, cockpit, IELTS core. |
| 4 | `2026-08-17-mobile-context-lab.md` | Context Lab task/create/read/answer/result/attempt routes with selection/import and resumable answers. |
| 5 | `2026-08-17-mobile-tools-account.md` | Tools hub, statistics, memory map, coverage statistics, notifications, settings, appearance, account and PWA status. |
| 6 | `2026-08-17-mobile-release-hardening.md` | Capability proof, WebKit viewport/accessibility/offline/update coverage, performance budgets, legacy removal and full regression. |

## Locked File Structure

```text
apps/english-world/
├── public/
│   ├── icons/
│   └── pwa/
├── src/page/englishWorldMobile/
│   ├── app/                 # routes, shell, route/error/update boundaries
│   ├── components/          # mobile-only visual and interaction primitives
│   ├── features/
│   │   ├── home/
│   │   ├── words/
│   │   ├── aiWord/
│   │   ├── bulkImport/
│   │   ├── review/
│   │   ├── learning/
│   │   ├── cockpit/
│   │   ├── ieltsCore/
│   │   ├── contextLab/
│   │   ├── stats/
│   │   ├── memoryMap/
│   │   ├── coverageStats/
│   │   ├── tools/
│   │   ├── notifications/
│   │   └── account/
│   ├── offline/             # IndexedDB, connectivity, cache/draft policy
│   ├── pwa/                 # registration and safe-update state
│   ├── styles/              # tokens, shell and accessibility contracts
│   └── testing/             # render helpers and capability manifest
├── playwright/
│   ├── fixtures/
│   └── mobile/
└── playwright.config.ts
```

Shared business modules stay in their current desktop-neutral locations, including:

- `src/server/word/*`
- `src/server/notification/*`
- `src/page/englishWorld/server/learning.ts`
- `src/page/englishWorld/learning/api/*`
- `src/page/englishWorld/learning/contracts/*`
- `src/page/englishWorld/learning/session/learningSessionReducer.ts`
- `src/page/englishWorld/contextLab/*.ts`
- `src/page/englishWorld/recite/planReview.ts`
- `src/page/englishWorld/recite/reviewExperience.ts`
- `src/page/englishWorld/utils/*`

## Cross-Phase Interfaces

Phase 1 owns these contracts; later phases consume them without renaming:

```ts
export type MobileDraftKind =
  | "word-form"
  | "bulk-import"
  | "review"
  | "learning"
  | "context-create"
  | "context-reader"
  | "context-answer";

export type MobileDraftRecord<T> = {
  key: string;
  userId: number;
  kind: MobileDraftKind;
  updatedAt: string;
  value: T;
};

export interface MobileStorage {
  getDraft<T>(userId: number, kind: MobileDraftKind, key: string): Promise<T | null>;
  putDraft<T>(record: MobileDraftRecord<T>): Promise<void>;
  deleteDraft(userId: number, kind: MobileDraftKind, key: string): Promise<void>;
  getSnapshot<T>(userId: number, key: string): Promise<T | null>;
  putSnapshot<T>(userId: number, key: string, value: T): Promise<void>;
  clearUser(userId: number): Promise<void>;
}

export type MobileUpdateState =
  | { status: "idle" | "checking" }
  | { status: "ready"; apply: () => void }
  | { status: "error"; message: string };
```

Phase 2 owns `wordKeys`, `recentWordStore`, and mobile word form contracts. Phase 3 owns review/session activity-lock signals. Phase 4 owns Context Lab route parameter parsers. Phase 5 only composes those contracts and does not duplicate them.

## Specification Coverage Index

| Approved specification section | Implemented and proved by |
|---|---|
| Goal, product decisions, selected architecture | Foundation Tasks 1–3; Release Tasks 4–6 |
| Information architecture and full capability map | Foundation Tasks 1–2 and 7; all feature plans; Release Task 5 |
| Search-first home and word library | Vocabulary Tasks 1–5 |
| AI word query and bulk import | Vocabulary Tasks 6–7 |
| Daily review, wrong-word repair, mixed learning | Learning Tasks 1–4 |
| Cockpit and IELTS core | Learning Tasks 5–6 |
| Context Lab task/create/read/answer/result/attempts | Context Lab Tasks 1–7 |
| Statistics, memory map, coverage statistics | Tools/Account Tasks 2–4 |
| App shell ownership and route-level modules | Foundation Tasks 2–3; Release Task 4 |
| PWA installation, cache boundaries, offline continuity, safe updates | Foundation Tasks 4–5; Release Task 3 |
| iOS zoom, touch, safe-area, keyboard, landscape, Reduced Motion | Foundation Task 3 and 7; Release Task 2 |
| Visual system and reusable mobile component contracts | Foundation Task 3; `DESIGN.md`; each feature page plan |
| Authentication and deep-link recovery | Foundation Tasks 2 and 6 |
| In-app notifications and account revocation | Tools/Account Tasks 5 and 7 |
| Loading, empty, error, offline, conflict and destructive states | Foundation Task 3; feature-level tests in Phases 2–5 |
| Performance and lazy-loading boundaries | Release Task 4 |
| Capability matrix, unit, desktop regression, responsive and WebKit testing | Release Tasks 1–5 |
| Legacy removal and success criteria | Release Task 6 |

Self-review result: every approved specification section maps to at least one implementation task and one verification path; no feature is intentionally deferred.

## Program Acceptance Gate

After every phase:

```bash
pnpm --filter @font/english-world exec vitest run
pnpm --filter @font/english-world build
```

After Phase 6:

```bash
pnpm --filter @font/english-world lint
pnpm --filter @font/english-world exec vitest run
pnpm --filter @font/english-world build
pnpm --filter @font/english-world e2e
pnpm --filter @font/english-world exec playwright test --project=webkit-mobile
```

Expected: every command exits `0`; `/englishWorld/*` regression suites remain green; the mobile capability matrix reports zero unmapped capabilities; the production build shows route-level mobile chunks rather than one eager mobile bundle.

## Commit Sequence

Use the focused commit named at the end of each task. Never combine a desktop refactor with a mobile feature commit. Do not delete the legacy `EnglishWorldMobile.tsx` until the Phase 6 compatibility tests prove that `/englishWorldMobile` redirects to `/mobile` and no import remains.
