# Mobile article practice implementation plan

> Execute via superpowers:executing-plans; user has delegated design and execution.

**Goal:** Add complete article practice to the installed phone app.
**Architecture:** Dedicated mobile reading routes, existing context-lab API, React Query polling, user/task draft storage.
**Tech Stack:** React, TypeScript, CSS, Capacitor native HTTP.
**Spec:** ../specs/2026-10-08-mobile-article-practice.md

## Review focus
- Task IDs differ from article exercise IDs; submission must use the latter.
- Account/task changes, route changes and late requests must not corrupt another draft.
- Generation uses polling; failure retains form values and never creates again automatically.
- Loading/error/history viewing must not reveal or submit an unrelated draft.
- Pending submit persists across navigation; selection disabled until known result or explicit recovery.

## Tasks
- [x] Article library and generation routes: paginated task list, polling, weak/random/custom/paste form, source seeds from word selection. Test inputs and descriptors before implementing.
- [x] Reading and answer route: paragraphs, optional translation, radio choices, progress, preserved drafts, submission and result. Test articleExerciseId, unanswered/invalid choices, pending ownership, late completion.
- [x] Attempt history and result routes: read-only history, score/explanation/correct answer, retry starts deliberate new round. Never erase active draft just by viewing history.
- [x] Homepage/tool/word library entry points and scoped mobile visual design.
- [x] Focused tests, mobile E2E, native fixture UI test, full regression/build, fresh review; signed phone install and launch.

No commits or server deployment requested. Current repo is the working installation checkout; preserve pre-existing changes.

## Validation notes
- Initial 4 tests failed against empty reader/history stubs; final 7 article tests pass.
- New article browser flow passes with fixture API, translated paragraphs, reload preservation, exact exercise identifier, historical explanations, deliberate retry, and 320px overflow check.
- Native fixture XCTest: 4 tests pass, including article reading/answer/score through the real native HTTP bridge. Production assets restored after test.
- Independent reviewer found retry round recovery and late navigation issues; fixed with per-user/task active-round storage and effect lifetime guard, regression tests pass, re-review clear.
- ESLint new article modules: no errors. Signed build and overwrite installation succeeded; launch blocked by locked phone. Full suite 91 files / 547 tests passed. Browser regression 3/3 passed. User asked to finish; no further launch attempts.
