# Focus Studio Detail Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the Focus Studio task route and memory-map summary footer for a polished 1440px desktop experience.

**Architecture:** Keep data and handlers in the existing React components. Change only their semantic grouping and the co-located English World visual system, with component and CSS contract tests protecting the hierarchy.

**Tech Stack:** React, TypeScript, Ant Design, Vitest, Testing Library, CSS custom properties.

## Global Constraints

- Preserve existing routes, handlers, data limits, and Chinese copy unless the new grouping needs a label.
- Desktop 1440px is the primary target; existing responsive behavior must remain usable.
- Respect `prefers-reduced-motion`.

---

### Task 1: Lock the new hierarchy with failing tests

**Files:**
- Modify: `apps/english-world/src/page/englishWorld/cockpit/LearningCockpitPage.test.tsx`
- Modify: `apps/english-world/src/page/englishWorld/memoryMap/MemoryMapSummary.test.tsx`
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.visual.test.ts`

- [x] Add ordered-list semantics, named memory regions, single-percentage, and CSS hierarchy assertions.
- [x] Run the focused tests and confirm they fail on the missing refinement.

### Task 2: Implement the two refined areas

**Files:**
- Modify: `apps/english-world/src/page/englishWorld/dailyCoach/CoachSummaryPanel.tsx`
- Modify: `apps/english-world/src/page/englishWorld/memoryMap/MemoryMapSummary.tsx`
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.css`

- [x] Group task content/actions, keep their containers consistent, and distinguish the current step through its index and button.
- [x] Split the memory footer into mastery, clue, and action zones.
- [x] Add the restrained surfaces, pills, hover motion, responsive rules, and reduced-motion overrides.
- [x] Run focused tests until green.

### Task 3: Verify and review

**Files:**
- Verify all modified files and the running page.

- [x] Run changed-file lint, the full English World tests, and the production build.
- [x] Inspect Today at 1440px and verify no horizontal overflow.
- [x] Ask Gemini for a final visual/code review and iterate until PASS.
