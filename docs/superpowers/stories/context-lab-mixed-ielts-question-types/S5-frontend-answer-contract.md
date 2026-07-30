---
story_id: S5
title: 前端统一答案契约与本地草稿
status: ready-for-dev
depends_on:
  - S4
repositories:
  - /Users/liulin/Desktop/font/english/react-font
---

# S5 前端统一答案契约与本地草稿

## 用户故事

作为在 Web 桌面端练习的用户，我希望页面正确理解不同答案类型，并在刷新后恢复
尚未提交的答案。

## 业务价值

Web 桌面端当前保存 `Record<string, number>`。先建立统一答案层，让桌面练习的
提交、草稿和结果使用同一套规则，并为未来移动端复用保留纯函数边界。

## 范围

- 前端题目、答案、结果和 Attempt 改为联合类型。
- 旧题目没有 `responseType` 时按选择题兼容。
- 统一已答数量和提交载荷构建。
- 按练习 session 保存本地草稿。
- 粘贴自带题在创建任务前检测不支持的 Matching。

## 验收条件

### AC1：联合答案

**Given** 页面包含四种题目
**When** 前端构建提交参数
**Then** 每题生成与 `responseType` 对应的答案字段
**And** 空白文本不计为已答

### AC2：旧题兼容

**Given** 历史题目只有 `options`、没有 `responseType`
**When** 前端读取题目
**Then** 将其视为 `single_choice`

### AC3：草稿恢复

**Given** 用户已回答部分题目但未提交
**When** 刷新并重新打开同一 session
**Then** 恢复该 session 的合法答案

### AC4：草稿隔离

**Given** 用户存在两个练习草稿
**When** 一个练习成功提交或删除
**Then** 只清除该练习草稿

### AC5：粘贴题型预检

**Given** 用户粘贴内容包含 Matching Headings、Information 或 Features
**When** 选择 `parse` 或 `auto`
**Then** 创建任务前显示题号和不支持原因
**And** 不静默转换题型

## 新文件

- `apps/english-world/src/page/englishWorld/contextLab/contextLabAnswers.ts`
- `apps/english-world/src/page/englishWorld/contextLab/contextLabAnswers.test.ts`
- `apps/english-world/src/page/englishWorld/contextLab/pastedQuestionCompatibility.ts`
- `apps/english-world/src/page/englishWorld/contextLab/pastedQuestionCompatibility.test.ts`

## 修改文件

- `apps/english-world/src/server/exerciseAgent/exerciseAgent.ts`
- `apps/english-world/src/page/englishWorld/types/learning.ts`

## 任务清单

- [ ] 为混合载荷、已答数量、草稿恢复和题型预检编写失败测试。
- [ ] 定义 `ContextLabQuestion`、`ContextLabAnswer` 和结果联合类型。
- [ ] 实现 `buildSubmitAnswers()`。
- [ ] 实现 `countAnsweredQuestions()`。
- [ ] 实现 session 级草稿读写与运行时校验。
- [ ] 实现 `detectUnsupportedPastedQuestions()`。
- [ ] 删除或替换重复的选择题专用 API 类型。

## 测试

```bash
cd /Users/liulin/Desktop/font/english/react-font
pnpm --filter @font/english-world test -- --run src/page/englishWorld/contextLab/contextLabAnswers.test.ts src/page/englishWorld/contextLab/pastedQuestionCompatibility.test.ts
pnpm --filter @font/english-world build
```

## 开发护栏

- 草稿只能保存用户答案，不能保存正确答案。
- Local Storage 数据必须运行时校验，不能直接类型断言。
- 题目 ID 作为状态键，缺失 ID 时沿用现有稳定回退键。
- 不引入新的全局状态库。
- 不把跨设备草稿同步扩入本 Story。

## 实施参考

- [设计规格：答案与提交契约](../../specs/2026-07-30-context-lab-mixed-ielts-question-types-design.md#答案与提交契约)
- [设计规格：作答进度](../../specs/2026-07-30-context-lab-mixed-ielts-question-types-design.md#作答进度)
- [实施计划：Task 5](../../plans/2026-07-30-context-lab-mixed-ielts-question-types.md#task-5-s5---frontend-mixed-answer-contract-and-local-drafts)

## 完成定义

- 所有纯函数有单元测试。
- 前端 TypeScript 构建通过。
- Web 桌面端能够消费统一答案辅助函数。
- 本 Story 不修改 `englishWorldMobile` 目录。
- 提交一个独立前端 commit。
