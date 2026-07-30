# English World 项目 Skills 说明

这个目录保存 **English World 项目级 Agent Skills**。它们只对当前项目生效，
用于补充产品分析、UX 审计、UI 设计参考和 Web 规范检查能力。

## 一句话理解

| Skill | 角色定位 | 主要解决的问题 | 默认是否修改产品代码 |
|---|---|---|---|
| `english-world-ux-product-audit` | English World 产品经理/UX 审计负责人 | 把真实用户体验问题整理成有证据、可排期、可验收的中文需求 | 否 |
| `impeccable` | UI/UX 设计总监 | 评审、设计、重构和打磨具体页面或组件 | 仅在明确要求实施时 |
| `ui-ux-pro-max` | UI/UX 参考资料库 | 查询设计风格、配色、字体、交互规范和技术栈建议 | 否；持久化必须显式开启 |
| `web-design-guidelines` | Web 规范检查员 | 检查可访问性、表单、交互语义、响应式和常见 Web 体验问题 | 否 |

## 1. english-world-ux-product-audit

目录：[english-world-ux-product-audit](english-world-ux-product-audit/)

这是专门为 English World 创建的项目 Skill，也是四个 Skill 的总协调者。

### 它会做什么

- 从登录、今日学习、词库、复习、Context Lab、IELTS、通知和移动端中选择用户任务。
- 先读现有规格、测试、前端和后端代码，再进行判断。
- 使用桌面端和移动端真实浏览器复现问题。
- 区分浏览器观察、代码证据、规格事实、推断和待验证内容。
- 按 P0-P3 评定严重度，并输出中文需求 Backlog。
- 每条需求都包含用户影响、产品影响、置信度和 Given/When/Then 验收标准。

### 适合什么时候使用

- “帮我全面审计一下 English World 的体验问题。”
- “检查 Context Lab 从生成到答题的完整用户路径。”
- “看看移动端和桌面端有哪些能力不一致。”
- “把这张截图的问题转成正式产品需求。”

### 它不会做什么

- 默认不会直接修改前端或后端代码。
- 不会只凭个人审美把问题定成 P0/P1。
- 在产品需求确认前，不会自动进入开发、提交、推送或发布。

入口文件：[SKILL.md](english-world-ux-product-audit/SKILL.md)

## 2. impeccable

目录：[impeccable](impeccable/)

这是通用的高级 UI/UX 设计与评审 Skill，更偏向“具体页面应该怎么设计和实现”。

### 它会做什么

- 评审页面的信息层级、认知负担、交互反馈、视觉表现和响应式体验。
- 设计或重构页面、组件、表单、设置页、后台和应用工作区。
- 执行 `critique`、`audit`、`polish`、`clarify`、`adapt`、`harden` 等专项流程。
- 在明确要求实施时，可以修改 UI 代码并通过浏览器截图验证。
- 检查可访问性、性能、边界状态、国际化和设计一致性。

### 适合什么时候使用

- “用 Impeccable 评审 Context Lab 页面。”
- “重新设计这个练习页面，但保留现有业务功能。”
- “打磨移动端布局、信息层级和交互反馈。”
- “检查这个页面的错误状态、空状态和加载状态。”

### 项目安全设置

- 默认不执行版本更新检查或陈旧检查。
- 只有用户明确设置对应环境变量时才允许联网检查。
- 是否修改产品代码取决于用户请求；单纯审计时应保持只读。

入口文件：[SKILL.md](impeccable/SKILL.md)

来源记录：[SOURCE.md](impeccable/SOURCE.md)

## 3. ui-ux-pro-max

目录：[ui-ux-pro-max](ui-ux-pro-max/)

这是一个本地可搜索的 UI/UX 知识库，适合在设计之前快速查询参考方案。

### 它包含什么

- 84 类设计风格。
- 192 套颜色方案。
- 74 组字体搭配。
- 99 条 UX 指南。
- 25 类图表建议。
- React、Vue、Next.js、Tailwind、Flutter、SwiftUI 等 22 类技术栈建议。

