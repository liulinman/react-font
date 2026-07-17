# English World Focus Studio Desktop Design

Date: 2026-07-17

## Goal

Turn the authenticated English World desktop experience into one calm, coherent learning workspace. Keep all existing routes, features, APIs, authentication, and data contracts unchanged while improving layout, information hierarchy, visual consistency, feedback, and motion.

The design follows Gemini's recommended **Focus Studio** direction: one obvious next action, restrained surfaces, a stable desktop frame, and short motion that supports orientation without distracting from study.

## Product Principles

- Each page has one visually dominant action.
- The daily route explains what to do next before presenting secondary data.
- Spacing and typography establish hierarchy; nested borders do not.
- Mistakes are framed as the next learning opportunity rather than failure.
- Motion is brief, reversible, and disabled by `prefers-reduced-motion`.
- Theme variants reuse semantic tokens instead of page-specific hardcoded colors.

## Desktop Application Frame

`EnglishWorldLayout` remains the owner of the persisted sidebar state and becomes the single desktop frame for authenticated pages.

- Expanded sidebar: `228px`.
- Collapsed sidebar: `72px`.
- Main workspace: fills the remaining viewport width.
- Context bar: `64px` high, sticky at the top of the workspace, with the current primary section and local date. It does not add a new navigation system.
- Content container: centered with a maximum width of `1180px`, `32px` horizontal padding, `32px` top padding, and `56px` bottom padding.
- Standard content grid: 12 columns with a `24px` gutter.
- The sidebar continues to expose only the four primary destinations: Today, Words, Learn, and Data. AI lookup, Context Lab, Memory Map, settings, and theme controls retain their existing contextual entry points.

The frame receives the current `activeKey`, resolves a user-facing section label through a pure helper, and renders `EnglishWorldContextBar`. Routes and navigation callbacks do not change.

## Visual System

### Semantic tokens

The existing theme variables remain the source of truth and gain a small set of layout tokens:

- `--ew-page-bg`: quiet neutral application background.
- `--ew-surface`: primary content surface.
- `--ew-surface-muted`: secondary or input surface.
- `--ew-text`: primary copy.
- `--ew-text-secondary`: descriptions and metadata.
- `--ew-border`: low-contrast separation.
- `--ew-accent`: primary actions and active navigation.
- `--ew-accent-soft`: selected and informational surfaces.
- `--ew-success`, `--ew-warning`, and `--ew-danger`: semantic feedback.
- `--ew-shadow-soft` and `--ew-shadow-lifted`: two deliberate elevation levels.
- `--ew-radius-sm`, `--ew-radius-md`, and `--ew-radius-lg`: `8px`, `12px`, and `18px`.

Dark, green-accent, and purple-accent themes override these semantic variables. Components must not introduce a competing page palette.

### Typography and density

- Page titles: `30–32px`, weight `700`, slightly tightened tracking.
- Section titles: `18–24px`, weight `650–700`.
- Body copy: `14px` with `1.6` line height.
- Metadata: `12px` using secondary text color.
- Cards use `20–28px` internal padding depending on importance.
- Primary surfaces use an `18px` radius; controls remain `8–10px` to avoid a toy-like appearance.

## Today Page

`LearningCockpitPage` becomes a focused two-column route board after its page introduction:

- Main column: the daily coach panel.
- Supporting rail: a compact learning snapshot followed by the existing Memory Map summary.
- Desktop ratio: approximately `minmax(0, 1.55fr) minmax(280px, 0.7fr)` with a `24px` gap.

The current full-width metric strip moves into a dedicated `LearningSnapshot` component in the support rail. It consumes the already loaded `DailyCoachSummary`; no request is added.

`CoachSummaryPanel` keeps the same callbacks and action data. Its hierarchy changes to:

1. Today's focus, title, explanation, and estimated time.
2. Review-stability progress.
3. Weak-word chips.
4. A separated action list with the first action as the dominant button and later actions visually quieter.

Internal action rows use dividers and whitespace rather than individually boxed cards. The unavailable state preserves all recovery actions and remains non-blocking.

## Word Library and Supporting Pages

The word library keeps all current filters, table/card switcher, pagination, selection, quick mastery editing, references, empty states, and modals.

- `EnglishWorldPageHeader` uses the same width, title rhythm, and action alignment as the Today page.
- Filter and results surfaces use one soft elevation each instead of stacked shadows.
- Table and card hover states move by at most `1px` and never change layout.
- AI lookup, Memory Map, Context Lab, settings, and statistics inherit the frame, container, page entrance, surfaces, and focus treatment.

