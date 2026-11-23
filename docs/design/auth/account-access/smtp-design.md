# SMTP 可配置方案 r02（本地已实现）

featureId：auth/account-access；changeId：2026-10-27-account-access-r01。来源：[PRD](../../../prd/auth/features/account-access/prd.md)、specs/001-account-access；实现nestjs/src/interface/user/account-mail.service.ts。替代首轮建议配置名，以此实际接口为准。

| 环境变量 | 实际行为 |
|---|---|
| MAIL_ENABLED | 只有true启用，默认关闭 |
| SMTP_HOST | 主机，启用时必填 |
| SMTP_PORT | 默认465，合法端口整数 |
| SMTP_SECURE | 默认true即连接TLS；false采用STARTTLS，仍要求TLS |
| SMTP_USER / SMTP_PASSWORD | 必填，仅后端秘密配置 |
| SMTP_FROM | 授权发信地址，必填 |

证书始终校验，连接与socket超时10秒；不记录密码、验证码或邮件正文。无配置返回503，不是假发送。运输失败/超时同样返回503并把挑战标为不可验证，限流冷却仍保持；可能已经投递的邮件不能当作明确未送达，更不能无限自动重发。SMTP接受不证明最终送达。

邮件验证码6位10分钟、60秒重发；失败累计与发送限额、并发消费由MySQL持久表和事务保证。验证码只存HMAC摘要。注册/重置用途隔离，重发旧码作废。找回存在与不存在邮箱均使用一致受理路径及限额。

当前验收通过harness注入的外部邮件传输替身捕获验证码，业务HTTP和MySQL真实；该证据不表示已测真实SMTP协议或公网邮件送达。仍需用户准备SMTP后，以授权测试邮箱核对域名/地址授权和实际收信。秘密不放聊天、Git或Cloud证据。
