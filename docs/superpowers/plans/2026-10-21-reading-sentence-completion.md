---
title: 阅读练习原生句子填空
type: feature
created: 2026-10-21
status: done
baseline_commit: a6c03965bcb12f26b66598cf3bc51ed74eabad87
---

## Intent

用户确认截图中的句子空位需要可填写。贯通材料导入、管理员审核与答案维护、学生填写、保存、提交、判分和结果。正式需求为 [sentence-completion PRD](../../prd/reading/features/sentence-completion/prd.md)。

## Boundaries & Constraints

保留已有未提交改动，不重写历史试卷或答卷。继续复用现有 JSON 内容与答案存储。不提交、推送或部署。用户第二张截图确认本轮实施形式，不再重复询问同一范围。

## Code Map

- `nestjs/src/interface/reading-practice/`：导入、草稿规范化、审核、公开内容、答案及评分、纠错和统计。
- `react-font/apps/admin/src/ReadingPracticeWorkbench.tsx`：审核与编辑、预览及更正。
- `react-font/apps/admin/src/ReadingQuestionReadout.tsx`：答案与解析展示。
- `react-font/apps/english-world/src/readingPractice/`：学生工作区、答题、保存恢复及结果。

## Tasks & Acceptance

- [x] 后端支持 sentence_completion、acceptedAnswers、maxWords、answerText，并保留 selectedIndex 兼容。
- [x] 管理端可编辑、核对、预览和更正填空答案。
- [x] 学生端空位可输入，支持草稿和提交后回看。
- [x] 聚焦测试覆盖空白/超限/错误答案、答案保密、混合题型、已有题型回归；构建检查。
- [x] 正式 PRD 及索引登记。

Given 截图中的填空材料，when 导入并审核发布，then 学生可直接填写句子空位并提交。
Given 未提供正确答案，when 核对或发布，then 阻止并提示补全。
Given 混合选择与填空，when 保存恢复及提交，then 两类答案均保留并按各自规则判分。

## Verification

2026-10-21 本地验证：

- 后端相关 6 套 59 项通过：`reading-practice.contract`、`reading-workflow.contract`、`reading-sentence-completion`、`reading-workflow.service`、`reading-workflow-ai`、`reading-practice-generator`。
- 独立 MySQL + Nest HTTP 集成 3 项通过：真实导入任务（外部AI仅fixture）/保存编辑/检查审核/混合发布/答案保密/提交幂等/持久化/老师纠错重评/统计，空白与超词数拒绝、缺答案阻止审核。
- 管理端组件 12 项通过，学生工作区/填空组件/既有考试回归 21 项通过；子任务另有既有大阅读页 66 项回归通过。
- Cypress 桌面1440px和手机390px 2 项通过，验证输入、刷新恢复、提交和结果；使用接口 fixture，不代表真实 AI 或服务验收。
- 管理端和学生端生产构建通过，只有打包体积提醒；测试存在既有 jsdom getComputedStyle 提醒。
- TypeScript 及 diff 格式检查通过。
- 真实图片/PDF供应商识别、生产部署均未执行。没有进行全量 PRD Cloud 验收。

## 审查与整改

- 审查补强：拒绝把 null/对象/数字等非文本值转换为标准答案，阻止多空句子作为单空题发布；缺答案仍可保存草稿。
- 真实数据库暴露同请求重复提交因 MySQL JSON 字段顺序误判，已规范化存储答案后比较，并通过 HTTP 重放验证。
- 独立审查发现额外 ContextLab 填空界面尚无匹配后端契约，移除该分支，本轮仅支持管理端发布的阅读练习。
- 保留此前未提交工作；无数据库 schema 迁移，无提交/推送/部署。

## 最终范围

独立三路检查后已移除本轮对独立 ContextLab/IELTS 出题服务的填空扩展，保留此前该模块未提交的其他改动；本轮可填写与真实服务贯通的是管理员发布给学生的阅读练习。

## 生产发布

用户明确授权“发布”，于2026-10-21 17:58:58 CST完成。最新生产源码仅合并21源文件，后端55、管理12、学生9发布副本测试及三构建通过。151容器资源/36公网资源校验、真实鉴权只读接口及数据摘要一致；详情与回滚见工作区 docs/reading-sentence-completion/README.md。无数据库迁移，无真实练习自动转换或向学生发布。