### 它会做什么

- 根据产品类型推荐设计风格、配色、字体和布局方向。
- 查询移动端、Dashboard、SaaS、教育产品等常见体验规范。
- 按技术栈给出实现注意事项。
- 生成设计系统建议，但建议只作为参考，不会覆盖项目已有产品事实。

### 适合什么时候使用

- “用 UI UX Pro Max 查一下教育类学习工具适合的设计方向。”
- “给 English World 推荐一套兼顾阅读和后台操作的配色。”
- “查询 React Dashboard 的可访问性和性能注意事项。”

### 项目安全设置

- 默认完全离线查询，不访问网络。
- 默认不写入项目文件。
- 只有显式使用 `--persist` 并指定项目内 `--output-dir` 时才保存设计系统。

入口文件：[SKILL.md](ui-ux-pro-max/SKILL.md)

来源记录：[SOURCE.md](ui-ux-pro-max/SOURCE.md)

## 4. web-design-guidelines

目录：[web-design-guidelines](web-design-guidelines/)

这是基于 Vercel Web Interface Guidelines 的确定性检查 Skill，偏向“页面是否符合
基础 Web 规范”，而不是决定页面应该采用什么视觉风格。

### 它主要检查什么

- 按钮、链接和可点击区域是否使用正确语义。
- 键盘操作、焦点、`aria-label` 和表单标签是否完整。
- 加载、错误、空状态和下一步提示是否清楚。
- 页面状态是否能通过 URL、刷新和前进后退恢复。
- 响应式布局是否溢出、遮挡或出现移动端能力断层。
- 危险操作、未保存内容和导航离开是否有保护。

### 适合什么时候使用

- “用 Web Design Guidelines 检查这个页面。”
- “检查移动端导航和表单的可访问性。”
- “看看这些 React 组件有没有不符合 Web 规范的地方。”

### 项目安全设置

- 使用固定 commit 的本地规则快照，可以离线、稳定复查。
- 规则只用于检查，默认不会修改产品代码。
- 只有用户明确要求刷新 Skill 时，才更新上游规则快照。

入口文件：[SKILL.md](web-design-guidelines/SKILL.md)

来源记录：[SOURCE.md](web-design-guidelines/SOURCE.md)

## 四个 Skill 如何配合

可以把它们理解成一个小型产品团队：

1. `english-world-ux-product-audit` 负责选择用户任务、收集证据和确定需求优先级。
2. `impeccable` 负责深入评估页面设计质量，并在获批后提供设计或实现方案。
3. `ui-ux-pro-max` 提供风格、配色、字体、交互和技术栈参考。
4. `web-design-guidelines` 提供客观、可重复的 Web 规范检查。

默认推荐流程：

```text
真实用户任务
  -> English World 产品审计
  -> 中文需求 Backlog
  -> 产品确认
  -> Impeccable 设计/改版
  -> Web Guidelines 规则复查
  -> 桌面端与移动端浏览器验收
```

## 常用指令示例

```text
使用 $english-world-ux-product-audit 审计 Context Lab 的生成、失败、重试和答题恢复。
```

```text
使用 Impeccable critique 评审移动端今日学习页面，只输出问题，不修改代码。
```

```text
使用 UI UX Pro Max 查询教育类学习 Dashboard 的设计系统参考，不要持久化文件。
```

```text
使用 Web Design Guidelines 检查 MobileContextLabPage.tsx 的可访问性和交互语义。
```

## 已有审计产物

- [English World UX 基线审计](../../docs/superpowers/research/2026-07-30-english-world-ux-baseline-audit.md)
- [Skill 前向验证与基线对比](../../docs/superpowers/research/2026-07-30-ux-skill-baseline-eval.md)

## 维护规则

- 第三方 Skill 的来源和固定 commit 记录在各自的 `SOURCE.md`。
- 不要直接从不固定的 `main` 分支覆盖本地 Skill。
- 更新后需要重新执行结构校验、安全检查和前向测试。
- 项目专属规则优先于第三方通用建议。
