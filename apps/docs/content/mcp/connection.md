# MCP 如何连接 AI 和业务

## 一次连接经过哪些边界

English World 把 MCP 服务放在与平台业务相连的 HTTP 入口，公开示例为 `https://your-host.example/api/mcp`。客户端通过网络发送 MCP 消息，后端将工具调用转到词库服务。它不是把整个数据库交给 AI，也不是让浏览器登录 Cookie 自动成为外部客户端的授权。

[MCP 传输规范](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports)定义消息如何通过 Streamable HTTP 传输；本项目选择无会话模式和 JSON 响应。后端 `src/interface/mcp-access/mcp.controller.ts` 创建 `StreamableHTTPServerTransport`，设置 `sessionIdGenerator: undefined` 与 `enableJsonResponse: true`。当前控制器仅接受 POST，其他方法返回 405；不要用浏览器 GET 的结果判定整个服务失效。

## 平台登录与客户端授权

前端仓库 `apps/english-world/src/page/englishWorld/component/McpAccessCard.tsx` 使用平台登录态请求 `/mcp-access/info`、`/tokens` 和 `/audit`。信息接口给出真实 endpoint、transport 和 auth 类型。授权管理属于已登录平台操作，创建与撤销还会验证来源。外部工具入口 `/mcp` 则检查 Bearer 授权，并按授权绑定账号读取词库。

下面是支持手动 HTTP header 的客户端配置结构示意，不保证适用于所有客户端；Codex 配置见 [客户端实例](/mcp/clients)。占位符不可直接用于真实连接。

```json
{
  "mcpServers": {
    "englishWorld": {
      "type": "http",
      "url": "https://your-host.example/api/mcp",
      "headers": { "Authorization": "Bearer TOKEN_PLACEHOLDER" }
    }
  }
}
```

使用已有测试授权时，先确认只包含需要的权限。前端默认创建选项为只读、30 天，后端允许有效天数 1 至 365。完整密钥仅创建时显示，关闭弹窗后列表只能查看摘要，遗失时应撤销旧授权并按自己的权限重新配置，不能期待服务器恢复原文。

## 连接成功意味着什么

能访问 HTTPS 只证明网络和证书这一层可达；能发现工具说明协议握手已经推进；查询返回自己的测试词条才覆盖了认证、权限和数据归属。授权有效并不表示具备全部权限，每次调用仍会检查状态，撤销后后续调用应失败。

排查应从外向内：先检查域名和证书，再确认路径确为 `/api/mcp`，然后查看 401、403 或工具结果里的业务错误。服务端允许没有 Origin 的客户端，以及与公开地址同源的 Origin；不可信来源返回 403。不要为排错关闭来源验证。所有文章示例均为脱敏教学材料，没有执行真实连接或写入；可在自己的测试环境按 [错误参考](/reference/configuration)逐层验证。
