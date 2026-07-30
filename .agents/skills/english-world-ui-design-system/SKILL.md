---
name: english-world-ui-design-system
description: Use when designing, implementing, reviewing, or refactoring any English World interface; adding pages or components; changing theme tokens, layout, responsive behavior, notifications, forms, tables, learning flows, or async AI states; or deciding which project UI pattern should govern desktop and mobile work.
---

# English World UI 设计系统

作为 English World 的项目级 UI 负责人，统一视觉语言、组件模式、状态反馈、桌面/移动规则和渐进治理。默认使用中文输出，代码名、状态名和路径保留原文。

## 规则优先级

发生冲突时严格按以下顺序决策：

1. 已确认的产品需求、PRD、验收标准和专项设计说明。
2. 本 Skill 的项目设计系统。
3. 当前代码中经过验证且仍符合项目目标的组件模式。
4. `impeccable`、`ui-ux-pro-max`、`web-design-guidelines` 等通用 Skill 的建议。

通用建议不能覆盖项目事实。若需求确实需要改变项目级 Token 或模式，先说明冲突、影响范围和迁移策略，再更新设计系统和实现。

## 按需读取

- 涉及颜色、字体、间距、圆角、阴影、图标、主题或页面骨架时，读取 [foundations.md](references/foundations.md)。
- 涉及按钮、表单、列表、表格、卡片、弹层、通知、反馈或 AI 任务状态时，读取 [components-and-states.md](references/components-and-states.md)。
- 涉及桌面/移动适配、可访问性、验收、旧样式迁移或规则例外时，读取 [responsive-and-governance.md](references/responsive-and-governance.md)。
- 同一任务跨越多个领域时可读取多个文件，但不要无目的地一次性加载全部参考资料。

## 工作流程

1. 明确用户任务、已确认需求、业务行为和验收范围。产品目标不清楚时，先使用 `english-world-ux-product-audit` 或读取现有规格，不用视觉偏好代替需求。
2. 读取相关参考文件，并检查目标页面、相邻组件、主题变量、测试和桌面/移动实现。
3. 将现状标记为“保留”“扩展既有模式”或“局部迁移”。不要因为新增一个页面而创造第三套视觉语言。
4. 先确定 Token、布局、组件、状态和响应式决策，再设计或修改代码。需要具体设计与实现能力时，在这些约束内使用 `impeccable`。
5. 保持业务逻辑、接口契约、数据结构和练习正确性不变，除非需求明确要求修改。
6. 使用现有测试、构建、真实桌面/移动视口和 `web-design-guidelines` 完成验收。视觉通过不代表业务通过。
7. 在结果中说明使用的项目规则、验证结果和仍存在的例外。

## 必须遵守

- 界面应安静、清晰、紧凑、可预测，适合高频学习和重复操作。
- 产品导航、操作和反馈默认使用中文；英文用于学习材料、题目或确有价值的辅助内容。
- 优先复用 `theme.css` Token、Ant Design、Ant Design Mobile 和项目现有图标库。
- 页面保持一个清晰主标题和一个主要操作；错误、空状态和等待状态必须给出下一步。
- 新功能同时定义桌面端、移动端、键盘、触控、加载、失败和恢复行为。
- 修改旧组件时采用“触及即整理”，只迁移本次范围内的不一致样式。

## 禁止事项

- 不把产品工作区设计成营销落地页，不使用无关英雄区、巨型展示字或装饰性文案。
- 不把页面区块全部包成悬浮卡片，不使用卡片嵌套卡片。
- 不用渐变、光球、模糊色块或大阴影掩盖信息层级问题。
- 有正式 Token 时不新增硬编码颜色、圆角或阴影。
- 有 Ant Design 图标时不手绘 SVG、不使用 Unicode 字符代替图标。
- 不用颜色作为状态的唯一表达，不隐藏失败原因或让重试丢失原参数。
- 不在 UI 调整中顺手改变业务规则、API、数据或题目生成逻辑。
