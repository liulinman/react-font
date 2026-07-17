# Word Card Visual Hierarchy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make word cards visually distinct from the surrounding white panel with a restrained layered background, compact shadow, and clear interaction states.

**Architecture:** Keep the existing React markup and card grid unchanged. Implement the approved hierarchy entirely in the scoped `EnglishWorld.css` selectors, then verify the result through the existing test suite, production build, and local browser at desktop and narrow widths.

**Tech Stack:** React 18, TypeScript, Ant Design, CSS, Vitest, Vite

## Global Constraints

- Do not change card content, layout, actions, grid columns, spacing, or minimum height.
- Keep `.word-card-selected` visually stronger than the default hover state.
- Preserve existing responsive grid behavior and pagination behavior.
- Add no dependency and create no new component.
- Do not create a Git commit unless the user explicitly asks, because the current worktree already contains unrelated uncommitted changes.

---

### Task 1: Add lightweight surface layering and interaction states

**Files:**
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.css:498-567`
- Create: `apps/english-world/src/page/englishWorld/EnglishWorld.visual.test.ts`
- Reference: `docs/superpowers/specs/2026-07-16-word-card-visual-hierarchy-design.md`

**Interfaces:**
- Consumes: existing `.english-world-card-view`, `.word-card`, and `.word-card-selected` class names rendered by `EnglishWorld.tsx`.
- Produces: CSS-only default, hover, selected, and reduced-motion card states; no TypeScript interface changes.

- [x] **Step 1: Record the visual baseline**

Open the local word-library card view and confirm the current failure condition: the surrounding panel and cards are both white, while the broad shadow does not create a crisp boundary.

Expected: the screenshot matches the reported blended-surface problem before CSS changes.

- [x] **Step 2: Add a background surface around the card grid**

Update `.english-world-card-view` to retain its existing flex behavior while adding the approved surface treatment:

```css
.english-world-card-view {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  gap: 14px;
  padding: 14px;
  border: 1px solid #e5ebf3;
  border-radius: 10px;
  background: #f6f8fc;
}
```

- [x] **Step 3: Replace the broad card shadow with a compact boundary**

Update `.word-card` without changing its layout dimensions:

```css
.word-card {
  display: flex;
  min-width: 0;
  min-height: 246px;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1px solid #d8e1ee;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 3px 10px rgba(15, 23, 42, 0.055);
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    background 160ms ease;
}
```

- [x] **Step 4: Add hover, selected, and reduced-motion states**

Add the following rules immediately after `.word-card` and replace the existing selected rule with the combined selected selector:

```css
.word-card:hover {
  transform: translateY(-1px);
  border-color: #c3d0e0;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.09);
}

.word-card-selected,
.word-card-selected:hover {
  transform: translateY(-1px);
  border-color: #60a5fa;
  background: #f8fbff;
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.16);
}

@media (prefers-reduced-motion: reduce) {
  .word-card {
    transition: none;
  }

  .word-card:hover,
  .word-card-selected,
  .word-card-selected:hover {
    transform: none;
  }
}
```

- [x] **Step 5: Run targeted static and component checks**

Run:

```bash
pnpm exec eslint apps/english-world/src/page/englishWorld/EnglishWorld.tsx apps/english-world/src/page/englishWorld/EnglishWorld.test.tsx
pnpm exec vitest run apps/english-world/src/page/englishWorld/EnglishWorld.test.tsx --reporter=dot
```

Expected: ESLint exits 0 and the existing `EnglishWorld.test.tsx` suite passes with no new failure.

- [x] **Step 6: Build the frontend**

Run:

```bash
pnpm --filter @font/english-world build
```

Expected: TypeScript and Vite build complete successfully. Existing bundle-size warnings are acceptable; compile errors are not.

- [x] **Step 7: Verify the result in the browser**

At desktop width, confirm:

- The blue-gray card-view surface is visible between cards and around the grid.
- White cards have crisp neutral borders and compact shadows.
- Hover moves a card by only 1px and does not shift neighboring cards.
- Selected cards retain the blue border and stronger blue shadow.
- Pagination remains contained and readable.

At a viewport below 980px, confirm:

- The existing single-column grid remains active.
- The new surface padding does not cause horizontal overflow.
- Card text and actions are not clipped.

- [x] **Step 8: Run final diff checks**

Run:

```bash
git diff --check
git status --short --branch
```

Expected: no whitespace errors and only the known worktree changes plus this CSS/spec/plan work are present.
