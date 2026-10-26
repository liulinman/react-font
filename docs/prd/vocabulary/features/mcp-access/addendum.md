# 实施补充

使用官方 TypeScript MCP SDK 与无状态 Streamable HTTP，POST /api/mcp；每请求建立并释放服务与transport。手动 Bearer 授权与平台 cookie 管理解耦；不是 OAuth 授权服务器。官方参考：https://ts.sdk.modelcontextprotocol.io/server 。

持久化授权摘要、操作审计、幂等请求与预览确认凭证；事务锁保证单次消费及撤销顺序。所有 SQL 参数化、用户边界不接受客户端 userId。安全覆盖共享已有白名单规则。

生产采用即时生产镜像为基线增量合并编译模块；保留额外生产业务模块、HTTPS 443和证书挂载。迁移独立执行，备份配置及镜像，先验证再切换；回滚不自动删除新表。

无实际变化的更新预览返回 no_changes，不签发确认凭证、不增加覆盖次数。词条快照包含时间戳；不同授权的并发判重使用锁定当前读，确保冲突返回覆盖流程说明。
