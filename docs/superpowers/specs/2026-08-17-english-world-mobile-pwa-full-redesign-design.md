# English World Full Mobile PWA Redesign

Date: 2026-08-17
Status: approved design, pending written review

## Goal

Deliver an iPhone-first Progressive Web App that exposes every existing English
World desktop capability through a purpose-built mobile interface. The mobile
experience must never fall back to desktop sidebars, wide tables, split panes,
or hover-only controls. Existing desktop pages remain behaviorally and visually
unchanged.

The application is for personal use. It is installed from Safari with **Add to
Home Screen**, not distributed through the App Store, TestFlight, or a native
wrapper.

## Product Decisions

- The PWA starts at `/mobile`.
- `/englishWorldMobile` remains as a compatibility redirect.
- Mobile uses an independent route tree and mobile-specific page composition.
- Desktop and mobile share API contracts, domain rules, validation, query keys,
  and learning state machines.
- The visual language follows restrained iOS conventions: system typography,
  grouped lists, semantic colors, shallow tonal hierarchy, and predictable
  navigation.
- iPhone portrait is the primary orientation. Landscape remains usable but does
  not become a desktop layout.
- Every existing Web capability must have a mobile surface and an automated
  acceptance path.
- The home page prioritizes word search and vocabulary maintenance because that
  is the owner's most frequent entry task.
- In-app notifications are included. System lock-screen push is outside this
  version.
- Lightweight offline continuity is included. Full offline data replication is
  not.

## Options Considered

### Independent Mobile Route Tree With Shared Business Logic

Selected. Keep desktop pages intact, create `/mobile/*` pages using Ant Design
Mobile, and extract or reuse UI-independent logic behind both surfaces.

This provides the strongest mobile ergonomics and the lowest desktop regression
risk. It accepts deliberate view-layer duplication where desktop and mobile
composition genuinely differ.

### One Responsive UI for Desktop and Mobile

Rejected. The existing application mixes dense Ant Design workspaces, wide
tables, modal flows, charts, and mobile-specific Ant Design Mobile controls.
Making every desktop page responsive would couple two interaction models and
turn most mobile screens into reduced desktop layouts.

### Separate Standalone PWA Application

Rejected. A second application would provide clean isolation but duplicate
authentication, theme, notification, query, and learning integration. It would
also increase the chance that desktop and mobile capabilities drift.

## Information Architecture

The mobile shell has four persistent bottom destinations.

| Tab | Purpose | Primary routes |
|---|---|---|
| 学习 | Search-first home, recent words, quick creation, daily review, learning cockpit | `/mobile`, `/mobile/review`, `/mobile/learn/session/:sessionId` |
| 词库 | Search, filter, browse, inspect, add, edit, delete, mastery and media | `/mobile/words`, `/mobile/words/new`, `/mobile/words/:wordId`, `/mobile/words/:wordId/edit` |
| 工具 | AI, Context Lab, IELTS, memory, statistics and library administration | `/mobile/tools/*` |
| 我的 | Account, notifications, settings, appearance and PWA status | `/mobile/me/*` |

### Full Capability Map

| Desktop capability | Mobile route/surface |
|---|---|
| Learning cockpit | `/mobile` learning summary and `/mobile/learning` detail |
| Word library list/card workflows | `/mobile/words` compact list plus detail pages |
| Word create and edit | `/mobile/words/new`, `/mobile/words/:wordId/edit` |
| Word images, notes, reference and mastery | `/mobile/words/:wordId` and edit page |
| Daily recitation | `/mobile/review` |
| Mixed learning session | `/mobile/learn/session/:sessionId` |
| Word Agent | `/mobile/tools/ai-word` |
| Context Lab | `/mobile/tools/context-lab/*` |
| IELTS core review | `/mobile/tools/ielts-core` |
| Memory map | `/mobile/tools/memory-map` |
| English statistics | `/mobile/tools/stats` |
| Bulk import | `/mobile/tools/bulk-import` |
| Overwrite statistics | `/mobile/tools/overwrite-stats` |
| System settings | `/mobile/me/settings` |
| Theme settings | `/mobile/me/appearance` |
| Notification inbox | `/mobile/me/notifications` |

