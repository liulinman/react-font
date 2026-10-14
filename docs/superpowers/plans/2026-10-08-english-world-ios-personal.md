# English World Personal iOS Implementation Plan

**Goal:** Deliver a locally bundled iOS app that connects to the existing server, with an Xcode project and repeatable personal-device installation.

**Architecture:** Capacitor 8 and Swift Package Manager wrap the existing React application. Native HTTP handles the existing HttpOnly cookie session; native-only integration stays outside browser behavior. iOS builds have a dedicated output directory and no PWA registration.

**Spec:** ../specs/2026-10-08-english-world-ios-personal-design.md

**Execution:** Implement in this session. User explicitly delegated decisions and waived intermediate reviews. Preserve all pre-existing uncommitted changes; no server deployment or production-data mutation is needed.

## Constraints and review focus

- Personal Apple account, no App Store submission, 7-day development provisioning.
- Server: http://124.223.157.129/api; never print credentials or cookies.
- Native startup must reach mobile login; browser routing must remain unchanged.
- HttpOnly session creation, persistence and removal need native verification, not only mocks.
- Native uploads must preserve multipart boundaries; errors must not leak passwords.
- PWA updates must not compete with bundled native assets.
- Unimplemented mobile pages must not be reported as finished.
- Physical-device signing needs the user's Apple account and reachable device.

## Task 1 — Native build and runtime boundary

- [x] Add Capacitor 8 core/ios/cli, ios config, dedicated Vite mode and scripts.
- [x] Add failing startup/PWA regression cases, then implement native-only mobile redirect and registration suppression.
- [x] Generate the SPM iOS project, restrict HTTP access to the configured service where the OS permits it, reuse existing app artwork.
- [x] Build frontend and compile the unsigned iOS simulator target.

## Task 2 — Existing-session network integration

- [x] Inspect Capacitor native HTTP and cookie behavior before choosing configuration.
- [x] Exercise a local fixture service with HttpOnly/SameSite=Strict cookies through the actual native transport: login, current user, relaunch, logout, failure and multipart upload.
- [x] Verify safe API/resource URL resolution, retaining browser /api behavior.
- [x] Gate unsupported event streams or use existing polling fallback; never claim an untested stream works.
- [x] Run focused tests and the application suite; record any existing failures separately.

## Task 3 — Usable build and handoff

- [x] Run the app in an iOS simulator if runtime installation succeeds; capture the login screen and check mobile viewport.
- [x] Add installation instructions and a convenient command for build/sync/open, preserving Bundle ID across reinstalls.
- [x] Review the final diff for credentials, broad network permissions, login regressions and changes to unrelated files.
- [x] Record exact build/test evidence and remaining device-only steps; open the Xcode project for signing.

## Evidence

Baseline router/PWA regression command: `pnpm --filter @font/english-world exec vitest run src/router/router.test.tsx src/page/englishWorldMobile/pwa/PwaUpdateContext.test.tsx`.

- Baseline router/PWA: 11 tests passed. New native entry/PWA cases failed before implementation, then passed.
- Full application suite after fixes: 87 files / 529 tests passed (`vitest run --maxWorkers=2`).
- Browser build and `verify:pwa-build` passed. iOS-specific frontend build and `cap sync ios` passed.
- Cypress iPhone-width login → account → app info → account → logout passed. Found and fixed active-tab reselect failing to return from a nested page; added a failing regression first.
- Independent read-only review found auth expiry being swallowed by native polling and native cookie headers crossing the Capacitor bridge. Fixed auth recheck with RED→GREEN tests. Added a native response-header redactor and a custom bridge controller; standalone Swift redaction test failed before filtering and passed after. Actual native bridge tests passed, including case-insensitive Set-Cookie redaction.
- iOS native sources and hosted XCTest sources passed Swift type checking against Xcode 26.1 SDKs.
- Scoped lint has no errors in new native files, router or PWA code. NotificationContext has two pre-existing lint errors (`connect` self-reference and synchronous effect state updates); reproduced against HEAD via eslint stdin. Preserve unrelated user changes.
- A router assertion briefly failed because it held a DOM element across a redirect/render. It now waits for settled navigation and queries the current DOM in the assertion; full suite passed.
- Installed iOS 26.1 Simulator (23B86) and created an iPhone 13 simulator. Native XCTest: 2 tests passed, covering actual patched XHR login/authentication, HttpOnly protection, native header redaction, multipart upload and logout. Script also terminated/relaunched the app and verified persistent authentication.
- Native simulator production build and unsigned device build both passed. Reinstalled the production bundle pointing to the supplied server; captured `.ios-build/native-login.png` and visually checked the login screen. No production account credentials were used.
- Native test target initially failed to build due to missing PRODUCT_NAME; fixed both test configurations and made Foundation.framework use SDKROOT. Full native test command then passed.
- Final native test log: `.ios-native-tests.log`; production simulator build: `.ios-production-build.log`; unsigned device build: `.ios-device-build.log`. Temporary fixture ATS exception and bundle were restored to production configuration after tests.
- Physical iPhone 13 is paired but unavailable. Device signing remains a user-device step.
