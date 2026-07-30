---
story_id: S3
title: 真实 IELTS 题型生成与部分成功
status: ready-for-dev
depends_on:
  - S1
  - S2
repositories:
  - /Users/liulin/Desktop/font/english/nestjs
---

# S3 真实 IELTS 题型生成与部分成功

## 用户故事

作为准备 IELTS 的学习者，我希望生成的练习真正包含 TFNG、文本填空和简答，而
不是所有题型都伪装成选择题；即使少量题格式异常，我也希望先练已经可用的题。

## 业务价值

这是本次优化的核心价值，同时解决此前“AI 已经生成内容但被整套质量门禁判失败”
的问题。

## 范围

- 标准和粘贴文章生成使用 V2 JSON。
- 默认目标组合为 3 单选、3 TFNG、4 填空、3 简答。
- 文本答案必须来自文章。
- 无效单题定向修复一次。
- 有文章且至少一题有效时任务成功。
- Pack 级质量不足记录为警告，不再全部阻断。
- 微练习 Prompt、严格校验和修复保持原样。

## 验收条件

### AC1：真实题型组合

**Given** 用户生成标准完整练习
**When** AI 返回完整合法结果
**Then** 练习包含四种 `responseType`
**And** 目标题量为 13
**And** `summary_completion` 使用文本答案

### AC2：答案可定位

**Given** AI 返回填空或简答
**When** 服务端验证题目
**Then** `acceptedAnswers` 至少包含一个答案
**And** 答案可以从文章内容定位

### AC3：部分成功

**Given** 文章有效、11 题有效、2 题无效
**When** 一次定向修复后仍有无效题
**Then** 保存 11 道有效题
**And** 任务状态为 `succeeded`
**And** 响应包含无效题 ID 和原因

### AC4：真正失败

**Given** 文章为空或没有任何有效题
**When** 服务端处理生成结果
**Then** 任务状态为 `failed`
**And** 错误码明确区分 `ARTICLE_EMPTY` 或 `NO_VALID_QUESTIONS`

### AC5：粘贴自带题

**Given** 用户粘贴文章和支持的自带题
**When** 选择 `parse` 或 `auto`
**Then** 尽量保留题干和作答方式
**And** 用户提供答案标记为 `provided`
**And** AI 推断答案标记为 `ai_inferred`

### AC6：不生成伪 Matching

**Given** 新建练习
**When** AI 生成题目
**Then** 不生成 Matching Headings、Information 或 Features
**And** 不把这些题型转换成伪选择题

### AC7：微练习无回归

**Given** 用户发起 micro 修复
**When** 生成练习
**Then** 仍要求 120-180 词、3 道四选一题和目标词覆盖

## 修改文件

- `src/interface/exercise-agent/exercise-question-contract.ts`
- `src/interface/exercise-agent/dto/exercise-task.dto.ts`
- `src/interface/exercise-agent/exercise-agent.service.ts`
- `src/interface/exercise-agent/exercise-question-contract.spec.ts`
- `src/interface/exercise-agent/exercise-agent.service.spec.ts`

## 任务清单

- [ ] 为混合 Prompt、部分成功、零有效题和 micro 回归编写测试。
- [ ] 只替换 standard 和 pasted 生成 Prompt。
- [ ] 保留现有 IELTS band、target word、paraphrase 和质量审计要求。
- [ ] 将单题结构错误与 Pack 质量警告分开。
- [ ] 实现一次只修复无效题的 AI 请求。
- [ ] 合并修复结果并再次按单题规范化。
- [ ] standard 和 pasted 保存 V2，micro 继续保存旧数组。
- [ ] 将警告和实际题数暴露给任务映射。

## 测试

```bash
cd /Users/liulin/Desktop/font/english/nestjs
pnpm test --runInBand src/interface/exercise-agent/exercise-question-contract.spec.ts src/interface/exercise-agent/exercise-agent.service.spec.ts
pnpm build
```

## 开发护栏

- 最多进行一次定向修复，避免无限调用模型。
- 修复不能改写文章或已经有效的题。
- 质量审计不足可以警告，但不能伪造缺失答案。
- 文章为空和零有效题仍必须失败。
- 不删除现有 IELTS 难度校准，只改变其阻断级别。

## 实施参考

- [设计规格：生成题型组合](../../specs/2026-07-30-context-lab-mixed-ielts-question-types-design.md#生成题型组合)
- [设计规格：部分成功策略](../../specs/2026-07-30-context-lab-mixed-ielts-question-types-design.md#部分成功策略)
- [实施计划：Task 3](../../plans/2026-07-30-context-lab-mixed-ielts-question-types.md#task-3-s3---authentic-generation-and-partial-success)

## 完成定义

- 完整、部分成功、完全失败和 micro 四条路径均有测试。
- 任务保存内容是可被 S1 解析的 V2 信封。
- 日志可以定位无效题原因。
- 提交一个独立后端 commit。