The router maintains a desktop-to-mobile mapping. When the PWA is running in
standalone mode, legacy desktop deep links resolve to the corresponding mobile
route, preserving meaningful query parameters and identifiers. A mobile route
never redirects to a desktop presentation.

## Key Experience Designs

### Search-First Home

The first viewport contains:

1. A 16px-or-larger search input for English words or Chinese meanings.
2. Quick actions for manual add, AI completion, and bulk import.
3. Recently viewed vocabulary with pronunciation and mastery cues.
4. A secondary daily-review card with remaining count and continuation action.

The home page is not a grid-style admin dashboard. It is a fast entry point for
the owner's most common word-maintenance task.

### Word Library

The library uses a compact, virtualizable list. Each row contains only the
information needed for recognition: word, phonetic/meaning summary, mastery
indicator, pronunciation, and disclosure affordance. Tapping opens a dedicated
detail page.

The detail page contains complete metadata, images, notes, reference source,
mastery history, edit, practice, and delete actions. Swipe actions may accelerate
common operations, but every swipe action has an equivalent labeled action in
the detail menu.

Filters use a bottom sheet. Complex add/edit forms use full-screen routes so the
software keyboard and validation errors do not fight a constrained modal.

### Daily Review and Mixed Learning

Review presents one activity at a time in a full-screen stage. Progress occupies
the top navigation area. The activity owns the center. Primary and recovery
actions occupy a keyboard- and safe-area-aware bottom action region.

Submitting an answer updates the current stage in place to show the authoritative
result, explanation, and repair action before moving to the next item. The flow
retains positive/negative direction, listening, spelling, micro-scene, hints,
skip reasons, recovery, result history, and weak-word repair.

### Context Lab

Context Lab becomes a drill-down flow rather than a mobile copy of the desktop
split workspace:

1. Task list and status history.
2. Task creation and generation progress.
3. Article reading.
4. Marked-word review and import.
5. Question answering.
6. Result review and next actions.
7. Attempt history and attempt detail.

Each stage is independently routable and resumable. Reading supports text
selection, marking, translation, direct add, and mark-first/import-later through
a touch action sheet with a bottom-sheet fallback. Scrolling dismisses transient
selection controls without discarding marked words.

### Dense Desktop Features

- Statistics use vertically stacked summaries and horizontally scrollable or
  responsive chart controls, never a scaled desktop chart grid.
- Memory map uses summary groups and drill-down lists; the graph is optional
  visualization, not the only navigation mechanism.
- Bulk import is a mobile wizard: source → parsing → conflict decisions → editable
  preview → confirmation → result. Files use the browser file picker.
- Overwrite statistics use filterable list/detail presentation instead of a wide
  table.
- Settings use iOS-style grouped rows with detail routes for complex configuration.

## Frontend Architecture

### Route-Level Modules

```text
src/mobile/
  shell/
    MobileAppShell
    MobileNavBar
    MobileTabBar
    MobileNetworkStatus
    MobileUpdatePrompt
  home/
  words/
  review/
  learning/
  tools/
    ai-word/
    context-lab/
    ielts-core/
    memory-map/
    stats/
    bulk-import/
    overwrite-stats/
  account/
    notifications/
    settings/
    appearance/
  pwa/
    draft-store
    persisted-query-cache
    update-coordinator
```

The exact directory name may remain under the existing
`page/englishWorldMobile` boundary if project conventions make that safer. The
module responsibilities, not a particular folder spelling, are the contract.

### Shared Layers

```text
mobile page
  → mobile feature hook/view model
    → shared domain rule or learning state machine
      → shared API descriptor/query key
        → NestJS API
```

