# Mobile study redesign implementation plan

> Execute using superpowers:executing-plans; user delegated implementation and review choices.

**Goal:** Deliver usable, polished vocabulary study and review on the installed iPhone app.
**Architecture:** Dedicated mobile screens using existing server descriptors and user-scoped draft persistence. Keep desktop intact.
**Tech Stack:** React, TypeScript, React Query, CSS, Capacitor.
**Spec:** ../specs/2026-10-08-mobile-study-redesign.md

## Constraints / review focus
- Preserve existing dirty work. Do not auto-submit or fabricate server progress.
- User changes, stale storage, network failures and repeated taps must not lose answers or repeat mutations automatically.
- Word scope must honor selected IDs and never silently select unrelated words.
- Empty/error/offline states must have useful recovery; hide unfinished feature links.
- Real mobile keyboard, narrow width, long words and safe areas must remain usable.

## Tasks
- [x] Draft model and flashcard learning: `features/study/studyStorage.ts`, `MobileLearnPage.tsx`. Test user isolation/invalid data, selected IDs, reveal before rating, retained card on mutation failure. Use wordUpdateLevel only on explicit rating.
- [x] Review: `MobileReviewPage.tsx` and review subcomponents. Test recite start, next/back retaining answers, duplicate submission guard, empty/error states, persisted result, wrong-word-only restart. Submit all question IDs with blank unanswered values.
- [x] Dashboard and progress: replace MobileHomePage, create MobileProgressPage, MobileToolsPage; connect stats/history, hide unsupported links; keep word search/add/recent.
- [x] Visual system: tokens, scoped study CSS, icon tabs, login, account, words. Verify screenshots and behavior, avoiding brittle style-unit tests.
- [x] Register routes and align old tests with intentional home/navigation changes. Add Cypress complete study/review fixture flow and responsive screenshots.
- [x] Focused tests → full suite → web/iOS builds → native session checks → iPhone signed build/install. Fresh review per requesting-code-review skill. Record exact results and remaining limits.

No commits requested. Tests precede behavior implementation; CSS changes verified visually.

## Evidence and rulings

User delegated decisions; implemented in the current dirty feature checkout to preserve the working signed iOS app and earlier changes. No commits, pushes or server deployment.

Ruling: focus this delivery on core flashcards + existing recite scoring rather than migrate all advanced desktop learning engines. Remove unsupported entry links; do not label manual mastery as automatic spaced repetition.

RED→GREEN: initial study/review 4 cases; home priority/unsupported links; review history isolation; delayed-submit navigation; pending Previous navigation; historical retry collision; native speech boundary; selected-round resume storage. Final focused study/home/storage15 pass; full89files539 pass plus newest storage test. Cypress2 pass; native3 pass including actual WebView flow and system speech bridge. Browser build/PWA passed, native assets restored to production URL.

Independent reviewer found historical draft collisions, navigation duplicate submissions and stale result URLs; fixed. Recheck found pending Previous could overwrite late results and retry identity could collide; both fixed with regressions. Synchronous persistence preserves late responses, pending drafts are read-only, historical retry has a unique source/direction round, and home remembers the last unfinished route per user.

Physical-device install outcome recorded in IOS.md. Remaining advanced desktop tools excluded from this core study delivery; no production learning data changed by tests.
