# English World UI Simplification Design

Date: 2026-07-15

## Goal

Make the authenticated English World experience feel like one focused learning product instead of a collection of unrelated admin, AI, and dashboard pages. Exercise-question rendering and backend behavior stay unchanged.

## Information Architecture

The persistent navigation has four primary destinations:

- `今天` opens the existing learning cockpit.
- `词库` opens word management. AI lookup and Memory Map remain available as contextual actions from the word-library page and from existing in-page links.
- `学习` opens today's review flow. Context Lab remains reachable from the daily route and existing learning actions.
- `数据` opens learning statistics.

System settings moves into the user menu because it is an account-level utility, not a daily learning destination. Existing route paths remain valid so bookmarks and internal links do not break.

## Shared Page Structure

Authenticated pages use the existing `EnglishWorldLayout` shell. A new `EnglishWorldPageHeader` component provides a consistent eyebrow, title, description, and optional action area. Word Library, Learning Statistics, and System Settings adopt this header. Implementation-oriented copy such as `字段保留版` is removed.

The desktop shell keeps a dark left rail. At widths of 900px or less, it becomes a compact fixed top bar. At 560px or less, navigation labels collapse visually to icons while retaining accessible names and titles. The main route therefore remains usable on phones without requiring the separate mobile route.

## Page Changes

- **Today:** show one primary Daily Coach route and one supporting Memory Map summary. Remove the duplicate Context Lab and common-tools cards. Replace English stage labels with concise Chinese labels.
- **Word Library:** add a page header with contextual AI lookup and Memory Map actions, remove internal implementation copy, and provide a useful Chinese empty state.
- **Statistics:** add a page header and show a deliberate empty state instead of two empty charts when the library has no data.
- **Settings:** render inside the shared shell so content no longer sits underneath the sidebar; move inline page-level layout styles into English World CSS.
- **AI lookup and Memory Map:** keep their behavior, but inherit the responsive shell and shared spacing rules.

## Visual Rules

- One primary action per page header.
- Use Chinese for product-navigation labels; English remains only for learning content or small optional supporting copy.
- Use the existing blue accent, dark navigation rail, 8–12px radii, light borders, and restrained shadows.
- Avoid nested dashboard cards when a plain section or empty state communicates the same information.

## Error and Empty States

Existing request failures remain non-blocking. Statistics with zero words renders a clear empty state and a route to the word library. The word table uses a Chinese empty state with an add-word action. No new API requests or backend error contracts are introduced.

## Testing

- Header tests verify the four primary destinations, settings in the user menu, removed internal copy, and route navigation.
- Cockpit tests verify duplicate utility/context cards are absent while the main route and Memory Map remain.
- Statistics tests verify the zero-data empty state and non-zero chart state.
- Settings tests verify use of the shared shell and page header.
- Existing English World tests, TypeScript build, and browser checks at desktop and 390px widths verify regression safety.

## Scope Boundaries

- Do not change exercise-question rendering, answer submission, backend APIs, authentication, or database contracts.
- Preserve the current uncommitted Context Lab selection-menu CSS and EditAddModal AI-completion work.
- Do not remove existing route paths, including `/englishWorldMobile`.
