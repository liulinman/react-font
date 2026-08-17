# Task 6 report — mobile login surface and deep-link recovery

## Status

Complete. The login route now selects a standalone Ant Design Mobile surface for
`/mobile` deep links or standalone display mode, while keeping the existing
desktop hero/card flow intact.

## RED

- Added `MobileLoginForm.test.tsx` before production changes.
- Command: `pnpm --filter @font/english-world exec vitest run src/page/login/MobileLoginForm.test.tsx`
- Observed failure: a `/mobile/tools/context-lab` source still rendered the
  desktop card; there was no `main` named `English World 移动端登录` and no
  labelled mobile username/password controls. The initial run also exposed the
  existing desktop Ant Design test dependency on `matchMedia`; the test then
  supplied that browser API so the feature failure, rather than test setup,
  was asserted.

## GREEN

- Added pure `isMobileLoginSurface` and `resolveAfterLoginPath` helpers in
  `Login.tsx`. The latter preserves saved `pathname + search + hash`, defaults
  to `/mobile` for mobile/standalone sessions, and retains desktop's
  `/englishWorld/recite` default.
- Added a one-shot navigation guard shared by the authenticated effect and
  form submission, preventing competing replace navigations.
- Added `MobileLoginForm.tsx` with Ant Design Mobile inputs/buttons, explicit
  labels, form validation, retained values on errors, duplicate-submit guard,
  registration-to-login feedback, and safe-area/44px/16px CSS rules.
- Re-ran the RED tests: both pass, including the complete mobile destination
  `/mobile/tools/context-lab?task=42#answer` with `{ replace: true }`.

## Verification

```text
pnpm --filter @font/english-world exec vitest run src/page/login/MobileLoginForm.test.tsx src/page/login/Login.test.tsx src/router/router.test.tsx
3 files passed, 9 tests passed

pnpm --filter @font/english-world exec tsc -b --pretty false
passed

pnpm --filter @font/english-world build
passed (tsc -b + vite build; Login remains a separately emitted lazy chunk)

pnpm --filter @font/english-world exec eslint src/page/login/Login.tsx src/page/login/MobileLoginForm.tsx src/page/login/Login.test.tsx src/page/login/MobileLoginForm.test.tsx
passed with two non-blocking React Fast Refresh warnings for the exported pure helpers in Login.tsx; no errors
```

## Files

- `apps/english-world/src/page/login/Login.tsx`
- `apps/english-world/src/page/login/Login.css`
- `apps/english-world/src/page/login/MobileLoginForm.tsx`
- `apps/english-world/src/page/login/MobileLoginForm.test.tsx`
- `apps/english-world/src/page/login/Login.test.tsx`

## Self-review and follow-up

- Confirmed `matchMedia` is feature-detected and not subscribed to.
- Confirmed mobile branch renders neither desktop hero text nor desktop Card/Tabs.
- Confirmed no route or AuthContext/API changes and the router keeps Login lazy.
- Build emitted the usual Browserslist-age and chunk-size warnings only; they
  are unrelated to this task. No desktop screenshot harness is configured, so
  the existing desktop login DOM regression tests were used for the focused
  visual regression check.