Shared modules cannot import Ant Design, Ant Design Mobile, browser layout
components, or route-level presentation. They expose typed inputs, results, and
state transitions. Mobile-specific view models translate those contracts into
page states and mobile interaction events.

React Query remains the source of server state. Component-local state handles
transient UI. IndexedDB holds only resumable drafts and explicitly persisted
recent query data.

### App Shell Ownership

`MobileAppShell` owns:

- safe-area and dynamic-viewport layout;
- the four-tab navigation;
- route title and top actions;
- online/offline status;
- deferred PWA update prompts;
- one scroll container per route;
- global error boundary and authentication handoff.

Feature pages own their content scroll, page-specific sheets, and page actions.
They do not independently calculate tab-bar or home-indicator offsets.

## PWA and Offline Design

### Install Surface

The Web build adds:

- a Web App Manifest with standalone display mode and `/mobile` start URL;
- Apple touch icons and mobile status-bar metadata;
- a Service Worker registered only for production-capable builds;
- an offline application shell;
- route-aware update coordination.

### Cache Boundaries

The Service Worker precaches versioned static assets and the offline shell. It
does not cache mutation responses or invent offline API behavior. Recently used
read-only data is persisted through a user-scoped React Query persistence layer.

Draft categories include:

- unsaved word add/edit form values;
- current review answers and logical attempt identifiers;
- learning-session public drafts already supported by the domain;
- Context Lab answers, marked words, and reading position;
- bulk-import preview before the destructive confirmation step.

Drafts carry user id, schema version, feature key, entity/task id when applicable,
and last-updated time. Logout clears user-scoped drafts and persisted queries.

### Offline Behavior

- The application can open and navigate to cached recent surfaces.
- Cached data is labeled as potentially stale.
- Draftable inputs remain editable and survive foreground/background cycles.
- AI generation, refreshed statistics, new server tasks, uploads, and destructive
  changes show a precise online requirement.
- Destructive operations are never silently queued or replayed.
- When connectivity returns, the user resumes and explicitly submits.

### Updates

The Service Worker may download a new version in the background. Activation is
deferred while any registered draft surface is dirty or a learning submission is
in flight. When safe, the shell offers a single update action. It never reloads
the application in the middle of typing, reading selection, answering, upload,
or result recovery.

## iOS Interaction Contract

- Viewport uses device width, initial scale 1, and `viewport-fit=cover`.
- Intentional pinch zoom remains available.
- Inputs, textareas, selects, and content-editable controls render at 16px or
  larger to prevent focus zoom.
- Interactive targets are at least 44×44 CSS pixels.
- Touch controls use manipulation-appropriate behavior and never depend on
  double-tap.
- The shell uses dynamic viewport units with a fallback and reserves
  `safe-area-inset-top` and `safe-area-inset-bottom` centrally.
- Fixed action bars move with or above the software keyboard and do not cover the
  focused control or final content.
- Back navigation follows route history and works with Safari/iOS edge gestures.
- Modal depth is one. Filters, pickers, and confirmations use bottom sheets;
  complex tasks use routes.
- No capability is hover-only, right-click-only, or encoded solely by color.
- Landscape preserves a readable single-column or carefully widened layout and
  never exposes desktop sidebars or tables.

## Visual System

Mobile inherits the iOS system-font ramp and semantic surface conventions while
remaining a Web implementation. Light and dark appearances use semantic tokens,
not page-local colors. Accent color is reserved for selection, navigation, links,
and the primary action.

Core primitives:

- navigation bar;
- four-item tab bar;
- grouped list and disclosure row;
- compact word row;
- full-screen form;
- bottom sheet and action sheet;
- keyboard-safe action bar;
- skeleton, empty, stale, error, and offline states;
- status badge with text and icon, never color alone.

Visual specifics live in the companion UX contract:
`docs/ux-designs/ux-english-world-mobile-pwa-2026-08-17/DESIGN.md`.

