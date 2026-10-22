# 后台 AI 测试入口

运行 `pnpm test:prd:dashboard`，打开 http://127.0.0.1:4319，选择模块或全量后开始。任务串行执行，刷新页面不会停止任务；关闭服务会中断队列调度，重启后遗留任务标为 interrupted，避免重复执行。

也可直接运行 `pnpm test:prd:ai --module notes`、`pnpm test:prd:ai --module reading,notes` 或 `pnpm test:prd:ai --all`。默认记录 Cypress Cloud；明确仅本地使用 `--local-only`。前提：Docker、已安装依赖、Codex CLI 已安装、API Key 已配置、Cloud 凭据已配置。本地控制台仅监听回环地址。

后台分为生成和分析两个真实 AI 阶段：先读取统一 PRD 和产品实现，生成具体 Case 与脚本；父进程校验允许路径、已有 Case/套件保留和计划映射后，在任务副本执行真实测试；再让 AI 只读本次证据，生成失败分类、证据引用和中文分析。DeepSeek 直接使用限时 Responses API 单次推理，不启动自主 shell 循环；每个生成/分析阶段最多4分钟，输出不完整会明确失败。OpenAI 模式使用独立 Codex API provider。均不读取 ChatGPT 登录：`PRD_AI_PROVIDER=deepseek` 使用 `DEEPSEEK_API_KEY`，默认 `deepseek-flash`；`openai` 使用 `OPENAI_API_KEY`，模型可由 `PRD_AI_MODEL` 指定。`PRD_AI_BASE_URL` 可配置支持 Responses 的 HTTPS 网关。不加载用户 config.toml 中与测试无关的 MCP/模型覆盖。


本机专用 `.env.prd-ai.local` 仅加载 `PRD_AI_PROVIDER`、`PRD_AI_MODEL`、`PRD_AI_BASE_URL`、`DEEPSEEK_API_KEY`、`OPENAI_API_KEY`，进程环境优先；文件被 Git 忽略、权限 600，不读业务 `.env`。API Key 仅作为认证环境变量传给 AI 请求/子进程，不放入命令参数/任务快照/报告；测试服务与 Cypress 不继承 API Key。更换密钥编辑该本地文件并重启控制台即可。不要把密钥发到聊天或提交仓库。

每次任务保存在 `test-results/ai/<id>/`：`job.json` 阶段状态、`generate-output.json` 生成文件、`workspace/` 隔离源码副本、`plan.json` 冻结计划、`execution.json` 真实结果、`analysis.json/md`、`report.html`。生成内容不自动覆盖当前工作区，验证有效后再人工/由 Codex 整理合入。AI 不修改产品代码、PRD 或既有 suite 证据等级。模型失败、格式错误、环境阻塞、分析失败都会保留任务错误；已有执行报告保留待分析状态。后台执行不意味着需求全覆盖，缺失基线和 draft 仍然未完成。

GitHub 手动工作流选择 `ai=true` 才调用后台 AI，需要预先配置 **self-hosted runner**，安装 Docker/CLI，在 Secrets 配置 `DEEPSEEK_API_KEY`（或 `OPENAI_API_KEY`），Variables 配置 `PRD_AI_PROVIDER`/`PRD_AI_MODEL`。`ai=false` 保留普通脚本重放。工作流尚需推送仓库并配置 Secrets/runner 后才能远程使用。

> 2026-10-20 已切换独立 API provider，DeepSeek 真实推理和只读工具调用通过，21 项离线校验通过。完整后台端到端结果以具体任务报告为准，不能用连接探测代替 PRD 验收。

---

# 按 PRD 测试模块与全量

在 Codex 中直接说“按 PRD 测阅读并记录 Cloud”“测词库和复习”或“全量验收并分析失败”。项目技能 [english-world-prd-testing](../../.agents/skills/english-world-prd-testing/SKILL.md) 会读取统一 PRD、维护 Case 与脚本、执行并分析证据。AI 使用当前 Codex 会话，无需另配模型密钥。

## 本地执行入口

```sh
pnpm test:prd --list
pnpm test:prd --module 阅读 --plan
pnpm test:prd --module vocabulary,review --cloud
pnpm test:prd --all --cloud
```

`--plan` 不启动服务、不上传 Cloud，生成冻结计划与覆盖报告。执行命令运行已生成的自动化；AI 的需求理解、补脚本和根因分析由 Codex 完成。单独在终端或 Actions 运行不会自动启动另一个 AI。

