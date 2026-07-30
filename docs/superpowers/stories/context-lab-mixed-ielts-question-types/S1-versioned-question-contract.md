---
story_id: S1
title: 版本化题目契约与旧数据兼容
status: ready-for-dev
depends_on: []
repositories:
  - /Users/liulin/Desktop/font/english/nestjs
---

# S1 版本化题目契约与旧数据兼容

## 用户故事

作为已经使用过 Context Lab 的学习者，我希望旧练习和新混合题型练习都能正常
打开，以便产品升级后不丢失历史学习内容。

## 业务价值

这是后续所有题型能力的基础。题型不能继续依赖
`options + selectedIndex + correctIndex`，但升级也不能破坏现有练习包、历史记录和
微练习。

## 范围

- 新增 V2 `questionsJson` 信封。
- 定义题组、四种 `responseType` 和带答案/脱敏题目联合类型。
- V1 数组只在内存中转换，不回写数据库。
- 所有任务详情、历史和提交读取都通过同一个兼容解析器。
- 保留现有内部 `qualityAudit`，前端响应继续脱敏。

## 验收条件

### AC1：读取旧选择题

**Given** 数据库保存的是 V1 题目数组
**When** 服务端读取任务或练习
**Then** 题目在内存中转换为 `schemaVersion: 2`
**And** 普通题转换为 `single_choice`
**And** 数据库原始 JSON 不被修改

### AC2：读取旧 TFNG

**Given** V1 题目的 `questionType` 为 `true_false_not_given`
**And** 选项是合法的 True/False/Not Given 或 Yes/No/Not Given
**When** 服务端转换题目
**Then** 正确索引被转换为对应的 `correctValue`

### AC3：旧伪匹配题保持原样

**Given** 历史题目是 `matching_headings` 或 `matching_information`
**When** 服务端转换题目
**Then** 它仍作为 `single_choice` 展示
**And** 不会被伪装成新的批量匹配题

### AC4：提交前答案脱敏

**Given** V2 题目包含 `correctIndex`、`correctValue`、`acceptedAnswers` 或
`qualityAudit`
**When** 任务详情、历史或 SSE 返回给学习者
**Then** 响应不包含这些字段

### AC5：单题异常隔离

**Given** 一套 V2 题目中有一题缺少合法答案
**When** 服务端规范化题目
**Then** 有效题被保留
**And** 无效题的 ID 和原因进入 `generationWarnings`

## 开发上下文

后端当前直接在 `ExerciseAgentService.submit()` 中
`JSON.parse(session.questionsJson)`，`parseQuestionsWithoutAnswers()` 也只接受
数组。必须统一替换，避免某条接口仍按旧数组读取。

### 新文件

- `src/interface/exercise-agent/exercise-question-contract.ts`
- `src/interface/exercise-agent/exercise-question-contract.spec.ts`

### 修改文件

- `src/interface/exercise-agent/exercise-agent.types.ts`
- `src/interface/exercise-agent/exercise-agent.service.ts`

## 任务清单

- [ ] 先为 V1 选择题、V1 TFNG、V2 文本题和无效单题编写失败测试。
- [ ] 定义 `ExerciseResponseType`、`ExerciseQuestionGroup` 和题目联合类型。
- [ ] 实现 `parseStoredQuestionEnvelope()`。
- [ ] 实现 `normalizeGeneratedQuestionEnvelope()`。
- [ ] 实现 `stripQuestionEnvelopeAnswers()`。
- [ ] 将提交、任务映射和 PDF 读取统一接入兼容解析器。
- [ ] 验证 `micro` 旧数组仍可读取。

## 测试

```bash
cd /Users/liulin/Desktop/font/english/nestjs
pnpm test --runInBand src/interface/exercise-agent/exercise-question-contract.spec.ts src/interface/exercise-agent/exercise-agent.service.spec.ts
pnpm build
```

## 开发护栏

- 不创建数据库迁移。
- 不批量重写历史 JSON。
- 不把旧 `summary_completion` 自动转换为文本题。
- 不把正确答案或质量审计字段发送到提交前的客户端。
- 不修改微练习的题目数量和选择题契约。

## 实施参考

- [设计规格：题目契约 V2](../../specs/2026-07-30-context-lab-mixed-ielts-question-types-design.md#题目契约-v2)
- [实施计划：Task 1](../../plans/2026-07-30-context-lab-mixed-ielts-question-types.md#task-1-s1---versioned-question-contract-and-v1-compatibility)

## 完成定义

- 所有 AC 有自动化测试。
- 后端构建通过。
- 旧任务详情和 V2 任务详情都能返回安全题目。
- 提交一个仅包含本 Story 文件范围的后端 commit。
