---
name: English World Mobile PWA
description: iOS-native, content-first visual system for the complete English World experience on iPhone.
status: final
updated: 2026-08-17
sources:
  - ../../superpowers/specs/2026-07-28-english-world-mobile-usability-design.md
  - ../../superpowers/specs/2026-07-01-mobile-context-lab-sync-design.md
colors:
  surface-base: '#F2F2F7'
  surface-raised: '#FFFFFF'
  surface-sunken: '#E5E5EA'
  surface-base-dark: '#000000'
  surface-raised-dark: '#1C1C1E'
  surface-sunken-dark: '#2C2C2E'
  ink-primary: '#000000'
  ink-secondary: '#3C3C43'
  ink-tertiary: '#8E8E93'
  ink-primary-dark: '#FFFFFF'
  ink-secondary-dark: '#EBEBF5'
  ink-tertiary-dark: '#8E8E93'
  separator: '#C6C6C8'
  separator-dark: '#38383A'
  accent: '#007AFF'
  accent-dark: '#0A84FF'
  on-accent: '#FFFFFF'
  success: '#248A3D'
  success-dark: '#30D158'
  warning: '#B25000'
  warning-dark: '#FFD60A'
  destructive: '#D70015'
  destructive-dark: '#FF453A'
  on-destructive: '#FFFFFF'
  focus-ring: '#005FCC'
  focus-ring-dark: '#64D2FF'
  scrim: '#00000066'
typography:
  large-title:
    note: 'iOS Large Title; system San Francisco; Dynamic Type enabled'
  title:
    note: 'iOS Title 2; system San Francisco; Dynamic Type enabled'
  headline:
    note: 'iOS Headline; system San Francisco; semibold; Dynamic Type enabled'
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
    fontSize: 17px
    fontWeight: '400'
    lineHeight: '1.45'
  reading:
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.65'
  input:
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.4'
  callout:
    note: 'iOS Callout; system San Francisco; Dynamic Type enabled'
  footnote:
    note: 'iOS Footnote; system San Francisco; Dynamic Type enabled'
rounded:
  sm: 8px
  md: 12px
  lg: 16px
  xl: 20px
  full: 9999px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 20px
  '6': 24px
  '7': 32px
  '8': 40px
  page-gutter: 16px
  compact-gutter: 12px
  target-min: 44px
  tab-bar: 49px
components:
  mobile-app-shell: { background: '{colors.surface-base}', foreground: '{colors.ink-primary}', maxWidth: 430px }
  top-navigation-bar: { background: '{colors.surface-raised}', foreground: '{colors.ink-primary}', height: 44px, separator: '{colors.separator}' }
  bottom-tab-bar: { background: '{colors.surface-raised}', foreground: '{colors.ink-secondary}', active: '{colors.accent}', height: '{spacing.tab-bar}' }
  search-field: { background: '{colors.surface-sunken}', foreground: '{colors.ink-primary}', radius: '{rounded.md}', minHeight: '{spacing.target-min}' }
  word-row: { background: '{colors.surface-raised}', foreground: '{colors.ink-primary}', separator: '{colors.separator}', minHeight: 60px }
  word-detail-card: { background: '{colors.surface-raised}', foreground: '{colors.ink-primary}', radius: '{rounded.lg}' }
  pronunciation-button: { foreground: '{colors.accent}', minSize: '{spacing.target-min}' }
  primary-button: { background: '{colors.accent}', foreground: '{colors.on-accent}', radius: '{rounded.md}', minHeight: '{spacing.target-min}' }
  floating-action-button: { background: '{colors.accent}', foreground: '{colors.on-accent}', radius: '{rounded.full}', minSize: 52px }
  bottom-sheet: { background: '{colors.surface-raised}', foreground: '{colors.ink-primary}', radiusTop: '{rounded.xl}', scrim: '{colors.scrim}' }
  full-screen-form: { background: '{colors.surface-base}', foreground: '{colors.ink-primary}' }
  filter-chip: { background: '{colors.surface-sunken}', foreground: '{colors.ink-primary}', selectedBackground: '{colors.accent}', selectedForeground: '{colors.on-accent}', radius: '{rounded.full}' }
  status-banner: { background: '{colors.surface-raised}', foreground: '{colors.ink-secondary}', border: '{colors.separator}', radius: '{rounded.md}' }
  skeleton: { background: '{colors.surface-sunken}', radius: '{rounded.sm}' }
  empty-state: { foreground: '{colors.ink-secondary}', action: '{colors.accent}' }
  review-stage: { background: '{colors.surface-base}', foreground: '{colors.ink-primary}' }
  sticky-action-bar: { background: '{colors.surface-raised}', separator: '{colors.separator}' }
  tool-row: { background: '{colors.surface-raised}', foreground: '{colors.ink-primary}', separator: '{colors.separator}', minHeight: 56px }
  stat-card: { background: '{colors.surface-raised}', foreground: '{colors.ink-primary}', radius: '{rounded.lg}' }
  chart-panel: { background: '{colors.surface-raised}', foreground: '{colors.ink-primary}', grid: '{colors.separator}', radius: '{rounded.lg}' }
  context-task-card: { background: '{colors.surface-raised}', foreground: '{colors.ink-primary}', radius: '{rounded.lg}' }
  article-reader: { background: '{colors.surface-raised}', foreground: '{colors.ink-primary}', radius: '{rounded.lg}' }
  selection-action-sheet: { background: '{colors.surface-raised}', foreground: '{colors.accent}', radius: '{rounded.md}', scrim: '{colors.scrim}' }
  marked-word-strip: { background: '{colors.surface-sunken}', foreground: '{colors.ink-primary}', radius: '{rounded.md}' }
  question-card: { background: '{colors.surface-raised}', foreground: '{colors.ink-primary}', selectedBorder: '{colors.accent}', radius: '{rounded.lg}' }
  result-panel: { background: '{colors.surface-raised}', foreground: '{colors.ink-primary}', success: '{colors.success}', destructive: '{colors.destructive}', radius: '{rounded.lg}' }
  notification-row: { background: '{colors.surface-raised}', foreground: '{colors.ink-primary}', unread: '{colors.accent}', separator: '{colors.separator}' }
  badge: { background: '{colors.destructive}', foreground: '{colors.on-destructive}', radius: '{rounded.full}' }
  file-picker: { background: '{colors.surface-raised}', foreground: '{colors.accent}', border: '{colors.separator}', radius: '{rounded.md}' }
  update-prompt: { background: '{colors.surface-raised}', foreground: '{colors.ink-primary}', radius: '{rounded.lg}' }
  image-viewer: { background: '#000000', foreground: '#FFFFFF' }
