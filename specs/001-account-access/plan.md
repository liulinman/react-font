# Account Access Implementation Plan

> Workers: superpowers:subagent-driven-development; test first; no commit/push/deploy.

**Goal:** 以r10确认UI交付账号安全流程。
**Architecture:** React既有上下文+统一API；Nest封装MySQL持久挑战/限流及SMTP；附加表与事务保证单次消费与会话版本；管理员/MCP隔离。
**Tech Stack:** React18/TS/AntD、Nest10/Sequelize6/MySQL、现有canvas、nodemailer。
**Spec:** spec.md、contracts/account-api.md。

## Global Constraints
密码8～64Unicode码点；注册验证邮箱；所有登录必须图形验证；不迁移/删除旧数据；移动必要安全适配；SMTP替身不代表公网送达；不自动提交部署。

## Constitution Check
PRD/设计有来源，安全服务端校验、事务持久化、秘密不出日志、显式迁移、测试先行和证据归档均遵守。

## Review Focus
并发消费仅一次、刷新重发不重置累计、改密并发登录旧版本无效、Unicode不截断、移动无免验端点；由T1安全测试和T3真实接口断言核对。

## T1 Backend security API
Files: nestjs/src/interface/user/**、common/utils/signed-token.util.ts、migrations/account-access SQL、package/lock。
Interfaces: contracts/account-api.md全部请求与响应。
- [ ] 写安全失败测试并运行：挑战重放/过期/用途、限流、Unicode密码、会话撤销。
- [ ] 实现持久挑战/限额、注册重置事务、本人改密、可配置SMTP和无配置503。
- [ ] 定向Jest及后端构建通过；不连生产。

## T2 Frontend approved UI
Files: page/login/**、server/user/**、contexts/AuthContext.tsx、settings账号安全组件、public/brand透明Logo。
Interfaces: 固定HTTP契约；视觉源docs/design/auth/account-access/revisions/r10/prototype。
- [ ] 写失败测试：正式视觉、图形刷新、注册验证、回跳安全、错误恢复。
- [ ] 实现真实接口与r10布局、注册分步/重置/改密；防双击与迟到响应。
- [ ] Vitest与前端构建通过。

## T3 Integration / delivery
Files: auth Case、suite/Cypress、隔离SQL/SMTP收件服务与traceability、公开技术文档。
- [ ] 维护逐条Case及实际断言，隔离环境包含迁移，不访问生产。
- [ ] 执行真实SQL/HTTP及Cloud浏览器，读当次结果分析，保留失败run。
- [ ] 独立安全规格审查，修复并定向重验。
- [ ] 同步公开技术文章和交付记录，明确公网SMTP待联调，无发布授权。
