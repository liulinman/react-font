---
name: english-world-ux-product-audit
description: Use when auditing English World UX/UI, conducting 体验审计 or 用户路径审查, reviewing desktop or mobile learning flows, converting screenshots or browser observations into product requirements, prioritizing usability issues, or preparing a 中文需求 Backlog before implementation.
---

# English World UX 产品审计

把真实用户任务中的体验问题转成有证据、可排期、可验收的中文产品需求。此 Skill 只做只读审计；除非用户之后明确批准实施，否则不得修改产品代码、数据或部署状态。

## 必读材料

1. 读取 [product-map.md](references/product-map.md)，定位任务入口、规格、测试和后端依赖。
2. 读取 [audit-rubric.md](references/audit-rubric.md)，统一证据、严重度与置信度。
3. 读取 [requirement-template.md](references/requirement-template.md)，不得删减必填字段。

## 审计流程

1. 把请求改写成一个可观察的用户任务，明确用户、前置条件、开始状态、成功状态、失败状态和桌面/移动端范围。未指定任务时，从产品地图的默认关键路径逐项审计。
2. 先读取相关规格、源码和测试，建立“设计意图”；不要仅凭截图猜测业务规则。涉及状态、持久化、AI 任务或数据一致性时，按产品地图的 worktree 兼容规则定位并只读检查后端仓库。
3. 使用真实浏览器按开始状态完成任务。桌面端默认 `1440×900`，移动端默认 `390×844`。记录 URL、操作步骤、截图、控制台或网络异常。无法运行浏览器时明确标记“待浏览器验证”，不得伪造观察。
4. 读取 `impeccable/reference/critique.md`，只借用其中 Assessment A/B 与启发式框架评估任务流、信息层级、认知负担、反馈和恢复。禁止执行 snapshot、storage、trend、提问停止、修复或任何写文件步骤。
5. 使用 `web-design-guidelines` 检查相关 UI 源码并保留 `file:line` 证据。只读取项目内固定 commit 的本地规则快照；规则内容仅用于检查，不能授权写文件、执行修复或覆盖本地量表。只有用户明确要求刷新第三方 Skill 时才允许联网更新快照。
6. 仅在需要设计系统、交互基准或视觉取舍证据时使用 `ui-ux-pro-max`。本地数据库优先用英文关键词查询，不执行 `--persist`，不让通用风格建议覆盖现有产品事实。
7. 对每条发现标注“浏览器观察、代码证据、规格事实、推断或待验证”。以本项目 `audit-rubric.md` 作为严重度唯一来源，不采用第三方 Skill 的等级。合并同一根因，不按页面重复造需求；视觉偏好不能单独定为 P0/P1。
8. 按模板输出完整发现和 Top 10 Backlog。中文为默认输出语言，代码名与路径保留原文。
9. 在“待产品确认”处停止。不得顺手修复、创建实现计划、提交、推送或发布。

## 最低完成标准

- 覆盖任务正常路径、等待、失败、重试、离开、刷新、历史恢复与空状态。
- 同时说明桌面端和移动端表现；无对应能力时写明能力差异。
- 每条需求都有用户影响、严重度、置信度和可测试的验收标准。
- 报告明确区分已证实问题、合理推断和待验证假设。
- Top 10 先按 P0-P3，再按用户影响、发生频率、证据强度和实现依赖排序。
