---
story_id: S8
title: 跨仓库回归与浏览器验收
status: ready-for-dev
depends_on:
  - S1
  - S2
  - S3
  - S4
  - S5
  - S6
repositories:
  - /Users/liulin/Desktop/font/english/nestjs
  - /Users/liulin/Desktop/font/english/react-font
---

# S8 跨仓库回归与浏览器验收

## 用户故事

作为产品负责人，我希望完整混合题型流程经过前后端和真实浏览器验证，以便上线
后不会再次出现“生成成功但无法练习”或不同 Web 桌面尺寸下不可用的问题。

## 业务价值

本 Story 是发布门槛，不增加新功能。它证明新功能与旧练习、微练习、历史、PDF、
SSE 和词汇学习闭环能够共存。

## 范围

- 新增 Cypress 混合题型流程。
- 运行后端聚焦测试和构建。
- 运行前端聚焦测试和构建。
- 验证三个 Web 桌面目标视口。
- 使用真实本地 AI 配置生成一套标准练习。
- 核对网络响应中没有答案泄漏。

## 验收条件

### AC1：桌面完整流程

**Given** 任务包含四种题型
**When** 用户在桌面端作答、保留一道未答并确认提交
**Then** 请求载荷正确
**And** 结果正确展示四种答案

### AC2：Web 桌面布局

**Given** 同一任务在 1280x720、1440x900 和 1920x1080 打开
**When** 用户完成文本输入和 TFNG
**Then** 页面无横向滚动
**And** 题目控件、结果和提交按钮互不遮挡

### AC3：旧数据回归

**Given** V1 选择题练习
**When** 打开并提交
**Then** 行为与升级前一致

### AC4：微练习回归

**Given** micro 练习
**When** 生成和提交
**Then** 仍是三道四选一题
**And** 薄弱词归因和学习事件保持正常

### AC5：部分成功

**Given** 一套练习少于目标题数但至少一题有效
**When** 用户开始练习
**Then** UI 显示实际题数和警告
**And** 用户可以提交和查看历史

### AC6：安全

**Given** 用户尚未提交
**When** 检查任务详情、历史和 SSE 响应
**Then** 不包含任何正确答案字段

## 新文件

- `apps/english-world/cypress/e2e/context-lab-mixed-question-types.cy.ts`

## 任务清单

- [ ] 创建安全 V2 任务和混合提交结果 Cypress fixture。
- [ ] 验证 Web 桌面 1280x720、1440x900 和 1920x1080。
- [ ] 检查 TFNG 语义标签、文本草稿、未答确认和结果复盘。
- [ ] 运行全部聚焦 Jest 与 Vitest。
- [ ] 运行前后端构建。
- [ ] 本地真实生成一套 Band 7 练习。
- [ ] 验证解释 AI 失败不改变成绩。
- [ ] 验证旧 V1 和 micro。

## 测试

### 后端验证

```bash
cd /Users/liulin/Desktop/font/english/nestjs
pnpm test --runInBand src/interface/exercise-agent/exercise-question-contract.spec.ts src/interface/exercise-agent/exercise-answer-grader.spec.ts src/interface/exercise-agent/exercise-agent.service.spec.ts src/interface/context-lab/context-lab.service.spec.ts
pnpm build
```

### 前端验证

```bash
cd /Users/liulin/Desktop/font/english/react-font
pnpm --filter @font/english-world test -- --run src/page/englishWorld/contextLab/contextLabAnswers.test.ts src/page/englishWorld/contextLab/ContextLabPage.test.tsx
pnpm --filter @font/english-world build
```

### 浏览器验证

```bash
cd /Users/liulin/Desktop/font/english/react-font
pnpm --filter @font/english-world cypress:ensure
cd apps/english-world
pnpm exec start-server-and-test "vite --host 127.0.0.1 --port 5175 --strictPort" http://127.0.0.1:5175 "cypress run --spec cypress/e2e/context-lab-mixed-question-types.cy.ts"
```

## 发布护栏

- 任一构建或聚焦测试失败都不能进入部署。
- 真实生成不得只验证任务状态，必须实际打开、作答和提交。
- 不用前端 mock 结果替代真实本地生成验证。
- 后端仓库无关的未跟踪文档不能进入提交。
- 前后端分别检查 Git diff 和 commit 范围。

## 实施参考

- [设计规格：测试策略](../../specs/2026-07-30-context-lab-mixed-ielts-question-types-design.md#测试策略)
- [设计规格：验收标准](../../specs/2026-07-30-context-lab-mixed-ielts-question-types-design.md#验收标准)
- [实施计划：Task 8](../../plans/2026-07-30-context-lab-mixed-ielts-question-types.md#task-8-s8---cross-repository-regression-and-browser-acceptance)

## 完成定义

- AC1-AC6 全部通过。
- Cypress 三个 Web 桌面视口通过。
- 前后端构建和聚焦测试通过。
- 本地真实生成、提交、历史和 PDF 手工验收通过。
- 回归测试以独立前端 commit 提交。
