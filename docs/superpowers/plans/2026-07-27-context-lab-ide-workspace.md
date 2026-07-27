# Context Lab IDE Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Gemini's recommended IDE-style Context Lab workspace without
changing generation, submission, history, or import contracts.

**Architecture:** Reuse the existing form rendering inside a new shell with a
compact utility header, a fixed generator sidebar, and a full-width
practice-pack workspace. Keep `renderPracticeWorkspace()` in the existing
practice Modal, including the fullscreen toggle, and preserve secondary flows
in their existing Drawer and Modals.

**Tech Stack:** React 18, TypeScript, Ant Design 5, Vitest, Testing Library, CSS.

## Global Constraints

- Keep all existing API request payloads and response handling unchanged.
- Keep the source-preview Modal, attempt Drawer, and bulk-import preview.
- Keep the separate mobile Context Lab implementation unchanged.
- Use existing Ant Design controls and icon library.
- Use an 8px maximum card radius and no decorative shadows.

---

### Task 1: Lock the legacy practice Modal behavior

**Files:**
- Modify: `apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.test.tsx`
- Modify: `apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.tsx`

**Interfaces:**
- Consumes: existing `handleOpenTask(task)` and `renderPracticeWorkspace()`.
- Produces: the established `AI 语境练习` Modal with fullscreen switching.

- [ ] Add a test that opens a succeeded task in the legacy practice Modal and
  verifies the fullscreen toggle.
- [ ] Run the focused test and confirm it fails if the Modal or fullscreen
  control is removed.
- [ ] Preserve answer reset, timer, submission, micro-mode behavior, and the
  normal/fullscreen Modal transitions.
- [ ] Run the focused test and confirm it passes.

### Task 2: Move low-frequency task commands into a menu

**Files:**
- Modify: `apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.test.tsx`
- Modify: `apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.tsx`

**Interfaces:**
- Consumes: `loadAttempts`, `handleDownloadTaskPdf`, and `handleDeleteTask`.
- Produces: a task-specific `更多操作` dropdown.

- [ ] Add tests proving that record, PDF, and delete commands are absent until
  the task's more menu is opened, and remain wired to their existing handlers.
- [ ] Run the focused tests and confirm they fail against the exposed buttons.
- [ ] Add an Ant Design `Dropdown` with `MoreOutlined`; keep only the primary
  practice action visible.
- [ ] Stop menu events from opening the task and keep pending-task deletion
  messaging unchanged.
- [ ] Run the focused tests and confirm they pass.

### Task 3: Build the Gemini workspace shell

**Files:**
- Modify: `apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.test.tsx`
- Modify: `apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.tsx`
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.css`

**Interfaces:**
- Consumes: the existing generator form, history search, status renderer, and
  practice Modal.
- Produces: `.context-lab-shell`, `.context-lab-sidebar`, and
  `.context-lab-pack-workspace`.

- [x] Add a structure test for the utility header, generator sidebar, and
  practice-pack workspace.
- [ ] Run it and confirm it fails because the dashboard still uses the old
  hero/grid structure.
- [x] Keep the generator visible in the sidebar and render search, filters, and
  task history in the full-width workspace.
- [x] Avoid an inline selected-task/status panel because practice opens in the
  legacy Modal.
- [x] Replace dashboard CSS with the 320px sidebar layout, compact rows,
  status rails, neutral surfaces, and 8/12px spacing.
- [x] Add 1280px, 992px, and reduced-motion responsive rules.
- [x] Run the structure and interaction tests and confirm they pass.

### Task 4: Regression and visual verification

**Files:**
- Verify: `apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.test.tsx`
- Verify: `apps/english-world/src/theme/theme.visual.test.ts`
- Verify: `apps/english-world/src/page/englishWorld/EnglishWorld.visual.test.ts`

**Interfaces:**
- Consumes: the completed workspace.
- Produces: fresh automated and visual evidence.

- [ ] Run the focused Context Lab tests for generation, filtering, opening,
  submission, records, PDF, and deletion.
- [ ] Run theme and English World visual-contract tests.
- [ ] Run the English World production build.
- [ ] Open `/englishWorld/context-lab` at desktop and medium widths.
- [ ] Capture screenshots and inspect overflow, text truncation, task actions,
  empty state, the legacy practice Modal, and fullscreen mode.
