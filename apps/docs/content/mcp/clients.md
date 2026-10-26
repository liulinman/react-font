# 实例：接入 Codex 与排错

## 准备已有连接信息

本例演示把 English World 的远程 MCP 服务接入 Codex。前提是已经安装支持 Streamable HTTP 的 Codex，并持有自己测试账号的有效只读授权。本文不会自动创建授权、调用付费模型或修改词库。先从平台设置中的 MCP 授权管理确认连接地址，不要使用平台首页地址，也不要把平台登录 Cookie 填进 Bearer 字段。

[Codex 官方 MCP 文档](https://developers.openai.com/codex/mcp)说明了 HTTP 服务的 URL 与凭据配置。以下配置使用环境变量保存 Bearer 密钥，变量名是本文约定，配置中的值是变量名称，而不是密钥本身。

```toml
[mcp_servers.english_world]
url = "https://your-host.example/api/mcp"
bearer_token_env_var = "ENGLISH_WORLD_MCP_TOKEN"
```

在启动 Codex 的终端环境中，先设置测试凭据。下面的字符串仅为占位符，实际执行前需要在本机替换，不能把真实值提交到仓库或贴进排错截图。

```sh
export ENGLISH_WORLD_MCP_TOKEN='TOKEN_PLACEHOLDER'
codex mcp list
```

环境变量必须对运行 Codex 的进程可见。终端设置并不会自动传给已经启动的桌面进程；如配置正确却仍收到 401，应核对客户端的启动环境。不同客户端配置语法不同，平台卡片的通用 JSON 示例不能直接当作 Codex 的 TOML 配置。

## 最小只读验证

重载连接后，确认客户端发现 `query_words`，再要求：“查询我的词库，关键词 learn，最多五条，只读，不修改。”预期参数是 `keyword: "learn"`、`limit: 5`、`offset: 0`。预期业务结果为包含 `items`、`total`、`limit`、`offset` 的对象；空列表是合法结果，不代表连接失败。

后端工具登记位于 `src/interface/mcp-access/mcp.controller.ts`，权限和查询位于 `mcp.service.ts`。前端的连接信息来自 `apps/english-world/src/page/englishWorld/component/McpAccessCard.tsx`。核对这些入口，可以区分“配置未加载”和“服务拒绝查询”，避免仅凭助手文字判断执行状态。

## 按证据逐层排查

无法建立连接时，先核对域名解析、HTTPS 证书和 `/api/mcp` 路径。401 表示 Bearer 缺失、格式不正确、过期或撤销；403 可能来自来源验证，而工具结果中的 `forbidden` 表示缺少业务权限，两者不是同一错误。当前服务对 GET 返回 405，浏览器打开地址看到这个结果不等于 POST 工具调用不可用。

发现工具却调用失败时，检查整数范围与字段拼写，尤其不要传 `pageSize` 替代 `limit`。本项目使用手动 Bearer 授权，不能通过尝试 OAuth 登录来修复服务未实现的认证流程。排错记录只保留时间、工具名、HTTP 状态和脱敏错误码；不要包含密钥、真实词条正文或用户身份。本文是配置实例，实际客户端版本与测试结果需要在自己的环境记录。