---

## Brand & Style

English World Mobile PWA is a private learning tool that should feel at home on an iPhone: quiet, direct, and familiar. It inherits iOS navigation, typography, grouped-list structure, safe-area behavior, and restrained motion, while Ant Design Mobile supplies accessible Web components beneath that platform language. Words, article text, answers, and learning evidence carry the hierarchy.

The visual identity deliberately leaves the immersive starfield behind. No cosmic background, ornamental gradient, or decorative animation competes with reading and editing. Brand recognition comes from dependable blue actions, clear grouped surfaces, and a consistent learning rhythm rather than spectacle.

## Colors

The palette mirrors iOS semantic roles and always resolves as a light/dark pair.

- `{colors.surface-base}` / `{colors.surface-base-dark}` is the canvas; `{colors.surface-raised}` / `{colors.surface-raised-dark}` carries grouped lists, forms, cards, sheets, and fixed action bars.
- `{colors.ink-primary}` / `{colors.ink-primary-dark}` is for content and labels. Secondary and tertiary ink are limited to metadata, helper text, and disabled information.
- `{colors.accent}` / `{colors.accent-dark}` means navigation selection, focus, links, and primary action. It is never decoration.
- `{colors.success}`, `{colors.warning}`, and `{colors.destructive}` communicate meaning with text or icon support; color is never the only signal.
- `{colors.separator}` / `{colors.separator-dark}` creates shallow structure. Prefer a hairline divider or tonal change to boxed outlines.

Target WCAG 2.2 AA: normal text at least 4.5:1, large text at least 3:1, and controls/focus indicators at least 3:1 against adjacent surfaces. Verify primary ink on base/raised surfaces, white on accent/destructive buttons, and focus ring in both modes.

## Typography

The system San Francisco family is the UI voice. Native semantic roles are authoritative and Dynamic Type must be honored. `{typography.large-title}` appears only on root tab surfaces; `{typography.title}` names drill-down pages; `{typography.headline}` labels grouped sections and primary word forms.

Body copy uses `{typography.body}`. Long Context Lab passages use `{typography.reading}`. Every input, textarea, picker-like editable trigger, and content-editable surface uses `{typography.input}` or a larger role; 16px is the hard floor that prevents iOS focus zoom. Truncation is permitted only for nonessential metadata; words, meanings, answers, errors, and action labels wrap.

## Layout & Spacing

Use the 4px-derived scale in `spacing`, with `{spacing.page-gutter}` as the default horizontal inset and `{spacing.compact-gutter}` only at 320px when preserving a 44pt target requires it. The application is single-column from 320px through 430px. Landscape stays a mobile composition rather than turning into the desktop workspace.

`mobile-app-shell` owns one vertical scroll region per page, uses the dynamic viewport, and reserves top/bottom safe areas. Fixed bars and floating actions share these offsets; page content reserves their complete height. Dense statistics use a stable two-column summary grid only when both cells remain readable; articles, forms, word details, imports, and learning stages stay one column.

## Elevation & Depth

