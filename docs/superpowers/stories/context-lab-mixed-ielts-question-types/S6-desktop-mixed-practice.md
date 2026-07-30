---
story_id: S6
title: 桌面端混合题型练习体验
status: ready-for-dev
depends_on:
  - S5
repositories:
  - /Users/liulin/Desktop/font/english/react-font
---

# S6 桌面端混合题型练习体验

## 用户故事

作为桌面端学习者，我希望在同一套阅读练习中自然完成选择、TFNG、填空和简答，
并在提交前后得到清晰反馈。

## 业务价值

让页面实际作答方式与 IELTS 题型名称一致，消除“Summary Completion 仍然四选一”
的产品错位。

## 范围

- 新增桌面题目字段组件。
- 按题组展示说明和连续题号。
- TFNG 使用语义选项，不显示 A/B/C。
- 文本题使用单行输入和限词说明。
- 未答完时二次确认，但允许提交。
- 显示部分成功警告和实际题数。
- 提交、删除与草稿生命周期联动。

## 验收条件

### AC1：按题型渲染

**Given** 练习包含四种题型
**When** 用户打开练习
**Then** 单选显示带字母选项
**And** TFNG 只显示语义值
**And** 填空和简答显示单行输入

### AC2：题组说明

**Given** 多道题属于同一题组
**When** 页面渲染题目
**Then** 题型标题、英文说明和限词只在题组头显示一次

### AC3：未完成提交

**Given** 用户还有 N 题未作答
**When** 点击提交
**Then** 显示二次确认
**And** 确认后只提交已答答案
**And** 后端结果将遗漏题标记为未作答

### AC4：结果复盘

**Given** 提交完成
**When** 页面展示结果
**Then** 每题显示用户答案、正确答案、状态、原因和解析
**And** 不仅依赖颜色表达正误

### AC5：部分成功提示

**Given** 任务包含 11 道有效题、目标题数为 13
**When** 用户开始练习
**Then** 显示 `本套可练习 11/13 题`
**And** 警告不阻止开始练习

### AC6：草稿生命周期

**Given** 用户刷新页面
**When** 再次打开同一练习
**Then** 恢复草稿
**And** 成功提交或删除练习后清除草稿

## 新文件

- `apps/english-world/src/page/englishWorld/contextLab/ContextLabQuestionField.tsx`

## 修改文件

- `apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.tsx`
- `apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.test.tsx`
- `apps/english-world/src/page/englishWorld/EnglishWorld.css`

## 任务清单

- [ ] 为四种渲染、混合提交、草稿和结果复盘编写失败测试。
- [ ] 实现 `ContextLabQuestionField`。
- [ ] 将页面数字答案状态替换为联合答案状态。
- [ ] 按组渲染题目，不嵌套多层卡片。
- [ ] 使用 Modal 实现未作答确认。
- [ ] 接入粘贴题型创建前预检。
- [ ] 接入提交成功和删除后的草稿清理。
- [ ] 增加稳定尺寸、输入状态和警告样式。

## 测试

```bash
cd /Users/liulin/Desktop/font/english/react-font
pnpm --filter @font/english-world test -- --run src/page/englishWorld/contextLab/contextLabAnswers.test.ts src/page/englishWorld/contextLab/ContextLabPage.test.tsx
pnpm --filter @font/english-world build
```

## UI 护栏

- 保留现有文章左侧、题目右侧的工作区。
- 不重做整个 Context Lab 页面。
- 输入框最长答案仍能完整查看。
- 卡片圆角不超过 8px。
- 不以颜色作为唯一反馈。
- 不出现整页横向滚动或题目控件重排抖动。

## 实施参考

- [设计规格：前端交互](../../specs/2026-07-30-context-lab-mixed-ielts-question-types-design.md#前端交互)
- [设计规格：桌面端](../../specs/2026-07-30-context-lab-mixed-ielts-question-types-design.md#桌面端)
- [实施计划：Task 6](../../plans/2026-07-30-context-lab-mixed-ielts-question-types.md#task-6-s6---desktop-mixed-question-experience)

## 完成定义

- AC1-AC6 有 Testing Library 覆盖。
- 旧选择题、历史抽屉、标词导入和 micro 页面测试保持通过。
- 桌面构建通过。
- 提交一个独立前端 commit。