要求 Node 22.12+、pnpm 10.8.1、Docker Compose v2；前后端均执行 `pnpm install --frozen-lockfile`，前端执行 `pnpm --filter @font/english-world exec cypress install`。默认两个仓库同级；否则设置 `E2E_BACKEND_DIR`。测试独占回环端口 13316/13317/13318/5176，复用后端全机测试锁。端口占用时拒绝启动，不关闭已有服务。

执行器创建一次性 MySQL，先执行所选模块相关的后端基础/接口检查（全量运行全部接口集成测试），再启动 API、前台和管理端；每个 spec 前重置数据，结束后清理。外部 AI 使用后端本地替身，不消耗真实 AI，也不证明真实 AI 服务质量。不得将测试配置改为生产地址。

## Case 与覆盖

- 需求来源：[统一 PRD 索引](../prd/README.md)、[机器索引](../prd/index.json)。
- Case：`docs/testing/cases/<module>/<feature>.json`；保留原需求编号并附命名空间。
- 脚本目录：[suites.json](suites.json)；跨模块测试按 suite ID 去重。
- `node scripts/prd-testing/prepare-cases.mjs` 只生成缺少文件的初始候选；不会自动审查、实现脚本或覆盖已有 Case。
- PRD 有修改后旧 Case 显示过期，由 AI 对照原文更新；不能仅更新 hash 消除提示。
- `status: draft`、缺绑定、测试名不匹配、跳过、mock、无运行结果均不能算真实 PRD 验收通过。测试全绿和需求全覆盖分别展示。
- 模块 `baselineStatus` 仅在真正盘点全部需求且确认完整后改为 `complete`；当前 PRD 索引已显式保留缺口。

## Cloud

项目 ID 是非秘密配置，当前 English World 私有项目为 [hajrxe](https://cloud.cypress.io/projects/hajrxe/runs)，登记在 `apps/english-world/cypress.cloud.json`；Record Key 是秘密。Cypress 配置支持 `CYPRESS_PROJECT_ID` 覆盖，执行器优先读进程环境，其次只读被 Git 忽略的 `.env.cypress.local`，最后使用已登记的项目 ID（不读任何生产 env）。本地文件权限建议 600：

```text
CYPRESS_PROJECT_ID=<Cloud 项目 ID>
CYPRESS_RECORD_KEY=<项目设置中的 Record Key>
```

执行时加 `--cloud`。所选 spec 在同一次 Cypress 调用中执行，使用一个 group 和 build ID；每个 spec 开始前通过 before:spec 重置测试库；报告仅在 Cypress 返回 run URL 后显示上传确认。缺凭据、上传失败都生成失败报告，不能静默当成本地成功。Record Key 不写入命令参数或 Git；日志按已知密钥和凭据字段脱敏。截图和 Test Replay 会记录测试页面，请只使用隔离测试账号和数据。

## GitHub Actions

[PRD 模块测试工作流](../../.github/workflows/prd-tests.yml) 支持手动输入模块 ID（逗号多选）或 `all`，以及后端 ref；不会触发部署。请设置 Actions Secret `CYPRESS_RECORD_KEY` 和 Variable `CYPRESS_PROJECT_ID`。私有后端仓库还需有只读该仓库权限的 `E2E_BACKEND_TOKEN`；默认 GitHub token 通常不能读取另一个私有仓库。

工作流只重放提交到所选 ref 的 Case/脚本，保存报告待 Codex 分析。未提交的本地 PRD 和脚本不会出现在远程运行。Cloud 只保存浏览器测试数据；完整 PRD 覆盖报告在 Actions artifacts 中。没有后台 AI 服务时不能承诺网页点一次就自动生成新脚本并分析代码。

## 报告与分析

运行目录：`test-results/prd/<run-id>/`，已被 Git 忽略。包括需求/Case 快照、前后端版本与 dirty 标记、执行日志、逐条 Cypress 结果、截图、`report.html`、`result.json` 和 `analysis-input.json`。

Codex 调查后写 `analysis.md` 和带证据的 `analysis.json`，再运行：

```sh
pnpm test:prd --finalize test-results/prd/<run-id>
```

退出码：`0`=验收通过（或计划生成完成），`1`=测试/环境/上传失败，`2`=验收覆盖不完整。AI 分析是否完成单列；不得将待分析报告说成已定位根因。中断也尽量保留报告；如果强杀导致 Docker 残留，先确认没有活跃测试，再按现有 [本地测试说明](README.md) 清理。

生成阶段即使失败，也保留错误报告（不补造测试结果）。`--generated-from <test-results/ai 内的运行 ID>` 用于恢复经复核的 `generate-repaired.json`，复用前检查 PRD 来源完全相同，重新隔离执行，保留首次失败。
