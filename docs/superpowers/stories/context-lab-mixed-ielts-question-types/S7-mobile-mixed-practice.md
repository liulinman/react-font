---
story_id: S7
title: 移动端混合题型练习体验
status: ready-for-dev
depends_on:
  - S5
repositories:
  - /Users/liulin/Desktop/font/english/react-font
---

# S7 移动端混合题型练习体验

## 用户故事

作为手机端学习者，我希望拥有与桌面端相同的四种题型能力，并在软键盘打开时仍
能看到当前输入和提交状态。

## 业务价值

移动端当前明确写着“选择题作答区”。本 Story 消除桌面和移动能力差异，避免用户
换设备后无法完成同一套练习。

## 范围

- 新增 Ant Design Mobile 题目字段组件。
- 移动端改用统一答案状态和草稿。
- 题目区文案从“选择题”改为“题目”。
- 未答完提交使用移动端确认弹窗。
- 固定提交栏与软键盘布局兼容。
- 混合结果和历史详情可读。

## 验收条件

### AC1：四种题型能力

**Given** 移动端打开混合练习
**When** 页面渲染
**Then** 四种 `responseType` 均有对应控件
**And** TFNG 不显示 A/B/C

### AC2：文本输入可用

**Given** 用户在 390x844 或 320x568 视口输入答案
**When** 软键盘打开
**Then** 当前输入和限词提示可见
**And** 固定提交栏不会遮挡题目

### AC3：可访问性

**Given** 文本题
**When** 页面渲染输入框
**Then** 字号至少 16px
**And** 触控目标至少 44px
**And** 输入框有包含题号和限词的可访问名称

### AC4：未完成提交

**Given** 还有未作答题
**When** 用户点击提交
**Then** 显示确认弹窗
**And** 确认后允许提交

### AC5：草稿和结果

**Given** 用户中途离开再回来
**When** 打开同一练习
**Then** 恢复草稿
**And** 提交后显示用户答案、正确答案、状态、原因与解析
**And** 成功提交或删除后清除对应草稿

## 新文件

- `apps/english-world/src/page/englishWorldMobile/MobileContextLabQuestionField.tsx`

## 修改文件

- `apps/english-world/src/page/englishWorldMobile/mobileContextLab.ts`
- `apps/english-world/src/page/englishWorldMobile/MobileContextLabPage.tsx`
- `apps/english-world/src/page/englishWorldMobile/ExerciseAgentTabMobile.test.tsx`
- `apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.css`

## 任务清单

- [ ] 为四种题型、提交确认、草稿和结果编写移动端失败测试。
- [ ] 实现 `MobileContextLabQuestionField`。
- [ ] 替换 `Record<string, number>`。
- [ ] 将作答区可访问名称和标题改为“题目”。
- [ ] 接入共享已答数量和提交构建函数。
- [ ] 接入草稿恢复与清理。
- [ ] 调整输入字号、固定栏留白和窄屏布局。

## 测试

```bash
cd /Users/liulin/Desktop/font/english/react-font
pnpm --filter @font/english-world test -- --run src/page/englishWorldMobile/mobileContextLab.test.ts src/page/englishWorldMobile/ExerciseAgentTabMobile.test.tsx
pnpm --filter @font/english-world build
```

## UI 护栏

- 使用 Ant Design Mobile 现有控件，不混用桌面 Ant Design Input。
- 输入框设置 `autoComplete="off"`、`autoCapitalize="none"` 和
  `spellCheck={false}`。
- 不删除现有标词、导入、Attempt 抽屉和任务 SSE 能力。
- 不出现整页横向滚动。
- 固定提交栏必须为页面内容预留稳定底部空间。

## 实施参考

- [设计规格：移动端](../../specs/2026-07-30-context-lab-mixed-ielts-question-types-design.md#移动端)
- [实施计划：Task 7](../../plans/2026-07-30-context-lab-mixed-ielts-question-types.md#task-7-s7---mobile-mixed-question-experience)

## 完成定义

- AC1-AC5 有自动化测试。
- 390x844 和 320x568 浏览器验收通过。
- 移动端现有生成、历史、标词与导入测试保持通过。
- 提交一个独立前端 commit。
