# English World 设计基础

## 事实来源

实施前优先检查以下文件；本参考用于快速决策，代码仍是运行事实：

- `apps/english-world/src/theme/theme.css`
- `apps/english-world/src/theme/ThemeProvider.tsx`
- `apps/english-world/src/page/englishWorld/EnglishWorld.css`
- `apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.css`
- `docs/superpowers/specs/2026-07-15-english-world-ui-simplification-design.md`
- `docs/superpowers/specs/2026-07-17-english-world-collapsible-sidebar-design.md`
- `docs/superpowers/specs/2026-07-28-desktop-workspace-density-design.md`
- `docs/superpowers/specs/2026-07-28-english-world-mobile-usability-design.md`

## 产品气质

English World 是学习工具，不是营销网站。视觉应安静、清晰、紧凑、可信，支持扫描、比较、输入、练习和反复操作。优先保证内容正确、状态明确和操作效率，再考虑装饰。

- 产品导航、按钮、标签、帮助和反馈默认使用中文。
- 英文用于文章、单词、题目、答案、引用材料和必要的语言学习说明。
- 删除无信息价值的英文 eyebrow、重复标题和“功能介绍式”页面文案。
- 页面首屏直接呈现可用工作区，不添加与任务无关的 Hero。

## 正式颜色 Token

新样式必须优先使用 `theme.css` 中的变量：

| 语义 | Light | Dark |
|---|---|---|
| `--ew-page-bg` | `#f5f7fb` | `#0b1120` |
| `--ew-surface` | `#ffffff` | `#111827` |
| `--ew-surface-muted` | `#f8fafc` | `#172033` |
| `--ew-text` | `#182235` | `#e5edf8` |
| `--ew-text-secondary` | `#64748b` | `#9aa9bf` |
| `--ew-border` | `#dfe7f2` | `#28364d` |
| `--ew-success` | `#16865a` | `#4ade80` |
| `--ew-warning` | `#c97a10` | `#fbbf24` |
| `--ew-danger` | `#c2413b` | `#f87171` |

强调色由用户主题选择决定：

| 主题 | `--ew-accent` | `--ew-accent-soft` |
|---|---|---|
| Blue，默认 | `#2563eb` | `#eff6ff` |
| Green | `#16a34a` | `#f0fdf4` |
| Purple | `#7c3aed` | `#f5f3ff` |

规则：

- 状态色必须同时配合文字、图标或形状，不能只依赖颜色。
- 选中、悬停和弱提示背景优先用 `--ew-accent-soft` 或 `color-mix()` 与表面色组合。
- 明暗主题均需可读；不要在组件内假设背景永远是白色。
- 若缺少新的全局语义色，先提议新增 Token，不在多个页面复制裸色值。

## 字体与文字层级

沿用 Ant Design 和系统字体栈，不为单个页面引入新字体。代码、日志和机器标识可使用现有等宽字体。

推荐层级：

| 用途 | 字号 | 建议行高 |
|---|---:|---:|
| 辅助信息、元数据、Tag | 12-13px | 1.4 |
| 正文、表格、常规控件 | 14px | 1.5 |
| 重要控件、移动输入、卡片标题 | 16px | 1.5 |
| 区块标题 | 20px | 1.4 |
| 紧凑页面标题 | 24px | 1.3 |
| 桌面主页面标题 | 30px | 1.25 |

- 不按视口宽度缩放字号。
- `letter-spacing` 默认是 `0`；旧 eyebrow 的大字距是迁移候选。
- 标题表达任务，不复述面包屑、Tab 或导航。
- 文本必须在容器内换行或截断；截断的信息提供 `title`、Tooltip 或详情入口。

## 间距、圆角、边框和阴影

### 间距

优先使用 `4 / 8 / 12 / 16 / 24 / 32px`。紧密相关内容用 4-8px，组件内部用 8-16px，区块之间用 24-32px。固定格式控件使用稳定尺寸，不能因加载文字、图标或状态变化导致布局跳动。

### 圆角

- `--ew-radius-sm: 8px`：按钮、输入、菜单项、常规卡片和大多数控件。
- `--ew-radius-md: 12px`：主要面板、弹层和需要更强分组的工具。
- `--ew-radius-lg: 18px`：已存在，但不是页面默认值；只在专项规格明确时使用。
- 胶囊形状仅用于 Tag、状态、分段控件、头像或语义上确实需要的元素。

历史页面中的 14、16、18px 任意圆角是迁移候选，不能因为已存在就复制到新组件。

### 边框与阴影

- 默认边框为 `1px solid var(--ew-border)`。
- 平面区块优先靠留白、标题和边框组织，不为每个区块增加阴影。
- `--ew-shadow-soft` 用于轻度浮起；`--ew-shadow-lifted` 用于弹层、浮层或明确的高层级。
- 深色模式必须使用深色主题阴影值。

## 桌面页面骨架

- 展开侧栏：`228px`。
- 收起侧栏：`72px`。
- 顶部上下文栏：`64px`。
- 工作型主内容最大宽度：`1560px`。
- 主内容常规内边距：桌面优先 `32px 32px 56px`，窄桌面可按现有断点收紧。
- 今日复习等专注任务：约 `1120px`。
- 系统设置：约 `1080px` 页面宽度、`860px` 表单宽度。

工作型页面如词库、Context Lab、后台列表应充分使用横向空间；阅读、答题和设置类任务保持更窄的可读宽度。页面区块是无框布局或全宽工作带，卡片只用于重复项目、弹窗和真正需要边界的工具。

## 图标与主题

- 桌面端使用项目已有的 `@ant-design/icons`，移动端使用 `antd-mobile-icons`。
- 熟悉操作优先图标按钮，并提供 `aria-label`；不熟悉图标增加 Tooltip。
- 不新增 Lucide 依赖，不手绘可被现有库替代的 SVG。
- `ThemeProvider` 支持 `light / dark / system` 和 `blue / green / purple`，新组件必须跟随这些设置。
- 运动效果尊重 `prefers-reduced-motion`，被禁用时不得影响任务完成。

## 正式标准与迁移候选

### 正式标准

- `theme.css` 语义 Token。
- 本文明确的桌面骨架、移动触控和可访问性要求。
- 已批准专项规格中的任务宽度与布局决策。
- 经测试验证的 Ant Design / Ant Design Mobile 使用方式。

### 迁移候选

- 页面局部硬编码颜色、阴影和任意圆角。
- 重复页面标题、装饰性 eyebrow 和功能介绍文案。
- 装饰性渐变、过重阴影、悬浮页面区块和卡片嵌套。
- 只适配单一视口、单一主题或鼠标操作的临时布局。

触及迁移候选时只整理本次影响范围，不发起无关的全站 CSS 重写。