Depth is shallow and semantic. Raised grouped surfaces sit on the gray base canvas. Hairline separators divide rows. A soft shadow may distinguish a floating action button, selection action sheet, or sheet edge, but cards do not use elevation to compete for attention. Modal depth is capped at one layer.

## Shapes

Use `{rounded.sm}` for compact controls and skeletons, `{rounded.md}` for search, buttons, chips, and small sheets, `{rounded.lg}` for cards/content panels, and `{rounded.xl}` only on bottom-sheet top corners. `{rounded.full}` is reserved for circular icon controls, badges, and compact filter chips. Imagery follows its container radius unless opened in `image-viewer`.

## Components

| Component | Visual contract |
|---|---|
| `mobile-app-shell` | System base canvas, one content column, safe-area insets, and no horizontal overflow. |
| `top-navigation-bar` | 44pt raised bar, concise title, one leading navigation action and no more than two trailing page actions. |
| `bottom-tab-bar` | Four equal icon-and-label destinations; selected uses `{colors.accent}`, and the bottom safe area extends its background. |
| `search-field` | Full-width sunken field with leading icon, clear affordance, `{typography.input}`, and no decorative border. |
| `word-row` | Compact grouped-list row: word/meaning lead, metadata wraps, pronunciation and overflow actions retain 44pt boxes. |
| `word-detail-card` | Raised grouped section for pronunciation, definitions, tags, notes, images, and mastery; avoid nested cards. |
| `pronunciation-button` | Blue speaker control with a 44pt box, visible playing/loading state, and no text reflow. |
| `primary-button` | Full-width when sole next step; blue fill, white label, 44pt minimum height, pressed/disabled/busy states. |
| `floating-action-button` | 52pt circular add action above tab bar and safe area; minimal shadow. |
| `bottom-sheet` | Raised surface with top-only large corners, drag indicator, scrollable body, and safe-area-padded actions. |
| `full-screen-form` | Grouped fields, sticky or trailing action, field-local validation, and keyboard-safe spacing. |
| `filter-chip` | Compact pill; selection uses accent plus text/check cue. Chips wrap and never force page overflow. |
| `status-banner` | Inline message for offline, stale, failed, permission, and update states; text plus one recovery action. |
| `skeleton` | Matches final geometry exactly. Neutral pulse stops under Reduce Motion. |
| `empty-state` | Quiet message with one concrete next action; no illustration required. |
| `review-stage` | Full-height single-question canvas, restrained progress at top, readable prompt, no competing navigation. |
| `sticky-action-bar` | Raised, hairline-separated bar above keyboard/home indicator; never obscures final content. |
| `tool-row` | Grouped-list row with familiar glyph, title, optional one-line status, and chevron; no tile mosaic. |
| `stat-card` | Tonal summary cell with large value, short label, and optional trend; meaning never depends on color alone. |
| `chart-panel` | Full-width surface with readable axes/legend, no clipped labels, and a text summary. |
| `context-task-card` | Task source, text/icon status, latest score, and compact overflow menu. |
| `article-reader` | Single-column `{typography.reading}`, generous paragraph spacing, selectable text, visible marked highlights. |
| `selection-action-sheet` | Anchored when stable, otherwise `bottom-sheet`; actions are Mark, Translate, and Add to library. |
| `marked-word-strip` | Compact collection with count and `预览并导入`; visible without dominating reading. |
| `question-card` | One question/options; selected/correct/incorrect combine border, icon, and text; explanation below. |
| `result-panel` | Score, wrong count, weak words, explanations, and next actions on one raised surface. |
| `notification-row` | Timestamped title/summary; unread uses a blue dot plus semantic assistive label. |
| `badge` | Notification count only; never for streaks, mastery pressure, or decoration. |
| `file-picker` | Format/size guidance, selected filename, progress, and explicit file-error text. |
| `update-prompt` | Nonblocking notice shown only at a safe pause, with `稍后` and `立即更新`. |
| `image-viewer` | Black edge-to-edge surface with native-feeling Close; pinch zoom and pan enabled. |

## Do's and Don'ts

| Do | Don't |
|---|---|
| Use iOS semantic hierarchy, system type, grouped lists, and familiar navigation. | Recreate the desktop sidebar, wide tables, split panes, or nested modals. |
| Keep editable controls at 16px+ and targets at 44pt+. | Disable intentional pinch zoom globally or repair undersized UI with viewport restrictions. |
| Let text wrap and pages scroll vertically. | Shrink labels, clip word content, or permit horizontal page scrolling. |
| Use one blue accent for active navigation and primary action. | Restore starfields, gradients, glass layers, or attention-seeking animation. |
| Pair semantic color with text, icon, or shape. | Encode status, correctness, or mastery through color alone. |
| Preserve input/drafts after errors and show one recovery action. | Auto-replay delete/overwrite or force refresh during active work. |
| Preserve native selection, edge-back, keyboard, safe-area, and reduced-motion behavior. | Capture gestures that conflict with iOS or hide actions behind keyboard/home indicator. |
