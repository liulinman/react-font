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
