# Context Lab 混合 IELTS 题型 Stories

状态：`ready-for-dev`

## 输入文档

- [设计规格](../../specs/2026-07-30-context-lab-mixed-ielts-question-types-design.md)
- [实施计划](../../plans/2026-07-30-context-lab-mixed-ielts-question-types.md)

## Story 列表

| ID | Story | 状态 | 依赖 |
|---|---|---|---|
| S1 | [版本化题目契约与旧数据兼容](./S1-versioned-question-contract.md) | ready-for-dev | 无 |
| S2 | [混合答案提交与确定性评分](./S2-deterministic-grading.md) | ready-for-dev | S1 |
| S3 | [真实 IELTS 题型生成与部分成功](./S3-authentic-generation.md) | ready-for-dev | S1、S2 |
| S4 | [历史记录、结果与混合题型 PDF](./S4-history-results-pdf.md) | ready-for-dev | S1-S3 |
| S5 | [前端统一答案契约与本地草稿](./S5-frontend-answer-contract.md) | ready-for-dev | S4 |
| S6 | [桌面端混合题型练习体验](./S6-desktop-mixed-practice.md) | ready-for-dev | S5 |
| S7 | [移动端混合题型练习体验](./S7-mobile-mixed-practice.md) | ready-for-dev | S5 |
| S8 | [跨仓库回归与浏览器验收](./S8-cross-repo-acceptance.md) | ready-for-dev | S1-S7 |

## 推荐执行顺序

```text
S1 -> S2 -> S3 -> S4 -> S5 -> S6 -> S7 -> S8
```

S6 和 S7 在 S5 完成后可以并行开发。每个 Story 完成后先运行自身测试并提交，
再进入下一项。

## 共同技术上下文

- 前端：React 18.3.1、TypeScript 5.7.2、Ant Design 5.27.4、
  Ant Design Mobile 5.37.0、Vitest 4、Cypress 15。
- 后端：NestJS 10、TypeScript 5.1、Sequelize 6、class-validator 0.14、
  Jest 29。
- 保留现有 `/context-lab/*` API 路由、异步任务、SSE、Attempt、删除和 PDF
  接口。
- 继续使用 `article_exercise.questions_json`、
  `article_exercise_task.questions_json`、`answers_json` 和 `results_json`
  文本字段，不增加数据库表或列。
- 后端 `ExerciseAgentService` 已经承担生成、任务、提交、历史和 PDF；新契约与
  评分逻辑应提取成小模块，其他行为继续由该服务编排。
- 前端桌面使用 Ant Design，移动端使用 Ant Design Mobile；两端共享纯答案
  辅助函数，不共享依赖具体组件库的输入组件。

## 全局完成标准

- 完整练习支持单选、TFNG、文本填空和简答。
- 微练习继续保持三道四选一题。
- 旧练习和旧提交记录无需迁移即可打开、提交和复盘。
- 正确答案在提交前不会出现在前端接口中。
- 文本答案由后端确定性评分，AI 不能覆盖正误结果。
- 有文章且至少一题有效时允许开始练习，并显示实际题数和生成警告。
- 桌面端、移动端、历史记录和 PDF 使用同一套题型语义。
- 前后端测试、构建及四个目标视口的浏览器验收全部通过。
