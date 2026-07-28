# English World Mobile Usability Design

## Goal

Improve the existing `/englishWorldMobile` experience so that its primary
learning, word-library, statistics, and AI-tool workflows remain comfortable
and usable on phones from 320px wide upward. The desktop routes under
`/englishWorld/*` are outside this change.

## Current Problems

- Primary destinations are mixed into small top-bar actions, so switching
  between learning, the word library, statistics, and tools is hard to discover
  and hard to tap.
- Several screens and popups depend on `100vh`, which can place content under
  mobile browser chrome, the software keyboard, or the iPhone home indicator.
- Fixed actions use independent bottom offsets and can overlap content.
- Long words, tags, notes, and card actions can crowd or overflow narrow cards.
- Statistics and AI-tool screens use many local inline styles, producing
  inconsistent spacing and weak narrow-screen behavior.

## Interaction Design

### Primary Navigation

Add a persistent bottom tab bar with four destinations:

1. `今日学习` maps to the existing `review` view.
2. `词库` maps to the existing `list` view.
3. `统计` maps to the existing `stats` view.
4. `工具` maps to the existing `aiTool` view.

The tab bar is the only primary navigation on mobile. The top navigation keeps
the active page title and page-specific actions only. The word-library filter
remains available from the word-library header; destination links are removed
from the top-right action cluster.

Each tab item and primary icon action must expose at least a 44px touch target.
The active destination remains controlled by the existing `activeView` state,
so API behavior and route structure do not change.

### Viewport And Scrolling

The mobile shell occupies the dynamic viewport and owns one vertical scrolling
content region. It uses `100dvh` where supported, with a `100vh` fallback.
The content region reserves the bottom tab bar height plus
`env(safe-area-inset-bottom)` and never scrolls horizontally.

Fixed actions share the same bottom-spacing variables:

- The add-word floating action button sits above the tab bar and safe area.
- The Context Lab practice submit bar sits above the safe area.
- Practice content reserves enough bottom padding that the final question can
  scroll fully above the submit bar.

### Word Library

The search area stays easy to reach while the word list scrolls. Word titles
may wrap at arbitrary characters rather than expanding the card. Pronunciation,
edit, and delete actions remain visible and use touch-friendly dimensions.
Metadata, tags, and notes wrap within the card.

At very narrow widths, action groups may wrap or stack below the word title.
No card or page may increase `document.documentElement.scrollWidth` beyond the
viewport width.

### Popups And Forms

The filter drawer uses a responsive width capped for larger phones and a
dynamic-viewport height. Its actions stay reachable at the bottom while filter
fields scroll.

Add/edit, import, mark, and AI-result popups use a maximum dynamic-viewport
height and include bottom safe-area padding. Text inputs retain a 16px minimum
font size to avoid iOS focus zoom. Primary form actions remain at least 44px
high and are not hidden by the software keyboard or home indicator.

### Statistics And AI Tools

Move responsive layout rules from inline declarations into the mobile
stylesheet. Statistics summary tiles use a stable two-column grid and charts
fit the available width. AI result headers wrap cleanly; their main action
becomes full-width when the available row width is insufficient.

Existing data fetching, empty states, error messages, retries, and business
logic remain unchanged. This work adjusts presentation and navigation only.

## Component Boundaries

- `EnglishWorldMobile.tsx` owns the mobile shell, active destination, bottom
  navigation, word-library page actions, and statistics structure.
- `EnglishWorldMobile.css` owns viewport, safe-area, touch-target, card,
  popup, statistics, AI-tool, and Context Lab responsive rules.
- `WordAgentTabMobile.tsx` adds semantic class hooks for responsive result and
  popup layouts without changing its request flow.
- `MobileContextLabPage.tsx` keeps existing behavior and adopts the shared
  mobile layout hooks for fixed actions and safe-area spacing.
- A Cypress mobile regression spec validates real browser layout at 390x844
  and 320x568 viewports.

No new runtime dependency or backend contract is required.

## Error Handling

Existing `Toast`, empty-state, and retry behavior is preserved. Layout changes
must not suppress an API error or move its recovery action off-screen. Popup
forms keep their current validation and submission state; only their sizing and
action placement change.

## Testing Strategy

Implementation follows a test-first sequence:

1. Add a Cypress regression that expects the four-item bottom navigation,
   verifies destination switching, and checks that the page has no horizontal
   overflow at 390x844 and 320x568.
2. Add assertions for minimum navigation touch targets and long word-card
   containment.
3. Run the new spec before implementation and confirm it fails because the
   bottom navigation and responsive guarantees do not exist.
4. Implement the smallest layout and component changes that satisfy the spec.
5. Run the focused Cypress spec, existing mobile Vitest tests, the app build,
   and final desktop/mobile visual screenshots.

## Acceptance Criteria

- `/englishWorldMobile` shows persistent tabs for `今日学习`, `词库`, `统计`,
  and `工具`, with the selected tab matching the visible view.
- Primary mobile navigation and icon actions have at least 44px touch targets.
- At 320x568 and 390x844, no tested view has horizontal page overflow.
- Long word titles, notes, tags, result headers, and actions remain inside
  their containers.
- The add-word button, practice submit bar, popup actions, and final scrollable
  content are not covered by the bottom navigation or safe area.
- Filter and form popups fit the dynamic viewport and keep their actions
  reachable.
- Existing mobile unit tests pass, the new Cypress regression passes, and the
  English World app builds successfully.

## Non-Goals

- Redesigning desktop pages under `/englishWorld/*`.
- Changing APIs, data models, authentication, learning rules, or AI prompts.
- Adding new learning features or replacing the current visual identity.
