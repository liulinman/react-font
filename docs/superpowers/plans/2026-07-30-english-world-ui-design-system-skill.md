# English World UI Design System Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增一个项目专属的 `english-world-ui-design-system` Skill，统一 English World 的视觉、组件、状态和响应式实施标准。

**Architecture:** 使用 Skill Creator 生成标准目录，由 `SKILL.md` 负责触发和编排，三个 `references` 文件分别负责设计基础、组件状态、响应式与治理。项目根目录的 `.agents/skills/README.md` 作为中文索引，说明五个 Skill 的职责和协作顺序。

**Tech Stack:** Markdown、YAML、Codex Agent Skills、Python 结构校验脚本、Git。

## Global Constraints

- 不修改 English World 前端、后端、数据库或部署代码。
- 不引入新的 UI 框架、图标库或运行时依赖。
- 项目继续使用 Ant Design、Ant Design Mobile 及其现有图标库。
- 已确认的产品需求和专项规格优先于设计系统。
- 设计系统优先于第三方通用 UI Skill 的建议。
- 新标准必须来自当前主题代码、布局代码和已批准的设计说明。
- 旧样式采用“触及即整理”的渐进迁移方式，不做无关的全局重构。

---

### Task 1: 生成 Skill 骨架并定义入口

**Files:**
- Create: `.agents/skills/english-world-ui-design-system/SKILL.md`
- Create: `.agents/skills/english-world-ui-design-system/agents/openai.yaml`
- Create: `.agents/skills/english-world-ui-design-system/references/`

**Interfaces:**
- Consumes: `docs/superpowers/specs/2026-07-30-english-world-ui-design-system-skill-design.md`
- Produces: 可被 Agent 自动发现的 `$english-world-ui-design-system` Skill 入口。

- [x] **Step 1: 使用官方脚本生成标准目录**

Run:

```bash
python3 /Users/liulin/.codex/skills/.system/skill-creator/scripts/init_skill.py \
  english-world-ui-design-system \
  --path .agents/skills \
  --resources references \
  --interface 'display_name=English World UI Design System' \
  --interface 'short_description=统一 English World 的视觉、组件、状态与响应式规范' \
  --interface 'brand_color=#2563EB' \
  --interface 'default_prompt=Use $english-world-ui-design-system to design or review this English World interface against the project UI standards.'
```

Expected: 创建 Skill 目录、`SKILL.md`、`agents/openai.yaml` 和空的 `references` 目录。

- [x] **Step 2: 编写 Skill 入口**

将 `SKILL.md` 改为只包含以下职责：

- 在新增页面、重构组件、调整主题、检查桌面/移动一致性或处理 UI 状态时触发。
- 明确“产品规格 > 项目设计系统 > 现有验证模式 > 通用 Skill”的优先级。
- 按任务读取三个参考文件，不一次性加载所有内容。
- 要求先盘点现有实现，再决定保留、扩展或局部迁移。
- 设计和实施可调用 `impeccable`，验收可调用 `web-design-guidelines`。
- 禁止营销式英雄区、嵌套卡片、无意义渐变、巨型标题、可替代的手绘图标和无必要硬编码。
- 默认使用中文输出。

- [x] **Step 3: 检查入口元数据**

Run:

```bash
sed -n '1,220p' .agents/skills/english-world-ui-design-system/SKILL.md
sed -n '1,120p' .agents/skills/english-world-ui-design-system/agents/openai.yaml
```

Expected: `SKILL.md` frontmatter 只有 `name` 与 `description`；YAML 字符串全部加引号，默认提示显式包含 `$english-world-ui-design-system`。

### Task 2: 编写项目 UI 规范

**Files:**
- Create: `.agents/skills/english-world-ui-design-system/references/foundations.md`
- Create: `.agents/skills/english-world-ui-design-system/references/components-and-states.md`
- Create: `.agents/skills/english-world-ui-design-system/references/responsive-and-governance.md`

**Interfaces:**
- Consumes: `apps/english-world/src/theme/theme.css`、`ThemeProvider.tsx`、桌面和移动 CSS、四份历史设计说明。
- Produces: 可按需读取的项目 UI 标准。

- [x] **Step 1: 编写设计基础**

`foundations.md` 必须记录：

