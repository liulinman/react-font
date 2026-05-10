# Technical Specification: react-font 项目重构

**Date:** 2026-05-09
**Author:** liulin
**Version:** 1.0
**Project Type:** Refactoring
**Project Level:** 1
**Status:** In Progress

---

## Problem & Solution

### Problem Statement

react-font 项目存在四个核心问题：

1. **样式架构混乱** — 5 种方案混用（Tailwind、antd-style、CSS 文件、内联 style、antd token），无规则可循
2. **代码规范缺失** — 无 Prettier、ESLint 规则宽松、无 pre-commit hook
3. **迭代效率低** — 重复代码多（枚举映射/时间格式化到处内联）、硬编码高度计算脆弱
4. **单词列表 UI 体验差** — 12 列需横向滚动、密度不可调、无视觉层次

### Proposed Solution

分 4 个 Phase 渐进式重构：P1 建立规范基础设施，P2 统一样式架构，P3 重构单词列表 UI，P4 提取通用抽象。

---

## Requirements

| #   | 需求                        | 验收标准                                                |
| --- | --------------------------- | ------------------------------------------------------- |
| R1  | 引入 Prettier + lint-staged | 所有文件格式化一致，pre-commit 自动检查                 |
| R2  | 样式分层治理                | 禁止内联 style={{}}，布局用 Tailwind，组件用 antd-style |
| R3  | 弹性布局替换硬编码          | 删除所有 calc(100vh - ...)，改用 flex 自然填充          |
| R4  | 单词列表 UI 重构            | 列可见性切换 + 密度切换 + 掌握程度颜色边条              |
| R5  | 提取表单格式化层            | 枚举映射、时间格式、Tag 颜色统一到 formatters.ts        |
| R6  | dayjs 替代 moment           | 删除 moment 依赖，统一用 dayjs                          |
| R7  | 提取通用组件到 @font/ui     | FormFieldGroup、DensitySwitch 等移入共享包              |

### Out of Scope

- antd 大版本升级
- Tailwind v4 升级
- 引入 Storybook
- 后端 API 改造

---

## Technical Approach

### Technology Stack

- **Language/Framework:** React 18.3 + TypeScript 5.7
- **Build:** Vite 6.x
- **CSS:** Tailwind v3 (布局) + antd-style createStyles (组件) + antd ConfigProvider theme (全局主题)
- **UI Library:** antd 5.x + antd-mobile 5.x
- **Linting:** ESLint flat config + Prettier 3.x
- **Git Hooks:** lint-staged + husky
- **Monorepo:** pnpm workspace + Turborepo

### Architecture Overview

```
样式分层规则：
┌─────────────────────────────┐
│  布局/间距/颜色  → Tailwind  │
├─────────────────────────────┤
│  组件定制样式    → antd-style│
├─────────────────────────────┤
│  全局主题        → ConfigProvider token │
└─────────────────────────────┘

代码组织：
├── apps/english-world/
│   └── src/
│       ├── utils/formatters.ts   ← 统一格式化
│       └── hooks/                ← 通用 hooks
├── packages/ui/
│   └── src/
│       ├── FormFieldGroup/       ← 表单折叠组件
│       ├── DensitySwitch/        ← 密度切换
│       └── ColumnToggle/         ← 列可见性切换
└── packages/utils/
    └── src/
        └── formatters.ts         ← 共享格式化工具
```

---

## Implementation Plan

### Stories

1. **Prettier + lint-staged 基础设施** - 安装配置 Prettier、husky、lint-staged，全局格式化
2. **样式分层治理** - 替换内联 style 为 Tailwind/antd-style，建立 ConfigProvider theme token
3. **弹性布局修复** - 删除硬编码 calc，改为 flex + overflow 自然填充
4. **单词列表 UI 重构** - 列可见性切换、密度切换、颜色边条
5. **提取格式化层 + dayjs 迁移** - 统一 formatters.ts，移除 moment
6. **通用组件提取到 @font/ui** - FormFieldGroup 等移入共享包

### Development Phases

**Phase 1: 基础设施** (Story 1)
**Phase 2: 样式架构** (Story 2 + 3)
**Phase 3: 列表 UI** (Story 4)
**Phase 4: 代码抽象** (Story 5 + 6)

---

## Acceptance Criteria

- [ ] `pnpm lint` 和 `pnpm format` 通过
- [ ] pre-commit hook 自动检查格式化
- [ ] 项目中没有内联 style={{}}（动态值除外）
- [ ] 没有普通 CSS 文件中的样式（Tailwind 基除外）
- [ ] 单词列表支持列切换和密度切换
- [ ] 无硬编码 calc(100vh - ...)
- [ ] moment 依赖已移除
- [ ] formatters.ts 覆盖所有枚举映射

---

## Dependencies

- 无外部依赖阻塞
- 依赖 pnpm、node >=18 环境

## Risks & Mitigation

- **Risk:** 大规模格式化造成 diff 过大
  - **Mitigation:** Phase 1 单独一个 PR，只做格式化
- **Risk:** 删除 CSS 文件导致样式丢失
  - **Mitigation:** 逐文件迁移，验证后再删除

## Timeline

**Target Completion:** 2026-05-13
**Milestones:**

- Phase 1: 2026-05-09
- Phase 2: 2026-05-10
- Phase 3: 2026-05-11
- Phase 4: 2026-05-12

---

_This document was created using BMAD Method v6 - Phase 2 (Planning)_
