# English World UI Design System Skill 设计说明

日期：2026-07-30

## 背景

English World 已经安装了产品审计、通用 UI 设计、模式检索和 Web 规范检查等 Skill，但目前没有一个项目专属的 UI 负责人。通用 Skill 能发现问题或提供设计建议，却不了解本项目已经形成的主题变量、桌面工作区、移动端壳层、学习场景和历史设计决策，容易让不同页面出现不同的视觉语言。

本次新增 `english-world-ui-design-system`，作为 English World 的项目级 UI 设计系统和实施约束入口。

## 目标

- 统一桌面端和移动端的颜色、字体、间距、圆角、阴影和布局规则。
- 统一按钮、表单、列表、卡片、弹窗、通知及异步 AI 任务的组件和状态表达。
- 明确产品需求、项目设计系统、现有组件和通用 UI Skill 之间的优先级。
- 让后续 Agent 在设计、实现、重构和验收 UI 时有稳定、可执行的项目标准。
- 支持渐进迁移，不要求一次性重写现有 CSS。

## 非目标

- 不替代产品需求分析、用户研究或需求优先级判断。
- 不改变现有业务逻辑、接口契约或练习题生成逻辑。
- 不在本次工作中重构应用页面或批量替换旧样式。
- 不引入新的 UI 框架、图标库或运行时依赖。
- 不建立脱离代码的完整组件站点。

## 角色与优先级

发生规则冲突时按以下顺序决策：

1. 已确认的产品需求、PRD 和专项设计说明。
2. `english-world-ui-design-system` 项目设计系统。
3. 项目现有组件、主题变量和经过验证的交互模式。
4. `impeccable`、`ui-ux-pro-max`、`web-design-guidelines` 等通用 Skill 的建议。

项目设计系统负责“English World 应该长什么样、如何交互”；产品审计负责“什么问题最值得解决”；通用 UI Skill 负责在项目约束内提供实现和优化能力；Web 规范 Skill 负责最终检查。

## Skill 结构

```text
.agents/skills/english-world-ui-design-system/
├── SKILL.md
├── agents/
│   └── openai.yaml
└── references/
    ├── foundations.md
    ├── components-and-states.md
    └── responsive-and-governance.md
```

`SKILL.md` 只保留触发条件、角色、优先级、执行流程和禁止事项。详细规则拆入三个参考文件，按任务需要读取，避免上下文过载。

## 规范来源

设计系统以当前代码和已批准文档为事实来源：

- `apps/english-world/src/theme/theme.css`
- `apps/english-world/src/theme/ThemeProvider.tsx`
- `apps/english-world/src/page/englishWorld/EnglishWorld.css`
- `apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.css`
- `docs/superpowers/specs/2026-07-15-english-world-ui-simplification-design.md`
- `docs/superpowers/specs/2026-07-17-english-world-collapsible-sidebar-design.md`
- `docs/superpowers/specs/2026-07-28-desktop-workspace-density-design.md`
- `docs/superpowers/specs/2026-07-28-english-world-mobile-usability-design.md`

代码中的既有值分为两类：

- **正式标准**：主题变量、已确认的布局尺寸、可访问性和响应式要求。
- **迁移候选**：零散硬编码颜色、任意圆角、重复标题、装饰性渐变和局部临时布局。它们不自动升级为设计标准。

## 核心设计原则

### 产品气质

English World 是高频学习工具，应安静、清晰、紧凑、可预测。界面首先服务扫描、练习、复习和反馈，不采用营销落地页式巨型标题、装饰性卡片堆叠或无关视觉效果。

### 设计基础

- 以 `theme.css` 中的 CSS 变量为颜色和主题事实来源。
- 默认强调色为蓝色，并保留现有绿色、紫色主题选择。
- 间距优先使用 4、8、12、16、24、32 像素序列。
- 常规控件和卡片默认使用 8 像素圆角，主要面板可使用 12 像素。
- 阴影只用于弹层、悬浮控件和确有层级需要的表面。
- 项目继续使用 Ant Design、Ant Design Mobile 及其图标库。

### 页面与布局

- 桌面端侧栏展开宽度 228 像素、收起宽度 72 像素，上下文栏高度 64 像素。
- 工作型页面最大宽度 1560 像素，专注型任务使用更窄的内容区域。
- 页面只保留一个清晰主标题和一个明确主要操作，避免重复标题和说明。
- 卡片只承载重复项目、弹窗或真正需要边框的工具，不把页面区块全部做成悬浮卡片。

### 移动端

- 从 320 像素宽度开始可用，采用独立移动端壳层。
- 使用 `100dvh`、安全区和单一滚动容器，固定操作必须预留内容空间。
- 触控目标至少 44 像素，输入框字体至少 16 像素。
- 桌面和移动端保持业务能力一致，展示方式可以不同。

### 状态与反馈

异步生成类功能必须区分校验、提交、排队、处理、成功、失败、过期和重连状态。失败信息必须说明原因、保留原参数并提供下一步操作，不能只显示“生成失败”。

加载、空状态、错误、成功、禁用、危险操作和撤销状态都应有统一表达。通知铃铛、通知列表和右上角 Toast 应共享同一语义，不互相矛盾。

## 使用流程

1. 从已确认需求或产品审计结论中确定任务目标。
2. 读取项目设计系统对应参考文件。
3. 盘点目标页面已有组件、主题变量和测试。
4. 判断是保留现状、扩展既有模式还是做局部迁移。
5. 在项目约束内使用 `impeccable` 进行设计或实现。
6. 使用 `web-design-guidelines`、构建、自动化测试和桌面/移动截图完成验收。
7. 若必须偏离设计系统，在专项设计说明中记录原因和影响范围。

## 渐进治理

设计系统采用“触及即整理”的迁移策略：

- 修改某个组件时，只迁移与本次需求相关的硬编码值和不一致模式。
- 不为了统一视觉而扩大业务改动范围。
- 新组件必须直接使用正式标准。
- 需要新增全局 Token 或模式时，先更新设计说明和设计系统，再实现页面。

## 验证

- 使用 Skill Creator 的结构校验脚本检查 frontmatter、目录和元数据。
- 检查 Skill 引用的项目路径真实存在。
- 用至少三个典型任务做前向检查：新增桌面页面、修复移动端布局、设计 AI 生成失败状态。
- 确认项目 Skill 中文说明文档已包含职责、协作顺序和示例。
- 通过 `git diff --check` 和提交范围检查，确保没有修改产品运行代码。
