# Decisions

Spec Kit specify-cli 1.2.3专用venv真实init到临时目录后合入.specify和新speckit skills，无覆盖已有AGENTS，无Git扩展。create-new-feature/setup-plan真实执行。
MySQL附加account_auth_state/challenge/rate表保证重启及跨实例安全，不改旧数据。带算法标记的SHA256预哈希bcrypt解决72byte限制；旧bcrypt仅只读验证。现有canvas生成PNG，无答案字段。nodemailer负责SMTP，默认禁用；本地替身仅验证协议/业务，公网待联调。学习token会话版本与密码原子更新，admin/MCP保持。沿用当前双仓工作区与批准资料，限制文件边界保留其他dirty变更。
