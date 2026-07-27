# Context Lab Compact Search Toolbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the joined search-button control with a compact icon-prefixed input and keep the source filter aligned beside it on desktop.

**Architecture:** Preserve the existing `historyKeyword` and `historySourceType` state and API query flow. Change only the toolbar rendering in `ContextLabPage.tsx` and the scoped layout rules in `EnglishWorld.css`, with one component test protecting the new control structure.

**Tech Stack:** React 18, TypeScript, Ant Design 5, Vitest, Testing Library, CSS.

## Global Constraints

- Keep the existing keyword, clear, source filter, result summary, and empty-state behavior.
- Do not change the backend API or introduce dependencies.
- Use a single-row 45/55 desktop layout and a two-row layout below the existing responsive breakpoint.
- Keep controls 36px high with 7px corner radii.

---

### Task 1: Compact Search And Filter Toolbar

**Files:**
- Modify: `apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.test.tsx`
- Modify: `apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.tsx`
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.css`

**Interfaces:**
- Consumes: existing `historyKeyword`, `setHistoryKeyword`, `historySourceType`, and `setHistorySourceType`.
- Produces: an `Input` with `SearchOutlined` prefix and the existing `Segmented<ContextLabHistorySourceFilter>` control.

- [ ] **Step 1: Write the failing structural test**

Update the existing search test so it captures the rendered container and verifies that the search input has an integrated prefix without an Ant Design search-button wrapper:

```tsx
const { container } = render(<ContextLabPage />);

const searchInput = await screen.findByRole("textbox", {
  name: "搜索练习包",
});
expect(searchInput.closest(".ant-input-affix-wrapper")).toHaveClass(
  "context-lab-history-search-input",
);
expect(container.querySelector(".ant-input-search-button")).not.toBeInTheDocument();
```

- [ ] **Step 2: Run the targeted test and verify it fails**

Run:

```bash
pnpm --filter @font/english-world test --run src/page/englishWorld/contextLab/ContextLabPage.test.tsx -t "searches practice packages"
```

Expected: FAIL because the current `Input.Search` renders `.ant-input-search-button` and does not render `.context-lab-history-search-input`.

- [ ] **Step 3: Replace the joined search control**

Import `SearchOutlined` and render a regular controlled input:

```tsx
<Input
  allowClear
  aria-label="搜索练习包"
  className="context-lab-history-search-input"
  placeholder="搜索练习包、单词、来源、状态"
  prefix={<SearchOutlined aria-hidden />}
  value={historyKeyword}
  onChange={(event) => setHistoryKeyword(event.target.value)}
/>
```

Keep the existing segmented source filter and result summary unchanged.

- [ ] **Step 4: Implement the compact responsive layout**

Replace the current toolbar-specific sizing with:

```css
.context-lab-history-search {
  display: grid;
  grid-template-columns: minmax(280px, 0.82fr) minmax(420px, 1fr);
  gap: 12px;
  align-items: center;
}

.context-lab-history-search-input {
  height: 36px;
  border-radius: 7px;
}

.context-lab-history-search .ant-segmented {
  min-height: 36px;
  border-radius: 7px;
}
```

At `max-width: 1279px`, retain the existing one-column grid so the input and segmented filter become two rows without overflow.

- [ ] **Step 5: Run the targeted component test**

Run:

```bash
pnpm --filter @font/english-world test --run src/page/englishWorld/contextLab/ContextLabPage.test.tsx -t "searches practice packages"
```

Expected: PASS.

- [ ] **Step 6: Run the complete component test and build**

Run:

```bash
pnpm --filter @font/english-world test --run src/page/englishWorld/contextLab/ContextLabPage.test.tsx
pnpm --filter @font/english-world build
```

Expected: all tests pass and TypeScript/Vite build succeeds.

- [ ] **Step 7: Check desktop and narrow layouts**

Start the app:

```bash
pnpm --filter @font/english-world dev --host 127.0.0.1
```

Verify at 1600px and 1100px viewport widths:

- Desktop: search and source filter remain on one line without a separate search button.
- Narrow: the controls become two rows without clipping, overlap, or truncated source labels.
- Typing, clearing, and selecting a source continue to refresh the package list.

- [ ] **Step 8: Commit the implementation**

```bash
git add apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.test.tsx apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.tsx apps/english-world/src/page/englishWorld/EnglishWorld.css docs/superpowers/plans/2026-07-27-context-lab-compact-search-toolbar.md
git commit -m "style(english-world): compact context lab search toolbar"
```

## Verification Notes

- Targeted search test: passed.
- Production build: passed.
- Cypress desktop and 1100px responsive visual check: passed.
- Full `ContextLabPage` suite: 50 passed and 3 existing bulk-import preview tests failed because the `导入预览` dialog did not open. The failures reproduce when run alone and do not touch the search toolbar path.
