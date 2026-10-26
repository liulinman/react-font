# 设置与站点 PRD 入口

模块 ID：`settings`。范围：用户设置、主题、导航、通用布局和安装离线能力。

## 当前需求来源

尚未找到本模块独立的正式 PRD；不得根据页面或已有测试推定完整需求。

## 设计参考

下列设计作为补充线索，不代表已经形成完整 PRD：

- [2026-08-17-english-world-mobile-pwa-full-redesign-design.md](../../superpowers/specs/2026-08-17-english-world-mobile-pwa-full-redesign-design.md)

## 本次用户确认的补充

- [统一阅读工作区与体验整改](../reading/features/unified-workspace/prd.md)（`reading/unified-workspace`，2026-10-20 用户确认）。

- [电脑端学习导航精简与名称统一](features/desktop-learning-nav/prd.md)（`settings/desktop-learning-nav`，2026-10-22 用户确认）。


- [AI 词条校验、场景听力与语音服务管理](../review/features/ai-listening/prd.md)（`review/ai-listening`，2026-10-22 用户确认；含管理员双服务管理、桌面与移动学习）。

## 覆盖边界与维护

当前状态：待补齐模块 PRD。
模块范围清单只是分类，不新增验收要求，不代表功能已完成或测试已通过。执行测试时必须盘点各来源的全部适用条款、验收标准和决策补充，缺失需求单独报告。
不同功能 PRD 相互补充；只有明确的修订声明才能覆盖旧条款，不能单纯以日期新旧替代。
桌面、移动端和管理端按 PRD 规定纳入该模块；跨模块用例引用同一需求来源并在执行时去重。
新需求在本入口补充或加入 `features/<feature>/prd.md` 并登记上级 `index.json`；不得在交付或历史目录继续维护另一份正文。

[返回全部模块](../README.md)

- [单词 MCP 与授权管理](../vocabulary/features/mcp-access/prd.md)（`vocabulary/mcp-access`，2026-10-26，含权限、预览确认及幂等）。