Behavioral specifics live in:
`docs/ux-designs/ux-english-world-mobile-pwa-2026-08-17/EXPERIENCE.md`.

## Authentication and Notifications

The PWA continues to use the existing same-origin Cookie authentication behind
the deployed `/api` proxy. A native-token authentication redesign is unnecessary
for this PWA.

The global notification provider remains the source of in-app notifications.
Mobile exposes an inbox route and an unread badge in `我的`. The system does not
request Web Push permission or attempt lock-screen delivery in this version.

## Error and State Design

Every route defines:

- geometry-matched loading skeleton;
- actionable empty state;
- cached/stale state;
- offline state;
- recoverable request failure that preserves user input;
- permission or file failure with a specific reason;
- mutation-in-flight and duplicate-submit protection;
- authoritative success state and next action.

Errors are shown within the feature surface whenever recovery belongs there.
Global toasts are reserved for short confirmations or errors with no local
recovery UI. Failed submissions retain their logical request identifiers where
the existing domain requires idempotent retry.

## Performance Design

The current single production bundle is too large for an app-like cold start.
The mobile route tree uses route-level lazy loading. The initial mobile entry
loads only authentication, theme, shell, home, common API/query dependencies,
and required mobile primitives. Charts, PDF/export paths, Context Lab, IELTS,
memory map, and bulk import load on demand.

Acceptance uses simulated mobile Lighthouse and build artifact inspection rather
than a hard dependency on physical-device profiling. Performance regressions are
reported by entry route and lazy chunk instead of hiding the warning with a
larger bundler threshold.

## Testing Strategy

### Capability Matrix

Maintain a machine-readable or test-visible matrix that maps every desktop route
and primary capability to a mobile route and E2E scenario. A feature is not
mobile-complete merely because a link exists; the workflow must finish inside
the mobile route tree.

### Automated Viewports

Run key layout scenarios at widths 320, 375, 390, 393, and 430 pixels with
representative short/tall heights and landscape dimensions.

Layout contracts assert:

- no document-level horizontal overflow;
- 44px minimum primary targets;
- 16px minimum editable text;
- safe-area reservation;
- final content scrolls above fixed actions;
- keyboard appearance does not hide focus or submit actions;
- long words, notes, tags, generated text, charts, and error messages remain
  inside their containers.

### Test Layers

1. Pure domain and adapter tests for shared rules.
2. Component tests for each mobile feature state.
3. Router tests for legacy link mapping and deep-link recovery.
4. WebKit E2E for login, word CRUD, upload, review, mixed learning, AI, Context
   Lab, IELTS, memory map, statistics, import, overwrite analysis, settings,
   theme, and notifications.
5. PWA tests for manifest, start URL, offline shell, persisted draft recovery,
   logout cleanup, and update deferral.
6. Visual screenshot regression for login, home, library, word detail, review,
   tool center, Context Lab, statistics, and settings.
7. Full existing desktop suite and production build.

Formal physical-device certification is not required. Automated WebKit coverage
and responsive browser inspection are the agreed verification boundary.

## Implementation Boundaries

- No redesign of desktop pages.
- No App Store packaging or native iOS project.
- No system push notifications.
- No full offline database or background synchronization of destructive writes.
- No backend schema change unless an existing API contract demonstrably cannot
  support the same workflow on mobile.
- No broad replacement of Ant Design or Ant Design Mobile.

## Success Criteria

- Every existing desktop capability can be completed from an iPhone-sized PWA
  without entering a desktop layout.
- Search and vocabulary maintenance are the fastest home-page actions.
- Clicking navigation, buttons, and form controls never causes unintended page
  zoom or layout scaling.
- All forms and actions remain reachable above the iOS keyboard and home
  indicator.
- Recent content and unfinished work survive a temporary network loss.
- Desktop behavior remains unchanged and its existing tests continue to pass.
- The mobile application builds as a valid installable PWA with a lazy-loaded,
  app-like entry path.
