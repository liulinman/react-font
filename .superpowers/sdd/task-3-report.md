Status: DONE

Commits made:
- `feat(context-lab): wire practice record submit types`

Files changed:
- /Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/types/learning.ts
- /Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/server/learning.ts
- /Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.tsx
- /Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.test.tsx
- /Users/liulin/Desktop/font/english/react-font/.superpowers/sdd/task-3-report.md

Tests run with pass/fail output summary:
- FAIL: `pnpm --filter @font/english-world exec vitest run src/page/englishWorld/contextLab/ContextLabPage.test.tsx -t "elapsed time"` -> failed as expected before implementation because submit payload lacked `elapsedSeconds`
- PASS: `pnpm --filter @font/english-world exec vitest run src/page/englishWorld/contextLab/ContextLabPage.test.tsx -t "elapsed time|submits generated question answers|opens a succeeded history item and submits answers"` -> 3 passed
- PASS: `pnpm --filter @font/english-world exec vitest run src/page/englishWorld/contextLab/ContextLabPage.test.tsx` -> 24 passed
- PASS: `pnpm --filter @font/english-world build` -> `tsc -b && vite build` completed successfully

Self-review notes:
- Added the frontend attempt/delete type surface and request builders named in the brief without changing existing generate/start/result-review flows.
- Submit now sends `elapsedSeconds`, stores the submit summary, and refreshes history so latest practice stats appear on succeeded cards.
- Updated existing submit assertions to accept the new payload shape and added the required submit-refresh regression test.
- Extended two long-running integration tests to 10 seconds because the extra post-submit history refresh pushed them past the default 5 second vitest timeout.

Any concerns:
- Test and build output still include pre-existing warnings about stale `baseline-browser-mapping`, stale `caniuse-lite`, jsdom `getComputedStyle()` pseudo-element support, and Ant Design Upload `value` props in unrelated modal flows.
