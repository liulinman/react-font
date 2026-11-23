# 设置与站点 PRD 入口

## 正式功能目录（与索引同步）

> 当前研发范围：电脑端学生端与管理端，按本功能实际角色适用。移动端仅作历史范围保留，不纳入当前设计、研发与验收；混合条款中的电脑端、业务及数据保护要求继续有效。历史“后续适配移动端”等计划不再默认启动。

### 主要功能

- [电脑端学习导航精简与名称统一](features/desktop-learning-nav/prd.md)（`settings/desktop-learning-nav`）
- [技术与实践文档中心](features/technical-docs/prd.md)（`settings/technical-docs`）
- [Freewing品牌名称与Logo统一](features/freewing-brand/prd.md)（`settings/freewing-brand`）
- [管理端产品需求模块](features/prd-browser/prd.md)（`settings/prd-browser`）

### 跨模块关联

- [统一阅读工作区与体验整改](../reading/features/unified-workspace/prd.md)（`reading/unified-workspace`，只维护一份正文）
- [AI 词条校验、场景听力与语音服务管理](../review/features/ai-listening/prd.md)（`review/ai-listening`，只维护一份正文）
- [单词 MCP 与授权管理](../vocabulary/features/mcp-access/prd.md)（`vocabulary/mcp-access`，只维护一份正文）
- [桌面注册登录与账号安全重构](../auth/features/account-access/prd.md)（`auth/account-access`，只维护一份正文）


模块 ID：`settings`。范围：用户设置、主题、导航、通用布局和安装离线能力。

## 当前需求来源

已有以下功能级正式 PRD；尚无确认完整的模块基线，不得根据页面或测试推定模块需求完整。

## 设计参考

下列设计作为补充线索，不代表已经形成完整 PRD：

- [2026-08-17-english-world-mobile-pwa-full-redesign-design.md](../../superpowers/specs/2026-08-17-english-world-mobile-pwa-full-redesign-design.md)

## 本次用户确认的补充

- [统一阅读工作区与体验整改](../reading/features/unified-workspace/prd.md)（`reading/unified-workspace`，2026-10-20 用户确认）。

- [电脑端学习导航精简与名称统一](features/desktop-learning-nav/prd.md)（`settings/desktop-learning-nav`，2026-10-22 用户确认）。


- [AI 词条校验、场景听力与语音服务管理](../review/features/ai-listening/prd.md)（`review/ai-listening`，2026-10-22 用户确认；含管理员双服务管理、桌面与移动学习）。

## 覆盖边界与维护

当前状态：已有局部正式 PRD，模块整体基线仍待补齐。
模块范围清单只是分类，不新增验收要求，不代表功能已完成或测试已通过。执行测试时必须盘点各来源的全部适用条款、验收标准和决策补充，缺失需求单独报告。
不同功能 PRD 相互补充；只有明确的修订声明才能覆盖旧条款，不能单纯以日期新旧替代。
当前研发仅电脑端学生端与管理端；移动端原需求仅属历史范围，不纳入当前验收；跨模块用例引用同一需求来源并在执行时去重。
新需求在本入口补充或加入 `features/<feature>/prd.md` 并登记上级 `index.json`；不得在交付或历史目录继续维护另一份正文。

- [雅思听力题型与模拟练习](../review/features/ielts-listening/prd.md)（`review/ielts-listening`，电脑端、AI原创、六题型与单部分/全套模拟；已授权研发，尚未上线）

[返回全部模块](../README.md)

- [单词 MCP 与授权管理](../vocabulary/features/mcp-access/prd.md)（`vocabulary/mcp-access`，2026-10-26，含权限、预览确认及幂等）。

- [技术与实践文档中心](features/technical-docs/prd.md)（2026-10-26，公开知识、技术与实例教程，随项目发布）。

- [Freewing品牌名称与Logo统一](features/freewing-brand/prd.md)（2026-10-26，展示品牌与应用图标，保留旧接入标识）。

## 产品需求查看

- [管理端产品需求模块](features/prd-browser/prd.md)：管理员登录后通过 VitePress 独立浏览正式 PRD。

- [知识笔记 MCP 与确认归档](../notes/features/mcp-notes/prd.md)（`notes/mcp-notes`，授权能力及本人数据访问关联；正文只维护一份）。
