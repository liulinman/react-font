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

## 注册与找回的邮件配置（本地开发版）

邮件服务默认关闭。服务端 `MAIL_ENABLED=true` 且 `SMTP_HOST`、`SMTP_USER`、`SMTP_PASSWORD`、`SMTP_FROM` 完整时才尝试发信。`SMTP_PORT` 默认465；`SMTP_SECURE` 默认true，代表连接即TLS，使用587与STARTTLS时设置false。无论哪种方式都要求TLS且校验证书，连接/Socket超时各10秒。具体端口和发信地址须采用服务商授权配置，密码只放部署秘密配置，不进入前端或报告。

`POST /api/user/email-code` 接收用途register或reset、邮箱及图形证明；成功返回不含邮件正文的challengeId、60秒重发等待和600秒有效期。验证码6位、一次消费，错误验证累计限制按邮箱用途计算；图形挑战120秒。服务端另有限流，不能把页面倒计时当作安全措施。无配置、投递拒绝或超时返回503与可读提示；503不等于邮箱是否存在。SMTP接受请求也不表示邮件一定送达，超时更不能盲目无限重发。

配置改变后，先用隔离收件服务检查模板、冷却、重复请求和失败恢复，再用授权测试邮箱验证公网送达。当前尚无真实SMTP服务，公网邮件联调保留待办。本段描述本地实现，不代表已经上线。

### 反向代理后的限流身份

`TRUSTED_PROXY_CIDRS` 仅接受明确的代理IP或CIDR列表，默认不信任转发头。上线前应按实际Nginx来源配置该列表，避免所有访问都被计入代理IP。禁止用true、跳数或全网通配信任；直接访问后端的伪造X-Forwarded-For不应改变限流身份。此配置不自动修改线上网络或Nginx。


## 笔记 MCP 扩展错误

`invalid_input` 表示字段不合法；`not_found` 表示笔记、文件夹或关联词不存在或无权访问；`no_changes` 拒绝空修改；`note_changed` 提示回读并重新展示修改。`expired_preview`、`invalid_preview` 分别表示过期或不匹配的确认凭证。`folder_changed` 需重新展示归档路径，`folder_exists` 应选择已有目录，`folder_limit` 达到200目录上限。`request_conflict` 不可换内容复用请求ID。SDK结构验证错误可能无这些业务码，先检查 `isError`。这些错误均不得被客户端解释为保存成功。
