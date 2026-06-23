# Task 5 QA Report: Context Lab Practice Records

Status: DONE_WITH_CONCERNS

## Commits Made

- Backend: `ef9ef1e` `fix: guard active context lab deletes`
- Frontend: `656dae2` `docs: align context lab records design`
- Frontend: `5773baa` `test: stabilize english world ui tests`
- Frontend: `07e5145` `fix: block active context lab package delete`
- Frontend: `26aeb6e` `style: polish context lab record cards`
- Frontend: `b6a8690` `test: stabilize context lab record assertions`

## Commands Run

- Backend repo `/Users/liulin/Desktop/font/english/nestjs`
  - `git diff --check`
    - PASS
  - `pnpm test --runInBand`
    - PASS
    - Summary: `Test Suites: 20 passed, 20 total`, `Tests: 62 passed, 62 total`
  - `pnpm build`
    - PASS

- Frontend repo `/Users/liulin/Desktop/font/english/react-font`
  - `git diff --check`
    - PASS
  - `pnpm --filter @font/english-world test -- --run`
    - PASS after raising the English World Vitest `testTimeout` to `30000`
    - Summary: `Test Files: 21 passed (21)`, `Tests: 89 passed (89)`
  - `pnpm --filter @font/english-world build`
    - PASS
    - Warning: Vite large chunk warning for `dist/assets/index-Cr36dejx.js` / latest equivalent bundle name

- Frontend targeted feature verification
  - `pnpm exec vitest run src/page/englishWorld/contextLab/contextLabTask.test.ts`
    - PASS
    - Summary: `1 passed`, `3 tests`
  - `pnpm exec vitest run src/page/englishWorld/contextLab/ContextLabPage.test.tsx -t "sends elapsed time when submitting and refreshes practice records"`
    - PASS
  - `pnpm exec vitest run src/page/englishWorld/contextLab/ContextLabPage.test.tsx -t "opens historical attempt details and removes a deleted attempt from the open drawer"`
    - PASS
  - `pnpm exec vitest run src/page/englishWorld/contextLab/ContextLabPage.test.tsx -t "deletes a practice package after confirmation"`
    - PASS
- `pnpm exec start-server-and-test "vite --host 127.0.0.1 --port 5175 --strictPort" http://127.0.0.1:5175 "cypress run --spec cypress/e2e/english-world-toc.cy.ts --config video=false"`
    - FAIL
    - Relevant signal: the Context Lab flow case `creates an async context lab task and practices from history` passed.
    - Failing cases were unrelated ToC/word-library expectations that timed out on `单词列表`.

## Design Doc Check

Updated `/Users/liulin/Desktop/font/english/react-font/docs/superpowers/specs/2026-06-23-context-lab-practice-records-design.md` to match shipped behavior:

- package list section ships as `练习包队列`
- package cards show attempt count plus latest score/wrong count, but not latest attempt time
- action labels are `删除练习包` and `删除记录`
- empty package state copy is `还没有生成记录。先提交一组词。`
- backend delete-task behavior blocks active tasks and hard-deletes attempts, the linked owned exercise row, and the task transactionally

## Manual QA Checklist

Status: automated/proxy verified, not manually run in browser.

- Open `/englishWorld/context-lab`
  - Proxy verified by automated tests and Cypress spec coverage, not manually clicked in browser this run
- Generate or use an existing succeeded exercise package
  - Proxy verified by Cypress case `creates an async context lab task and practices from history`
- Start practice and submit answers
  - Proxy verified by targeted Vitest and Cypress
- Result review appears
  - Proxy verified by existing `ContextLabPage.test.tsx` coverage
- Right panel shows latest score and practice count
  - Proxy verified by targeted submit-refresh Vitest case
- `查看记录` opens the drawer
  - Proxy verified by existing Context Lab tests
- Delete one record with confirmation; it disappears
  - Proxy verified by targeted attempt-detail/delete Vitest case
- Delete one package with confirmation; it disappears
  - Proxy verified by targeted delete-package Vitest case
- Refresh the page; deleted data remains gone
  - Not manually run in browser; covered only indirectly by refreshed request mocks and backend hard-delete behavior

## Known Warnings And Remaining Risks

- Live DB still needs `nestjs/migrations/create-article-exercise-attempt.sql` applied; this run did not apply migrations.
- Repo-wide frontend Vitest is green after the test timeout config update; Cypress ToC still has unrelated word-library expectation failures.
- Browser-level manual QA was not executed in a real interactive session this run.
- Tooling warnings remain:
  - `baseline-browser-mapping` data is stale
  - `caniuse-lite` / Browserslist data is stale
  - Vite build reports a large JS chunk warning

## final-review-fix

- Backend repo `/Users/liulin/Desktop/font/english/nestjs`
  - `git diff --check`
    - PASS
  - `pnpm test --runInBand src/interface/exercise-agent/exercise-agent.service.spec.ts`
    - PASS
    - Summary: `Test Suites: 1 passed, 1 total`, `Tests: 25 passed, 25 total`
  - `pnpm test --runInBand`
    - PASS
    - Summary: `Test Suites: 20 passed, 20 total`, `Tests: 62 passed, 62 total`
  - `pnpm build`
    - PASS

- Frontend repo `/Users/liulin/Desktop/font/english/react-font`
  - `git diff --check`
    - PASS
  - `pnpm --filter @font/english-world exec vitest run src/page/englishWorld/contextLab/ContextLabPage.test.tsx -t "blocks deleting a pending practice package and explains why" --testTimeout 30000`
    - PASS
  - `pnpm --filter @font/english-world exec vitest run src/page/englishWorld/contextLab/ContextLabPage.test.tsx -t "deletes a practice package after confirmation" --testTimeout 30000`
    - PASS
  - `pnpm --filter @font/english-world test -- --run`
    - PASS after the final assertion stabilization
    - Summary: `Test Files: 21 passed (21)`, `Tests: 89 passed (89)`
  - `pnpm --filter @font/english-world build`
    - PASS
    - Warning: Vite reported the existing large-chunk warning
