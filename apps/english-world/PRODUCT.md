# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users and purpose

Freewing（原English World）为英语学习者提供个人词库、听力、阅读和复习；管理端使用独立管理员身份。当前任务的用户是需要注册、登录、找回账号或修改本人密码的桌面学习者。

## Confirmed constraints

保留Freewing品牌与已有书翼/世界地标资产，不改产品身份。现有用户名密码账号继续兼容。2026-10-27用户确认本轮仅桌面，邮箱验证码用于注册/重置，登录增加图形验证码，支持登录后修改本人密码。暂没有发信服务，先准备可配置SMTP与设计。

## Open decisions

旧账号如何首次绑定邮箱、密码策略、具体发送限额及设计稿尚待本轮PRD和原型确认；不把建议当已批准需求。不改移动专用登录UI，不扩展到管理员认证重构。

## Sources

正式需求入口docs/prd，当前功能auth/account-access；确认来源为本轮用户对话，源码仅作为现状事实。

## 2026-10-27 工作区设计补充

实际产品包含个人词库、文章精读、知识笔记与关联跳转；本次用户针对这三个桌面页面和共用框架要求交互清楚、空间合理、以用户体验为主，授权先设计。品牌沿用Freewing，新的统一工作区视觉尚未批准，不能据此替换全站生产样式。auth/account-access此前UI与8～64密码/全学习会话撤销已确认并完成部署，SMTP暂未配置；上文旧“待决”仅属历史阶段，不再是该账号功能的当前状态。当前设计依据见docs/design/settings/workspace-experience。
