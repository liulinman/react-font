# 项目定位与影响映射

以下路径除标注外均相对 `react-font/`。先读当前文件，目录可能随项目演进。

## 文档源与入口

- 站点：`apps/docs/`；正文：`content/`；主题与配置：`.vitepress/`；导航：`site-map.json`。
- 首页：`content/index.md`；公开更新：`content/reference/changelog.md`。
- 源码精选：`apps/docs/snippets/`，`sources.json`记录来源、Git版本和片段摘要。
- 正式文档站PRD：`docs/prd/settings/features/technical-docs/prd.md`，入口索引：`docs/prd/index.json`。
- 桌面入口：`apps/english-world/src/page/englishWorld/component/EnglishHeader.tsx`；手机入口：`src/page/englishWorldMobile/MobileMorePage.tsx`（相对应用）。

## 从变化找文章

| 变化 | 优先核对的 content 路径 | 代码定位线索 |
|---|---|---|
| 项目能力、开发依赖与启动 | `start/overview.md`、`start/local-development.md` | package脚本、env模板、代理和测试环境 |
| MCP工具、认证、作用域和参数 | `mcp/connection.md`、`mcp/query-words.md`、`reference/tools.md`、`reference/configuration.md` | `nestjs/src/interface/mcp-access/` |
| 新增、覆盖、删除、幂等 | `mcp/write-workflow.md`、`backend/transactions-idempotency.md`、`backend/retry-example.md` | mcp.service、安全覆盖实现、实际事务边界 |
| 客户端接入 | `mcp/clients.md`、`mcp/concepts.md` | 实际连接配置与官方协议/客户端资料，不复制本机密钥 |
| AI生成、校验、词形、供应商限制 | `ai/listening-flow.md`、`ai/deepseek.md`、`ai/word-to-question.md`、`reference/configuration.md` | 当前AI服务与场景听力实现，按服务商区分 |
| 音源、双人对话、播放 | `ai/doubao.md`、`frontend/playback-and-secret.md` | TTS适配、播放器事件、竞态与加载状态 |
| 数据分页、账号隔离、请求链 | `backend/database-isolation.md`、`backend/nestjs-request.md`、`frontend/requests.md` | Controller/Guard/Service/ORM与接口契约 |
| React状态、授权弹窗与反馈 | `frontend/react-state.md`、`frontend/requests.md`、`frontend/playback-and-secret.md` | 页面状态、McpAccessCard、错误处理 |
| 镜像、TLS、发布、缓存、PWA | `deploy/docker-nginx.md`、`deploy/https.md`、`deploy/release-rollback.md`、`deploy/stale-page.md` | Dockerfiles、CI、Nginx、SW与更新提示 |

关键词搜索示例：在工作区运行 `rg -n 'query_words|limit|默认' react-font/apps/docs/content react-font/apps/docs/snippets`。区分工具schema的范围、service默认值与显式调用参数；不要只改工具参考漏掉教程代码和返回示例。

## 已有命令及限制

在 react-font 执行：

```sh
pnpm docs:check
pnpm docs:build
pnpm docs:preview
```

- `scripts/check-docs.mjs`核对目录正文数量、结构与部分敏感模式；固定25篇是当前实现，正则不是完整秘密检测。构建负责检测内部死链。
- `pnpm docs:sync-code`调用 `scripts/sync-docs-code.mjs`，当前只提取 query_words 定义和处理器两份片段；先读实际脚本，不能假设覆盖更新代码也已自动引用。CI使用提交的片段，不读取兄弟后端仓库。
- `scripts/test-docs-site.mjs`及`apps/docs/tests/`提供5项真实站点冒烟。默认先启动4174文档预览；`DOCS_TEST_URL`可指向获准验证的站点。
- **目前测试输出和截图路径硬编码到工作区 `docs/technical-docs-20261026/`**。重跑前备份历史证据，或为当次运行调整/参数化输出位置，避免把旧证据覆盖成新结果。既有5项不自动覆盖所有新增功能。
- `python3 scripts/test-install-docs-nginx.py`验证增量合并；`git diff --check`只检查差异格式。

## 发布注意事项

当前站点部署于平台同源 `/docs/`，实际地址从当前配置确认。改链接或根路径需同步VitePress base、静态资源、平台原生链接、Nginx与PWA排除规则；链接不能交给平台React路由。

构建产物是 `apps/docs/dist/`，由两份Dockerfile和 `.github/workflows/deploy.yml`携带。内部PRD和历史交付目录不进入公开站点。

生产Nginx包含HTTPS和ACME；使用 `scripts/install-docs-nginx.py`增量合并，先校验候选，不能用仓库HTTP模板覆盖线上完整配置。授权发布时读取最新部署信息，保留后端、管理端、证书挂载/续期与业务数据，并保存即时配置和镜像回滚依据；不要复制过去交付脚本的固定imageID。

发布后核对首页、受影响深链刷新、资源和未知页404；涉及搜索时检索实际词条。平台旧Service Worker可能仍缓存旧侧栏：线上静态文件200不证明用户当前页已更新。检查实际加载资源/worker状态，沿用可见的手动更新流程，不能强制中断学习或清除用户存储来掩盖缓存问题。
