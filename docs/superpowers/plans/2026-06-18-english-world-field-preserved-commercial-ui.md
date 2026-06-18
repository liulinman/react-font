# English World Field Preserved Commercial UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the desktop English World UI toward the approved field-preserved commercial prototype while keeping existing functions and data fields.

**Architecture:** Keep existing React pages and business components. Replace the desktop top navigation with a left commercial sidebar, refresh the word-library shell styling, and leave existing form fields, table columns, AI query fields, Context Lab fields, and actions intact.

**Tech Stack:** React, TypeScript, Ant Design, Vitest, Testing Library, CSS.

## Global Constraints

- Do not remove or rename existing word-library fields: 时间范围, 中文名, 英文名, 音标, 类型, 掌握程度.
- Do not remove table columns: 序号, 单词, 音标, 词性, 中文释义, 图片, 类型, 笔记, 掌握程度, 引用, 创建时间, 更新时间, 操作.
- Do not remove add/edit modal fields: 单词名, 掌握程度, 类型, 音标, 词性, 中文, 图片, 笔记, 引用.
- Preserve AI 单词查询, AI 语境实验室, 今日复习, 记忆地图, 学习统计, 系统设置 routes and actions.
- Do not touch mobile pages in this pass.

---

### Task 1: Sidebar Navigation

**Files:**
- Modify: `apps/english-world/src/page/englishWorld/component/EnglishHeader.test.tsx`
- Modify: `apps/english-world/src/page/englishWorld/component/EnglishHeader.tsx`
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.css`

**Interfaces:**
- Consumes: `getPathForNav(key: string): string`, `normalizeActiveKey(key: string): string`.
- Produces: a desktop sidebar with clickable navigation buttons using the same nav keys as today.

- [ ] **Step 1: Write failing tests**

Add tests that assert the desktop sidebar shows all preserved entries and that clicking `AI 单词查询` navigates to `/englishWorld/ai-word`.

- [ ] **Step 2: Run red test**

Run: `pnpm --dir apps/english-world test src/page/englishWorld/component/EnglishHeader.test.tsx --run`
Expected: FAIL because the sidebar structure and visible AI entry are not implemented.

- [ ] **Step 3: Implement sidebar**

Replace the horizontal header markup with a fixed left sidebar. Keep user logout dropdown. Use existing nav keys: `cockpit`, `recite`, `words`, `aiWord`, `contextLab`, `memoryMap`, `stats`, `setting`.

- [ ] **Step 4: Run green test**

Run: `pnpm --dir apps/english-world test src/page/englishWorld/component/EnglishHeader.test.tsx --run`
Expected: PASS.

### Task 2: Word Library Commercial Shell

**Files:**
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.test.tsx`
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.tsx`
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.css`

**Interfaces:**
- Consumes: existing `filterFields`, `columns`, `EditAddModal`.
- Produces: a field-preserved word library page with commercial panel styling and unchanged fields.

- [ ] **Step 1: Write failing tests**

Add assertions for the field-preserved page title/subtitle and existing filter labels.

- [ ] **Step 2: Run red test**

Run: `pnpm --dir apps/english-world test src/page/englishWorld/EnglishWorld.test.tsx --run`
Expected: FAIL because the new commercial title/subtitle are not present.

- [ ] **Step 3: Implement shell copy and CSS**

Update the word-library title from `单词列表` to `词库管理`, add the field-preservation subtitle, rename the add button label to `添加单词`, and restyle panels/tables without changing the fields or table columns.

- [ ] **Step 4: Run green test**

Run: `pnpm --dir apps/english-world test src/page/englishWorld/EnglishWorld.test.tsx --run`
Expected: PASS.

### Task 3: Verification

**Files:**
- Test only.

**Interfaces:**
- Produces: evidence that the UI compiles and related tests pass.

- [ ] **Step 1: Run focused tests**

Run: `pnpm --dir apps/english-world test src/page/englishWorld/EnglishWorld.test.tsx src/page/englishWorld/component/EnglishHeader.test.tsx src/page/englishWorld/navigation.test.ts --run`
Expected: PASS.

- [ ] **Step 2: Run build**

Run: `pnpm --dir apps/english-world build`
Expected: PASS. Existing browserslist/chunk-size warnings are acceptable if there are no TypeScript or Vite errors.

## Self-Review

- Spec coverage: sidebar, visible entries, word-library field preservation, route preservation, and verification are covered.
- Placeholder scan: no TBD/TODO placeholders.
- Type consistency: all nav keys match existing `navigation.ts`.
