# 前后端本地自动化测试

首期覆盖真实登录、单词导入冲突确认、今日复习提交与结果恢复。Cypress 使用真实 NestJS API 和 MySQL；外部 AI 使用后端本地 HTTP 替身。现有 Vitest 和模拟接口 Cypress 测试继续保留。

## 一次准备

需要 Node.js 22.12+、pnpm 10.8.1、运行中的 Docker（含 Compose v2），两个仓库均需包含本次测试入口。

```text
english/
  react-font/
  nestjs/
```

在两个仓库分别执行 `pnpm install --frozen-lockfile`。在前端仓库安装浏览器测试运行时：

```sh
pnpm --filter @font/english-world exec cypress install
```

## 执行

以下命令均从 `react-font` 仓库根目录执行：

```sh
# 前后端联合测试：启动临时数据库 → 后端接口测试 → 启动前后端 → Cypress → 清理
node scripts/test-local.mjs

# 后端不在同级目录时
E2E_BACKEND_DIR=/absolute/path/to/nestjs node scripts/test-local.mjs

# 现有前端单元／组件测试
pnpm --filter @font/english-world exec vitest run

# 现有模拟接口页面测试
pnpm e2e:english-world
```

若只运行后端接口集成测试，进入 `nestjs` 仓库执行 `node scripts/test-local.mjs`。

## 查看报告

| 输出 | 路径（相对于前端仓库） |
|---|---|
| 浏览器 HTML 报告 | `apps/english-world/cypress/reports/integration/html/index.html` |
| 失败截图 | `apps/english-world/cypress/reports/integration/screenshots/` |
| 后端启动与接口测试日志 | `apps/english-world/cypress/reports/integration/backend.log` |
| 前端服务日志 | `apps/english-world/cypress/reports/integration/frontend.log` |
| 两仓库提交 SHA 与 dirty 状态 | `apps/english-world/cypress/reports/integration/revisions.json` |

后端机器可读结果位于 `nestjs/test/reports/integration.json`。失败返回非零退出码。报告是本地产物，不提交到 GitHub。

测试使用回环端口 `13316`（MySQL）、`13317`（NestJS）、`13318`（Vite）。全机一次只运行一套，后端使用系统临时目录下 `english-world-automation.lock` 防止多个工作区并发重置同一数据库。

端口被占用时先结束旧测试。测试失败优先看 `backend.log`／`frontend.log`。正常退出或 Ctrl+C 会清理；强杀后若残留，确认没有测试进程，再在后端仓库执行 `docker compose -p english-world-automation -f test/integration/compose.yml down --volumes`，并清理系统临时目录中的遗留锁。

## 文档

- [架构与设计取舍](architecture.md)
- [测试用例](cases.md)

本期只增加本地测试能力，没有修改 GitHub Actions 或部署行为。
