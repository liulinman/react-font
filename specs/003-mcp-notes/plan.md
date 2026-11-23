# Implementation Plan: 笔记 MCP

Spec Kit 1.2.3，Codex skills工作流；已实际resolve模板与setup-plan，不声称CLI生成了产品内容。
依据spec.md及正式PRD。沿用NestJS/Sequelize/MySQL、官方MCP SDK 1.26.0和React/Ant Design；不增加依赖。

## Constitution Check
本人数据、服务端权限、隔离测试、可重入迁移、无自动提交发布均符合。现有dirty快照见delivery基线；直接在当前工作区保留现有未提交功能依赖，避免丢失知识笔记文件夹和账号功能。

## Structure and Interfaces
- nestjs/src/interface/mcp-access/mcp-notes.ts：工具schema、权限映射与原子预览/确认处理；单独mcp_note_preview表，无旧表破坏修改。
- mcp.service.ts：校验新权限后分发，沿用同一tx、幂等和审计；未识别action拒绝。
- knowledge-note.service.ts：create/update/saveFolder允许共享调用者事务，保持HTTP原行为。
- mcp.controller.ts/security.ts/mcp-migration.ts：工具注册、scope和迁移；McpNotes持有同一db构建现有笔记服务，无需改原模块注入。
- McpAccessCard.tsx：已有checkbox增加四项，预览确认帮助与审计标签；不改变视觉系统。

## Tasks and Verification
T001：写scope/工具契约测试并观察缺功能失败；补全schema与授权。
T002：新建笔记/新目录预览确认/修改预览确认，保持事务、版本、幂等；真实MySQL+SDK验证取消、重试、跨用户、失效、并发和审计失败回滚。
T003：设置页权限与说明，沿用原样式；组件和浏览器验证。
T004：正式Case/精确绑定→notes Cloud验收→分析所有失败；原MCP后端回归、构建、公开文档检查与构建。
T005：独立diff审查、追踪/来源摘要、delivery/run索引归档；无提交/推送/部署授权，不执行。

## Review Focus
跨账号/跨token确认、版本变化、与HTTP并发文件夹锁、幂等与audit同事务、完整正文与可选字段保留、旧词库兼容。
