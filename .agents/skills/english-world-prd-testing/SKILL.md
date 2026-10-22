---
name: english-world-prd-testing
description: 对 English World 按统一 PRD 测试指定模块或全量，生成和维护 Case、补齐自动化、执行隔离测试、出具报告并分析失败。用于“测阅读”“按 PRD 验收”“全量回归”等请求；不用于仅整理 PRD 或默认修复产品代码。
---

# English World PRD 测试

## 入口与职责

仓库根为包含 `docs/prd/index.json`、`scripts/test-prd.mjs` 的 react-font。先读 `docs/testing/prd-testing.md`；模块 ID 和来源只从 PRD 索引解析，不另建一套分类。

优先使用真实后台入口 `pnpm test:prd:ai --module <模块>` 或 `--all`，默认 Cloud；控制台为 `pnpm test:prd:dashboard`。该入口实际调用非交互 Codex 生成 Case/脚本与分析，任务结果和生成源码在 test-results/ai/<id>/。等待任务结束并核实 job.json、result.json 和 Cloud 链接。普通 `test:prd` 仅执行固定脚本，下列手动流程用于人工调查/维护，不能将其冒充后台 AI。GitHub Actions 的 ai=true 需要安装 Codex CLI 并配置 API Key 的 self-hosted runner，ai=false 仍只重放脚本。

## 生成 Case 并执行

1. 将用户范围解析为模块或全量；不确定名字先用 `pnpm test:prd --list`。支持中文名/别名、逗号多选和 `--all`。
2. `pnpm test:prd --module <模块> --plan`（或 `--all --plan`）生成需求/Case/源码版本的冻结计划。读取该次 `plan.json` 的完整来源、每份 PRD、字段表、决策补充和设计参考，不能只看机械提取的 FR/AC。盘点提取器没识别的要求，将补充验收记录在相应正式 PRD 或明确的 Case 来源映射中；不擅改已确认规则。
3. `node scripts/prd-testing/prepare-cases.mjs` 只为缺少文件的功能生成初始候选，不覆盖已有 Case。逐项细化 `docs/testing/cases/<module>/<feature>.json`：具体数据、前置条件、步骤、全部预期、角色/端、清理。复合要求必须覆盖每个子条款；正常、异常、权限、并发、恢复按 PRD 分拆。保留稳定编号；`sourceHash` 由 `sourceBundleHash(await featureSources(root, feature.prd))` 计算，包含原 PRD 与决策/交互补充；不以修改 hash 代替需求复查。
4. 复用并检查现有 Cypress/Jest/Vitest 断言；缺脚本时补自动化。执行器目前接收 Cypress；其他层可作为补充证据，但不能填造 Cypress 测试结果。新增 spec 登记在 `docs/testing/suites.json`（只允许源码目录）。所有 Case 绑定精确的 suite ID 和完整测试名称，Cypress 标题层级用 ` > ` 连接。只有数据、步骤和全部断言确实覆盖后标 `status: ready`。无 binding 或 draft 必须保持未覆盖；mock 不能认证真实持久化或权限。
5. 重新生成计划检查覆盖、变更和映射，再执行 `pnpm test:prd --module <模块> --cloud` 或 `pnpm test:prd --all --cloud`。本项目已要求接入 Cloud，默认带 `--cloud`；只有用户明确仅本地执行时才省略。上传失败不能静默降级。凭据只在 `.env.cypress.local` 或进程环境，不进聊天、Case、Git 或报告。
6. 隔离环境使用兄弟目录 nestjs；非同级用 `E2E_BACKEND_DIR`。每个 spec 前受保护 seed 重置数据；后端先执行接口集成测试。不得连接生产、改 PRD 放宽预期，或修改现有业务来掩盖测试基础设施故障。

## 报告与 AI 分析

读取当前运行目录的 `analysis-input.json`、`plan.json`、`execution.json`、`execution/*.json`、日志和截图，结合失败断言附近的产品代码分析。首次失败不等于产品 bug；环境未启动不等于需求执行失败。

写同目录 `analysis.json`：`{ "runId": "本次ID", "findings": [{ "category": "product|test|environment|unknown", "conclusion": "有依据的判断或明确假设", "nextStep": "建议验证或修复", "evidence": ["相对运行目录的实际文件"] }] }`。同时写中文 `analysis.md`，说明范围、浏览器测试结果、PRD 覆盖缺口、失败预期/实际、证据、关联代码、置信度与下一步。每个执行失败及启动错误都需要分析；没有足够证据时用 unknown，不能靠关键词宣布根因。

运行 `pnpm test:prd --finalize test-results/prd/<run-id>` 更新 HTML；分析完成不会改变测试结果或消除覆盖缺口。需要修复并重跑时，保留首次失败运行，新建运行目录。

最终给出当前报告文件和 Cloud 运行链接，分别说明：执行是否完成、测试通过数、需求覆盖、待执行项、AI 分析结论。退出码 2 表示覆盖不完整；缺失 PRD 不算通过。不能把 188 条初始候选说成 188 条已实现自动化。
