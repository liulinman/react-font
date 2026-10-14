# Web UI refinement — 2026-10-13

Scope: desktop learning Web and administration. User explicitly excluded mobile; mobile-specific edits were reverted and are absent from release source. Shared reading labels are reused by existing mobile pages, but desktop reading styles are scoped to the desktop main container. Business APIs and storage were not changed.

Implemented:
- Neutral application surfaces, consistent title sizes, spacing, corners, table density and visible keyboard focus.
- Light desktop/admin navigation, corrected selected-group contrast, constrained submenu width, no sidebar horizontal overflow; collapsed state remains persistent.
- Accurate context labels for reading/review/context/memory/AI-word pages; consistent reading-list return links.
- Compact reading rows and score summary; preserved independent article/question scrolling and teacher review requirement.
- Removed ornamental English captions, static orbit illustration, large login background decoration and metaphorical login labels.
- Admin forms/tables/preview drawers use the same restrained visual language.

Verification:
- 22 browser checks passed: 13 desktop routes, populated reading light/dark states, login, collapse persistence, admin sections, plus 5 mobile regression checks.
- Independent reading scroll: 3 passed. Full teacher-review/publish/two-user submission and result flow: 1 passed.
- Related component/navigation tests: 14 passed. User and admin production builds passed.
- Browser page checks use local fixture accounts. Reading populated-list visual check uses fixture API data; submission flow uses the local MySQL API and only replaces the external AI provider.
- Screenshots inspected for home, words, context practice, reading list, dark mode, login and admin. Route checks are not a claim of exhaustive testing of every business/data combination.

Deployment:
- Production source hashes matched the pre-change snapshot before release.
- Frontend-only image: `english-world-frontend:web-ui-20261013`.
- Rollback: `english-world-frontend:before-web-ui-20261013`.
- Release source, built assets and prior source archive: `/opt/english-world/releases/web-ui-20261013`.
- Production-aligned build tree is `/tmp/english-reading-release/react-font`; unrelated local native/mobile development was not shipped. Backend and database unchanged.

## Second pass: distinguish page purpose (2026-10-13)

User approved warmer, less uniform Web presentation after the neutral first pass.
Desktop shell now has warm gray workspace, ink text and a tinted navigation rail.
The homepage prioritizes the first action and quietens the supporting metrics;
reading lists/passages and notes use warm paper surfaces and editorial typography.
Question controls remain a separate surface; correct/incorrect result labels regain
semantic colors, and following an evidence anchor highlights its source paragraph.
Administration retains a cooler, compact table workspace. Existing accent choices
and dark appearance remain supported. Mobile selectors and business logic unchanged.

Changes: `apps/english-world/src/theme/workbench.css`, `apps/admin/src/styles.css`.
Both files mirrored precisely between local source and production-aligned build tree.
Prechange SHA-256 hashes matched production source before packaging.

Fresh validation:
- Web and admin production builds passed (existing chunk-size warnings).
- Cypress: 26/26 passed (site UI 22, independent scrolling 3, shared reading flow 1).
- Local backend fixture startup integration tests: 16/16 passed.
- Inspected screenshots: homepage, populated reading list, dark reading list,
  independent reading panes, admin reading page.
- Logs: `/tmp/depth-browser.log`, `/tmp/depth-build.log`, `/tmp/depth-admin-build.log`.

Release target: `english-world-frontend:web-depth-20261013`.
Rollback image: `english-world-frontend:before-web-depth-20261013`.
Release directory: `/opt/english-world/releases/web-depth-20261013`.
Only frontend service is replaced; backend and database remain running.

Deployment completed. Production `/englishWorld`, `/englishWorld/reading-practices`,
`/login`, and `/admin/` returned HTTP 200. Referenced JS/CSS assets returned 200;
published CSS contains the new desktop paper tokens and admin rail color.
Local test backend and Vite servers stopped after verification.
