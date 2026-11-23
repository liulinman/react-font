# 登录与权限 PRD 入口

## 正式功能目录（与索引同步）

> 当前研发范围：电脑端学生端与管理端，按本功能实际角色适用。移动端仅作历史范围保留，不纳入当前设计、研发与验收；混合条款中的电脑端、业务及数据保护要求继续有效。历史“后续适配移动端”等计划不再默认启动。

### 主要功能

- [桌面注册登录与账号安全重构](features/account-access/prd.md)（`auth/account-access`）

### 跨模块关联

- [教师端课堂与阅读作业](../classroom/features/teacher-classroom/prd.md)（`classroom/teacher-classroom`，草案）

- [统一阅读工作区与体验整改](../reading/features/unified-workspace/prd.md)（`reading/unified-workspace`，只维护一份正文）
- [单词 MCP 与授权管理](../vocabulary/features/mcp-access/prd.md)（`vocabulary/mcp-access`，只维护一份正文）
- [Freewing品牌名称与Logo统一](../settings/features/freewing-brand/prd.md)（`settings/freewing-brand`，只维护一份正文）


模块 ID：`auth`。范围：登录、退出、会话和访问控制。

## 当前需求来源

已有以下功能级正式 PRD；尚无确认完整的模块基线，不得根据页面或测试推定模块需求完整。

## 本次用户确认的补充

- [统一阅读工作区与体验整改](../reading/features/unified-workspace/prd.md)（`reading/unified-workspace`，2026-10-20 用户确认）。

## 覆盖边界与维护

当前状态：已有局部正式 PRD，模块整体基线仍待补齐。
模块范围清单只是分类，不新增验收要求，不代表功能已完成或测试已通过。执行测试时必须盘点各来源的全部适用条款、验收标准和决策补充，缺失需求单独报告。
不同功能 PRD 相互补充；只有明确的修订声明才能覆盖旧条款，不能单纯以日期新旧替代。
当前研发仅电脑端学生端与管理端；移动端原需求仅属历史范围，不纳入当前验收；跨模块用例引用同一需求来源并在执行时去重。
新需求在本入口补充或加入 `features/<feature>/prd.md` 并登记上级 `index.json`；不得在交付或历史目录继续维护另一份正文。

[返回全部模块](../README.md)

- [单词 MCP 与授权管理](../vocabulary/features/mcp-access/prd.md)（`vocabulary/mcp-access`，2026-10-26，含权限、预览确认及幂等）。

## 本轮功能需求

- [桌面注册登录与账号安全重构](features/account-access/prd.md)：用户已确认邮箱验证码、图形验证码、桌面改版与SMTP方案，r10 UI与密码/会话规则已确认，研发及验收记录见对应交付，不代表已上线。

- [知识笔记 MCP 与确认归档](../notes/features/mcp-notes/prd.md)（`notes/mcp-notes`，授权能力及本人数据访问关联；正文只维护一份）。