No word-library query behavior, optimistic update behavior, or pagination contract changes.

## Review Studio

The review route remains a keyboard-first practice flow with the existing query contract and submission behavior.

- The practice shell uses one quiet surface on the page background rather than alternating strong blue and white blocks.
- The question canvas is visually dominant; the progress rail is supporting information.
- The answer dock is integrated into the question canvas with a subtle top divider.
- A question change uses `opacity` plus at most `4px` vertical movement over `160ms`.
- Input focus uses the active theme accent and a soft focus ring.
- Progress dots retain completed/current semantics and gain smooth color/scale transitions.

The result state shows incorrect items first as it does now, but uses calm copy and soft semantic backgrounds. “Review wrong words” is primary when incorrect items exist; returning to Today's route is secondary. Existing retry and answer-preservation behavior remains unchanged.

## Statistics and Theme Integration

`EnglishStats` keeps the current summary, empty state, and chart data. ECharts colors are derived from the active Ant Design theme tokens rather than fixed Ant Design blue values. This keeps charts coherent when the user selects green, purple, or dark themes.

No new chart, metric, or backend request is introduced.

## Motion

- Route/page entrance: `220ms`, opacity plus `8px` upward settling.
- Card hover: `160ms`, shadow and at most `1px` vertical lift.
- Sidebar width and main offset: existing persisted behavior, `220ms`.
- Progress changes: `300ms` without bounce.
- No looping animation, parallax, or decorative particle effect is added to authenticated pages.

Under `@media (prefers-reduced-motion: reduce)`, all new animations and transitions are disabled and transforms are removed.

## Accessibility

- Sidebar labels remain in the DOM in collapsed mode, with accessible names and `title` hints.
- Context-bar and page headings use landmarks in logical order.
- Interactive elements retain visible `:focus-visible` treatment.
- Color is never the only representation of current, completed, warning, or error states.
- Contrast must remain readable in light and dark themes.

## Error, Empty, and Loading States

- Existing request failures remain recoverable and never block navigation.
- The daily coach unavailable state keeps retry and manual route actions.
- Word-library and statistics empty states keep their current action paths.
- Review submission failure keeps entered answers visible.
- Layout polish applies to loading, error, and empty states; no fake metrics or placeholder data are introduced.

## Files and Responsibilities

- `layout/EnglishWorldLayout.tsx`: persisted frame state and context-bar composition.
- `layout/EnglishWorldContextBar.tsx`: pure desktop section/date presentation.
- `layout/englishWorldContext.ts`: active-key label mapping and local date formatter.
- `cockpit/LearningCockpitPage.tsx`: daily route composition and data loading.
- `cockpit/LearningSnapshot.tsx`: already-loaded daily metrics in the support rail.
- `dailyCoach/CoachSummaryPanel.tsx`: daily focus and actions.
- `recite/RecitePage.tsx`: practice/result semantics and motion hooks.
- `component/EnglishStats.tsx`: theme-aware chart options.
- `EnglishWorld.css` and `theme/theme.css`: frame, surfaces, responsive behavior, themes, and motion.

## Testing and Acceptance

- Pure mapping tests cover primary and contextual route labels plus deterministic date formatting.
- Layout tests verify the context bar, current section label, and existing sidebar persistence.
- Cockpit tests verify that metrics move into the support rail without extra requests and the primary route remains actionable.
- Review tests verify primary/secondary result actions and the question motion wrapper without changing keyboard behavior.
- Statistics tests verify chart options consume active theme tokens and the existing empty state remains intact.
- CSS contract tests verify container width, layout grid, semantic elevation, motion duration, and reduced-motion overrides.
- All existing 163 unit/component tests pass.
- The English World production build succeeds.
- Focused lint succeeds for modified TypeScript and test files.
- Browser screenshots at `1440×900` show no overlap, clipping, or horizontal scroll with the sidebar expanded and collapsed.
- Gemini's final review must return `PASS`; any `FAIL` item is corrected and resubmitted until the verdict is `PASS`.

## Out of Scope

- Mobile route redesign.
- Authentication, backend, database, or API changes.
- New learning metrics or generated content.
- Removing or renaming existing routes.
- Replacing Ant Design or ECharts.
- Changing Context Lab task, webhook, SSE, PDF, selection, or import behavior.
