# Data model

user保留。account_auth_state：userId主键、email唯一、sessionVersion；account_challenge：安全随机id、用途、规范化邮箱、摘要、过期/消费/发送状态；account_rate_bucket：维度摘要主键、窗口、次数、冷却。最终列名回查迁移。
challenge created→sent/failed/unknown→consumed或expired，仅sent可验证。注册消费+user+authstate同事务；重置消费+密码+版本同事务；错误计数独立提交，不能被业务回滚清零。唯一索引解决并发邮箱归属；定期清理过期记录。
