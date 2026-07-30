---
story_id: S4
title: 历史记录、结果与混合题型 PDF
status: ready-for-dev
depends_on:
  - S1
  - S2
  - S3
repositories:
  - /Users/liulin/Desktop/font/english/nestjs
---

# S4 历史记录、结果与混合题型 PDF

## 用户故事

作为学习者，我希望提交后和稍后回看时都能看到自己的答案、正确答案和原因，并
下载与页面题型一致的练习 PDF。

## 业务价值

如果历史和 PDF 仍按选择题解释，新生成能力会在复盘阶段失真。本 Story 让任务
映射、Attempt 和打印输出完整理解 V2。

## 范围

- 任务详情返回题组、安全题目、警告和目标题数。
- Attempt 返回混合答案与混合结果。
- 某条历史 JSON 损坏时只隔离该条记录。
- PDF 按题组输出真实控件语义。
- 部分成功使用实际题数。

## 验收条件

### AC1：安全任务详情

**Given** V2 任务已经成功
**When** 用户请求详情或历史
**Then** 返回 `groups`、脱敏 `questions`、`generationWarnings` 和
`targetQuestionCount`
**And** 不返回任何正确答案字段

### AC2：混合结果复盘

**Given** Attempt 中包含文本题
**When** 用户打开历史详情
**Then** 返回用户原始文本、可接受答案、状态、原因和解析

### AC3：历史异常隔离

**Given** 某一条 Attempt JSON 无法解析
**When** 用户加载历史列表
**Then** 该条答案数组为空
**And** 其他历史记录仍正常返回

### AC4：混合 PDF

**Given** 练习包含四种题型
**When** 用户下载学生版 PDF
**Then** 单选打印选项
**And** TFNG 打印统一说明且不添加 A/B/C
**And** 填空和简答打印横线与限词
**And** PDF 不包含正确答案

### AC5：部分题量

**Given** 练习只有 11 道有效题、目标题数为 13
**When** 页面或 PDF 显示题量
**Then** 展示 `11/13`
**And** 分数分母为 11

## 修改文件

- `src/interface/exercise-agent/exercise-agent.types.ts`
- `src/interface/exercise-agent/exercise-agent.service.ts`
- `src/interface/exercise-agent/exercise-agent.service.spec.ts`

## 任务清单

- [ ] 为安全映射、混合 Attempt、异常历史和 PDF 编写失败测试。
- [ ] `mapTask()` 返回题组、警告和目标题数。
- [ ] Attempt JSON 使用有防御性的类型解析器。
- [ ] 结果模型支持选择值、TFNG 值和文本值。
- [ ] PDF 按 `responseType` 分支。
- [ ] 题组说明只打印一次。
- [ ] 运行现有历史、删除、归属校验和紧凑 PDF 回归测试。

## 测试

```bash
cd /Users/liulin/Desktop/font/english/nestjs
pnpm test --runInBand src/interface/exercise-agent/exercise-agent.service.spec.ts
pnpm build
```

## 开发护栏

- 不增加新的 PDF 接口。
- 不在学生版 PDF 输出答案。
- 不因一条损坏历史让整个列表 500。
- 所有历史、详情和 PDF 继续按 `userId` 校验归属。
- 保留现有删除与 Attempt 持久化行为。

## 实施参考

- [设计规格：结果契约](../../specs/2026-07-30-context-lab-mixed-ielts-question-types-design.md#结果契约)
- [设计规格：PDF](../../specs/2026-07-30-context-lab-mixed-ielts-question-types-design.md#pdf)
- [实施计划：Task 4](../../plans/2026-07-30-context-lab-mixed-ielts-question-types.md#task-4-s4---safe-api-mapping-attempts-and-mixed-pdf)

## 完成定义

- AC1-AC5 均有测试。
- 旧选择题 PDF 测试仍通过。
- 历史记录能同时显示 V1 和 V2 Attempt。
- 提交一个独立后端 commit。
