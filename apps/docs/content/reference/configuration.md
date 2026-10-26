# 配置边界与错误码

## 公开地址不是任意字符串

后端 `src/interface/mcp-access/mcp-security.ts` 的 `publicEndpoint` 读取 `MCP_PUBLIC_URL`。合法公开示例为 `https://your-host.example/api/mcp`，路径必须精确为 `/api/mcp`，不能附带用户名、密码、查询参数或片段。生产环境要求 HTTPS；仅在非生产环境允许 `localhost` 或 `127.0.0.1` 的 HTTP。`NODE_ENV` 因而会影响地址校验边界。

这些是配置名称和校验规则，不是线上环境文件的公开副本。浏览器平台从信息接口获得地址，客户端不需要知道数据库、反向代理或其他服务私有配置。客户端变量 `ENGLISH_WORLD_MCP_TOKEN` 仅是教程采用的名称，其内容由客户端读取，服务器不会自动读取这个变量来授权请求。

## 先分清错误发生在哪一层

| 层级 | 错误或状态 | 应检查的内容 |
| --- | --- | --- |
| HTTP | 401 unauthorized | Bearer 是否可见、是否过期或撤销 |
| HTTP | 403 untrusted_origin | Origin 是否属于公开地址的同源 |
| HTTP | 405 method_not_allowed | 是否误用 GET，入口只接收 POST |
| 业务 | forbidden | 授权是否包含对应 words scope |
| 业务 | not_found | 是否为当前授权账号的词条 |
| 业务 | duplicate_word | 先查询，已有词改走预览覆盖 |
| 业务 | no_changes | 过滤空值后是否真的存在差异 |
| 业务 | request_conflict | 同 requestId 是否换了操作或参数 |
| 业务 | invalid_preview | 凭证、账号、授权或动作是否匹配 |
| 业务 | expired_preview | 是否超过十分钟，应重新预览 |
| 业务 | word_changed | 预览后词条是否被其他操作修改 |
| 业务 | operation_failed | 保留脱敏记录，检查服务端异常 |

`confirmation_required` 表示没有显式确认；不过控制器 schema 已要求 `confirmed: true`，正常客户端可能先收到 schema 校验失败。工具参数验证与业务异常属于不同路径，不应强行给每个 SDK 错误套一个业务码。

## 阅读一个失败结果

以下为示意 MCP 工具结果，表示传输已经得到回复，但业务没有完成：

```json
{
  "isError": true,
  "content": [{ "type": "text", "text": "{\"code\":\"forbidden\",\"message\":\"此授权没有对应操作权限\"}" }]
}
```

遇到这种结果，不要把请求重试当作获取权限的方法。先核对工具对应权限，再由授权所有者决定是否需要变更授权。对于 `word_changed`，必须展示重新生成的差异并重新确认；对于网络超时的写入，则应使用原请求 ID 和相同内容核对结果，不能盲目制造新请求。

## 有边界的验证

可以在测试环境检查非法 URL 是否在启动时被拒绝、只读授权是否不能写入、撤销后是否不能继续查询。来源验证需要分别覆盖同源、不可信来源和不携带 Origin 的客户端。记录状态码、错误码和工具名即可，不应记录完整认证头、真实用户资料或数据库环境值。源码只能证明设计和当前实现，实际部署是否正确仍需独立验证；本文没有声称全部验收已通过。
