# Context Lab IDE Workspace Design

## Goal

Turn the desktop Context Lab into the IDE-style workspace recommended by
Gemini: a compact generator sidebar, a full-width practice-pack workspace, and
the established Modal for the reading and question experience.

## Scope

- Replace the large page hero with a 48-56px utility header.
- Replace the generator/history two-card dashboard with a 320px generator
  sidebar and a flexible practice-pack workspace.
- Keep the generator visible instead of hiding it behind a workspace switch.
- Keep the existing practice Modal as the exercise surface, including its
  fullscreen toggle. The IDE workspace handles task creation, search, status,
  and launch actions only; it does not duplicate the practice or active-task
  status inside the page.
- Keep the source preview Modal, attempt Drawer, generation APIs, submission
  APIs, bulk import preview, and micro-context behavior.
- Preserve the separate mobile implementation.

## Layout

### Utility header

- One row, 52px high.
- Left: page title and optional active task identifier.
- Right: refresh and PDF-template actions.
- No marketing-style description or decorative tag.

### Sidebar

- Desktop width: 320px.
- Contains the existing source, model, IELTS band, count,
  proficiency, and custom-word controls.
- Remains visible while the learner searches or selects practice packs.

### Practice-pack workspace

- Flexible width with a minimum usable width of 0.
- Contains search, source filters, refresh status, and the compact task list.
- Pending and failed tasks expose their state directly in the list.
- Completed tasks expose one launch action for the existing practice Modal.
- Does not render a second selected-task panel or duplicate launch/PDF actions.
- The question submit action remains sticky at the bottom of the Modal's
  question pane.

### Practice-pack row

- Maximum visual height around 88px before metrics wrap.
- A 3px status rail carries state color; no tinted full-card status background.
- Words render as a single muted text line separated by middle dots.
- The entire completed row opens the practice.
- Only `开始练习` remains as a visible command.
- Attempt history, PDF download, and delete move into an ellipsis menu.

## Responsive behavior

- `>= 1280px`: 320px generator sidebar and flexible practice-pack workspace.
- `992px-1279px`: 288px generator sidebar and flexible practice-pack workspace.
- `< 992px`: stack the sidebar above the workspace; the existing mobile route
  remains responsible for phone navigation.

## Visual language

- Neutral white and cool-gray surfaces.
- Blue is reserved for the primary action and selected navigation.
- Green, amber, red, and gray appear only in compact status indicators.
- Radius is 8px or smaller; shadows are removed from the work surface.
- Spacing uses 8px and 12px increments for a dense operational UI.

## Accessibility and behavior

- Generator controls, filters, and task actions remain keyboard reachable.
- Every task row has an accessible name and only completed rows are activatable.
- The ellipsis button has a task-specific accessible label.
- Opening menu actions must not trigger the task row.
- The practice Modal retains the accessible practice region and the
  `占满屏幕` / `退出满屏` control.
- Existing confirmation dialogs and loading/disabled states are preserved.
