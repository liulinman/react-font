# English World: whole-site style and interaction refinement

User scope: all desktop Web pages, including administration; primarily styles and interactions. Latest correction: exclude mobile/PWA/native redesign. User delegates implementation choices and wants the result. Preserve business workflows, data, teacher-review publication, independent reading scroll and mobile functionality.

## Design

Use neutral surfaces, dark readable text and one action accent. Compact hierarchy: page titles 24px, section titles 18px, interface body 14px, mobile inputs 16px, reading body 17–18px. Remove ornamental English kickers, marketing treatments, oversized score banners and competing gradients. Use 6–8px control/panel corners, restrained borders and shadows only for overlays. Retain dark-mode and accent preferences.

Keep existing navigation destinations to avoid disrupting learned workflows. Fix section names, child-menu overflow, selection and collapsed navigation. Return links use consistent labels and keyboard focus. Reduce page and panel padding without compromising touch targets. Tables retain horizontal scroll where required; page shell must not overflow horizontally. All controls need hover/focus/disabled states, and dialogs retain their existing confirmation/validation logic.

Reading lists become compact rows; article titles remain English. Results show a compact score summary, answer correctness and source evidence. Keep article/questions independently scrollable. Mobile uses single-column layout and tabs.

## Coverage and validation

Desktop: home, vocabulary table/cards, import, coverage, review, context exercises, IELTS core, memory map, notes, reading list/answer/results, statistics, settings and login.
Mobile/PWA/native: excluded. Preserve existing behavior; do not ship mobile-specific style changes.
Admin: login, navigation, users, announcements, schedules, history, generation/review drawer.

Inspect production-aligned source; preserve unrelated local native/mobile changes. Verify representative populated and empty states, page overflow at desktop/mobile sizes, reading scroll, teacher review and submission journeys. Build both frontends and validate deployed assets. Do not change backend data or APIs.
