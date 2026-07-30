---
story_id: S2
title: 混合答案提交与确定性评分
status: ready-for-dev
depends_on:
  - S1
repositories:
  - /Users/liulin/Desktop/font/english/nestjs
---

# S2 混合答案提交与确定性评分

## 用户故事

作为学习者，我希望选择、TFNG、填空和简答都能被稳定评分，以便相同答案每次
提交都得到相同结果，并能清楚知道错误原因。

## 业务价值

当前提交接口只接受 `selectedIndex`。本 Story 将评分从 AI 解析中分离，防止模型
格式异常或解释失败影响用户成绩。

## 范围

- 提交 DTO 接受四类答案，并继续兼容旧 `selectedIndex`。
- 后端根据已保存题目决定答案类型，不信任客户端自报类型。
- 文本答案使用固定规则评分。
- 未作答题进入结果并按错误计分。
- AI 仅生成解析，失败时使用本地降级文案。
- 原答案和结果继续写入现有 JSON 字段。

## 验收条件

### AC1：四种答案评分

**Given** 一套练习包含四种 `responseType`
**When** 用户提交合法的混合答案
**Then** 服务端为每题返回确定的 `correct` 和 `status`
**And** 结果包含用户答案与正确答案

### AC2：文本规范化

**Given** 正确答案为 `solar panels`
**When** 用户提交 `  SOLAR   PANELS. `
**Then** 答案判定为正确

### AC3：限词错误

**Given** 题目要求最多一个词
**When** 用户提交两个词
**Then** 结果为 `incorrect`
**And** `reasonCode` 为 `word_limit_exceeded`

### AC4：未作答

**Given** 用户省略一道题
**When** 提交练习
**Then** 该题结果为 `unanswered`
**And** 分数分母仍包含该题

### AC5：拒绝非法载荷

**Given** 用户提交重复题目 ID、未知题目 ID 或与题型不匹配的答案字段
**When** 服务端校验
**Then** 返回包含具体 `questionId` 的 400
**And** 不保存 Attempt

### AC6：解释失败不影响成绩

**Given** 确定性评分已经完成
**And** AI 解析请求失败
**When** 服务端返回结果
**Then** 正误和分数保持不变
**And** Attempt 仍被保存

## 开发上下文

### 新文件

- `src/interface/exercise-agent/exercise-answer-grader.ts`
- `src/interface/exercise-agent/exercise-answer-grader.spec.ts`

### 修改文件

- `src/interface/exercise-agent/dto/submit-exercise.dto.ts`
- `src/interface/exercise-agent/exercise-agent.types.ts`
- `src/interface/exercise-agent/exercise-agent.service.ts`
- `src/interface/exercise-agent/exercise-agent.service.spec.ts`
- `src/interface/context-lab/context-lab.service.spec.ts`

## 评分规则

1. Unicode NFKC。
2. 去除首尾空格。
3. 连续空格折叠为一个。
4. 忽略英文大小写。
5. 去除末尾 `. , ; : ! ?`。
6. 按空白计算词数；连字符词和数字单位组合各算一个词。
7. 与 `acceptedAnswers` 规范化后精确匹配。

不会自动修复拼写、冠词、单复数或词序。

## 任务清单

- [ ] 编写四类评分、限词、未作答和非法载荷的失败测试。
- [ ] 实现 `normalizeTextAnswer()` 和 `countAnswerWords()`。
- [ ] 实现 `gradeExerciseAnswers()`。
- [ ] 扩展提交 DTO，并保留旧选择题请求兼容。
- [ ] 使用实际结果数量计算分数。
- [ ] 重构解析 Prompt，使其消费已评分结果。
- [ ] 保持微练习薄弱词归因和学习事件逻辑不变。

## 测试

```bash
cd /Users/liulin/Desktop/font/english/nestjs
pnpm test --runInBand src/interface/exercise-agent/exercise-answer-grader.spec.ts src/interface/exercise-agent/exercise-agent.service.spec.ts src/interface/context-lab/context-lab.service.spec.ts
pnpm build
```

## 开发护栏

- AI 返回内容不能覆盖 `correct`。
- 客户端 `responseType` 只用于诊断，题库中的类型才是权威。
- 文本字段最大长度 200，避免异常大载荷。
- 重复提交继续生成独立 Attempt，不覆盖历史。

## 实施参考

- [设计规格：确定性文本判分](../../specs/2026-07-30-context-lab-mixed-ielts-question-types-design.md#确定性文本判分)
- [实施计划：Task 2](../../plans/2026-07-30-context-lab-mixed-ielts-question-types.md#task-2-s2---mixed-submit-dto-and-deterministic-grading)

## 完成定义

- AC1-AC6 全部有测试。
- 旧选择题和微练习提交测试保持通过。
- AI 解析失败测试证明成绩和持久化不受影响。
- 提交一个独立后端 commit。
