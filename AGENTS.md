# 项目需求文档

- 产品需求唯一入口为 `docs/prd/README.md`，模块和功能映射见 `docs/prd/index.json`。
- 开发、评审或根据 PRD 生成测试前，先读对应模块的 `docs/prd/<module>/prd.md` 及其列出的正式需求、决策补充。
- 新增或修改 PRD 只在 `docs/prd/` 内维护，并更新模块入口和索引。旧 `docs/superpowers/prds/` 与工作区交付目录内的 `prd.md` 仅作迁移跳转，不再维护正文。
- 不把局部功能 PRD 当作整个模块的完整基线。缺少 PRD 的模块必须明确记录需求缺口，不根据代码或测试反推并宣称已确认需求。
- 引用需求时使用模块/功能/原编号，例如 `reading/add-recipients/AC-01`；保留原始 FR/AC 编号。
- 设计、架构、实施计划、交付记录和测试证据各归原目录，通过链接关联正式 PRD；历史源码快照不作为当前需求。

## PRD 自动化验收

- 用户要求指定模块测试、全量验收或按 PRD 出具结果时，使用 `.agents/skills/english-world-prd-testing/SKILL.md`，持续完成 Case、执行、报告与 AI 分析。
- 执行入口 `pnpm test:prd --module <模块>` 或 `--all`；Cloud 加 `--cloud`。使用前读取 `docs/testing/prd-testing.md`。
- 初始 Case 候选不代表已自动化；不得把缺少 PRD、未实现 Case、mock 或跳过测试计为真实验收通过。

## 功能与技术文档同步

- 功能、API、AI/MCP、配置、交互或部署变更，收尾时使用 `.agents/skills/english-world-docs-maintenance/SKILL.md` 核对影响并同步 `apps/docs/` 公开技术文档；没有文档影响时说明理由。维护知识、实现、实例及验证口径，发布沿用任务授权。

## PRD 写作与完整研发流程

- 单独创建、修改、审核或整理 PRD 使用 `.agents/skills/english-world-prd/SKILL.md`，完成需求阶段后停止。
- 完整需求交付使用项目内 `.agents/skills/english-world-delivery/SKILL.md`；其 PRD 阶段调用同一项目 PRD skill，不维护第二套正文规则。
- 整理必须核对原正文、补充和决策的逐条对应，保留原 FR/AC；冲突和缺口不得默默删除或凭实现补成已确认需求。

## 当前研发端范围

后续研发默认仅覆盖电脑端学生端与管理端，不包含移动端；只有用户明确重新纳入时才增加移动端需求、设计、实现和验收。历史移动端条款保留来源并标注不在当前研发范围，不静默删除，也不作为当前交付的必验项。