- 产品气质和内容语言。
- `theme.css` 中当前正式颜色变量及蓝、绿、紫强调色。
- 字号、行高、间距、圆角、边框和阴影规则。
- 228/72/64/1560 像素桌面布局尺寸及专注型内容宽度。
- 明暗主题、Ant Design 图标、文本适配和减少动态效果要求。
- 正式标准与迁移候选的区别。

- [x] **Step 2: 编写组件与状态规范**

`components-and-states.md` 必须覆盖：

- 按钮层级、表单、列表、表格、Tabs、分段控件、卡片、弹窗和抽屉。
- 通知铃铛、通知列表与 Toast 的语义一致性。
- 加载、空、错误、成功、禁用、危险操作和撤销状态。
- AI 任务的 `idle`、`validating`、`submitting`、`pending`、`processing`、`succeeded`、`failed`、`stale`、`reconnecting` 状态。
- 失败原因、原参数保留、重试和下一步操作。
- 键盘、焦点、标签、44 像素触控目标和减少动态效果。

- [x] **Step 3: 编写响应式与治理规范**

`responsive-and-governance.md` 必须覆盖：

- 1440/1920 桌面和 390x844、320x568 移动端验收视口。
- `100dvh`、安全区、单一滚动容器、固定操作预留和键盘适配。
- 桌面/移动业务能力对照。
- “需求 -> 现有模式盘点 -> Token/组件决策 -> 最小范围实现 -> 自动化和视觉验收”的工作流。
- 旧样式渐进迁移、异常记录和设计评审清单。

- [x] **Step 4: 检查事实来源**

Run:

```bash
rg -n -- "--ew-accent|--ew-page-bg|--ew-radius|228px|72px|64px|1560px|100dvh|44px" \
  apps/english-world/src/theme/theme.css \
  apps/english-world/src/page/englishWorld/EnglishWorld.css \
  apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.css \
  .agents/skills/english-world-ui-design-system/references
```

Expected: Skill 中的 Token 和尺寸都能追溯到代码或已批准规格，没有把明显的局部硬编码误写成全局标准。

### Task 3: 更新中文说明并验证 Skill

**Files:**
- Modify: `.agents/skills/README.md`

**Interfaces:**
- Consumes: 新 Skill 的入口和三个参考文件。
- Produces: 五个项目 Skill 的中文职责说明、推荐协作流程和调用示例。

- [x] **Step 1: 更新 Skill 索引**

在 `.agents/skills/README.md` 中：

- 将“四个 Skill”改为“五个 Skill”。
- 在总表和详细章节中加入 `english-world-ui-design-system`。
- 将推荐流程改为：

```text
真实用户任务
  -> English World 产品审计
  -> 中文需求 Backlog
  -> 产品确认
  -> English World UI Design System 设定项目约束
  -> Impeccable 设计/实现
  -> Web Guidelines 规则复查
  -> 桌面端与移动端浏览器验收
```

- 增加 `$english-world-ui-design-system` 的中文调用示例。

- [x] **Step 2: 执行结构校验**

Run:

```bash
python3 /Users/liulin/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  .agents/skills/english-world-ui-design-system
```

Expected: 输出 `Skill is valid!`。

- [x] **Step 3: 执行前向检查**

分别用以下三个任务检查 Skill 能否给出明确决策路径：

```text
新增一个桌面端学习记录列表，应该使用什么页面宽度、组件和主要操作规则？
移动端弹窗被键盘遮挡，应该读取哪些规范并如何验收？
AI 练习生成失败时，界面必须保留和展示哪些信息？
```

Expected: 三个任务都能从入口定位到对应参考文件，并得到可执行规则；不需要修改产品代码。

- [x] **Step 4: 执行 Git 范围检查**

Run:

```bash
git diff --check
git status --short
git diff --name-only HEAD
```

Expected: `git status` 与已追踪差异合并查看时，只出现新 Skill、中文索引和本实施计划，不包含 `apps/`、`packages/` 或后端运行代码。

- [x] **Step 5: 提交实现**

Run:

```bash
git add \
  .agents/skills/english-world-ui-design-system \
  .agents/skills/README.md \
  docs/superpowers/plans/2026-07-30-english-world-ui-design-system-skill.md
git commit -m "feat(english-world): add project UI design system skill"
```

Expected: 本地提交成功，工作区干净；除非用户另行要求，不执行推送。
