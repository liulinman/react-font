# English World UX 产品审计 Skill 实施计划

> **供 Agent 执行：** 必须使用 `superpowers:subagent-driven-development`（推荐）
> 或 `superpowers:executing-plans`，按任务逐项实施并使用复选框跟踪。

**目标：** 在 `react-font` 项目内安装 UI/UX Skill 组合，创建中文的
English World 专属审计 Skill，并产出第一次有证据、可验收的体验需求 Backlog。

**架构：** 第三方 Skill 分别提供体验批评、设计系统查询和客观 Web 规则检查，
项目专属 Skill 负责选择用户任务、读取前后端事实、控制证据质量、评定严重度并输出需求。
所有审计保持只读，需求确认与代码实现分成独立任务。

**技术栈：** Agent Skills、Markdown、Codex 多 Agent、Playwright/Chrome、
React/Vite、Git、Python 3。

## 全局约束

- 所有 Skill 安装在 `react-font/.agents/skills/`，不得安装到用户全局目录。
- Skill、审计报告和需求 Backlog 默认使用中文。
- 审计可以读取兄弟目录 `../nestjs`，但不得修改前后端产品代码。
- 外部事实必须给出来源；观察、事实、用户证据和推断必须分开标记。
- P0/P1 必须有可复现的任务阻塞或严重学习闭环影响，不能只依据视觉偏好。
- 第一轮只输出需求，不自动修复 UI，不执行部署。

---

### 任务 1：建立未加载项目 Skill 的基线

**文件：**
- 创建：`docs/superpowers/research/2026-07-30-ux-skill-baseline-eval.md`

**接口：**
- 输入：`apps/english-world` 源码、现有测试和同一条 Context Lab 审计提示。
- 输出：基线 Agent 的发现、遗漏和不合格模式，供任务 4 的 Skill 规则使用。

- [ ] **步骤 1：启动独立基线 Agent**

使用不包含本计划结论的提示：

```text
请只读审计 English World 的“用户生成一个标准 Context Lab 练习并开始作答”
流程。检查现有前端源码、测试和文档，输出体验问题与改进需求，不要修改文件。
```

- [ ] **步骤 2：确认基线结果暴露真实缺口**

至少检查以下项目是否遗漏：

```text
是否读取已有规格
是否定义任务开始和成功状态
是否区分事实、观察和推断
是否检查生成等待、失败、重试、历史和恢复
是否同时覆盖桌面端与移动端
是否给出严重度、置信度和可验收需求
是否避免把视觉偏好写成高优先级需求
```

- [ ] **步骤 3：保存基线评估**

在基线文档中记录原始提示、Agent 摘要、遗漏清单和需要由项目 Skill
强制执行的规则。

- [ ] **步骤 4：提交基线**

```bash
git add docs/superpowers/research/2026-07-30-ux-skill-baseline-eval.md
git commit -m "test(english-world): capture UX audit skill baseline"
```

### 任务 2：项目级安装第三方 UI/UX Skills

**文件：**
- 创建：`.agents/skills/impeccable/**`
- 创建：`.agents/skills/ui-ux-pro-max/**`
- 创建：`.agents/skills/web-design-guidelines/**`

**接口：**
- 输入：经过审查的 GitHub Skill 源码。
- 输出：三个可由项目 Agent 发现的 Skill 目录。

- [ ] **步骤 1：记录安装前状态**

```bash
find .agents/skills -maxdepth 2 -type f 2>/dev/null | sort
git status --short
```

- [ ] **步骤 2：安装 Impeccable 到临时目录并检查内容**

在临时目录运行官方安装器，确认没有修改 shell 配置、全局 Skill 或项目产品源码，
然后只复制 `.agents/skills/impeccable` 到当前仓库。

- [ ] **步骤 3：安装 UI UX Pro Max 到临时目录并检查内容**

使用官方 CLI 的离线项目安装模式生成 Skill，确认 Python 脚本不访问网络，
然后只复制 `.agents/skills/ui-ux-pro-max` 到当前仓库。

- [ ] **步骤 4：安装 Vercel Web Design Guidelines**

使用 Codex Skill Installer：

```bash
python3 /Users/liulin/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
  --repo vercel-labs/agent-skills \
  --path skills/web-design-guidelines \
  --dest .agents/skills
```

- [ ] **步骤 5：检查安装范围**

```bash
git status --short
find .agents/skills -maxdepth 3 -type f | sort
rg -n "/Users/|~/.|curl |wget |rm -rf" .agents/skills
```

不允许出现项目外写入指令或未经说明的网络执行脚本。

- [ ] **步骤 6：提交第三方 Skills**

```bash
git add .agents/skills/impeccable .agents/skills/ui-ux-pro-max \
  .agents/skills/web-design-guidelines
git commit -m "chore(english-world): add project UI UX skills"
```

### 任务 3：初始化项目专属审计 Skill

**文件：**
- 创建：`.agents/skills/english-world-ux-product-audit/SKILL.md`
- 创建：`.agents/skills/english-world-ux-product-audit/agents/openai.yaml`
- 创建：`.agents/skills/english-world-ux-product-audit/references/product-map.md`
- 创建：`.agents/skills/english-world-ux-product-audit/references/audit-rubric.md`
- 创建：`.agents/skills/english-world-ux-product-audit/references/requirement-template.md`

**接口：**
- 输入：用户指定的用户路径，或默认的关键学习路径。
- 输出：中文审计报告和 Top 10 产品需求 Backlog。

- [ ] **步骤 1：使用官方初始化脚本生成目录**

```bash
python3 /Users/liulin/.codex/skills/.system/skill-creator/scripts/init_skill.py \
  english-world-ux-product-audit \
  --path .agents/skills \
  --resources references \
  --interface "display_name=English World UX 产品审计" \
  --interface "short_description=把真实体验问题转成有证据、可验收的中文产品需求" \
  --interface "default_prompt=审计 English World 的一个用户任务，输出按严重度排序的中文需求 Backlog。"
```

- [ ] **步骤 2：编写产品地图**

产品地图必须列出登录、今日计划、词库、复习、Context Lab、IELTS、
Memory Map、通知、移动端和后台，并为每个模块给出前端入口、主要测试和后端依赖。

- [ ] **步骤 3：编写审计量表**

量表必须包含任务完成、信息架构、反馈与系统状态、一致性、容错与恢复、
可访问性、响应式、学习正确性、性能感知和内容清晰度，并定义 P0-P3。

- [ ] **步骤 4：编写需求模板**

模板必须要求 ID、用户目标、复现、证据、根因、严重度、置信度、影响、
推荐需求、验收标准、端范围、依赖和非目标。

- [ ] **步骤 5：编写最小 SKILL.md**

Skill 必须：

```text
先读取产品地图
选择并定义一个任务
检查既有规格与测试
要求真实浏览器证据
先用 impeccable critique，再用 web-design-guidelines
仅在需要视觉系统参考时使用 ui-ux-pro-max
去重根因
输出中文需求
在产品确认前停止
```

- [ ] **步骤 6：运行结构验证并确认通过**

```bash
python3 /Users/liulin/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  .agents/skills/english-world-ux-product-audit
```

预期输出：`Skill is valid!`

- [ ] **步骤 7：提交项目 Skill**

```bash
git add .agents/skills/english-world-ux-product-audit
git commit -m "feat(english-world): add UX product audit skill"
```

### 任务 4：运行 Skill 绿灯验证

**文件：**
- 修改：`docs/superpowers/research/2026-07-30-ux-skill-baseline-eval.md`

**接口：**
- 输入：与任务 1 完全相同的 Context Lab 审计提示。
- 输出：加载项目 Skill 后的结果与逐项对比。

- [ ] **步骤 1：在全新 Agent 上下文运行项目 Skill**

```text
使用项目中的 english-world-ux-product-audit Skill，只读审计 English World
的“用户生成一个标准 Context Lab 练习并开始作答”流程，不要修改文件。
```

- [ ] **步骤 2：检查绿灯条件**

必须同时满足：

```text
引用至少一个现有规格或测试
定义任务开始与成功状态
覆盖成功、等待、失败、重试、恢复
区分事实、观察和推断
包含桌面端和移动端
每个需求都有严重度、置信度和验收标准
输出中文
没有修改产品代码
```

- [ ] **步骤 3：修补 Skill 漏洞并重复验证**

只修改导致验证失败的规则或参考文件；每次修改后重新运行
`quick_validate.py`，直到全部绿灯条件通过。

- [ ] **步骤 4：提交验证结果**

```bash
git add .agents/skills/english-world-ux-product-audit \
  docs/superpowers/research/2026-07-30-ux-skill-baseline-eval.md
git commit -m "test(english-world): verify UX audit skill behavior"
```

### 任务 5：运行第一次真实全站体验审计

**文件：**
- 创建：`docs/superpowers/research/2026-07-30-english-world-ux-baseline-audit.md`
- 创建：`docs/superpowers/research/assets/2026-07-30-ux-audit/*.png`

**接口：**
- 输入：本地 English World、测试用户、桌面和移动浏览器视口。
- 输出：带截图证据的中文 Top 10 产品需求 Backlog。

- [ ] **步骤 1：启动并确认本地前后端**

检查前端和后端现有启动方式，复用已运行服务；不得覆盖生产环境变量。

- [ ] **步骤 2：审计桌面端关键任务**

使用 1440×900 视口检查登录、今日计划、词库、复习、Context Lab、
Memory Map 和通知。每个问题保存截图和复现路径。

- [ ] **步骤 3：审计移动端关键任务**

使用 390×844 视口重复关键任务，重点检查导航可达性、文字溢出、
触摸区域、键盘遮挡、滚动容器和桌面功能缺失。

- [ ] **步骤 4：执行代码规则检查**

对问题涉及的前端文件运行 `web-design-guidelines`，并将确定性规则问题
与产品体验问题分栏记录。

- [ ] **步骤 5：生成中文基线报告**

报告必须包含：

```text
审计范围和限制
任务完成情况
证据索引
按 P0-P3 分类的问题
Top 10 需求 Backlog
建议优先验证的前三项
本轮明确不做的内容
```

- [ ] **步骤 6：检查只读边界**

```bash
git status --short
```

除 Skill、计划、审计报告和审计截图外，不得出现产品代码修改。

- [ ] **步骤 7：提交审计报告**

```bash
git add docs/superpowers/research/2026-07-30-english-world-ux-baseline-audit.md \
  docs/superpowers/research/assets/2026-07-30-ux-audit
git commit -m "docs(english-world): add UX baseline audit"
```

### 任务 6：最终验证与交付

**文件：**
- 检查：`.agents/skills/**`
- 检查：`docs/superpowers/research/**`

**接口：**
- 输入：全部安装和审计产物。
- 输出：可复用的项目 Skill、验证记录和中文需求 Backlog。

- [ ] **步骤 1：验证所有 Skill**

对四个 Skill 检查 frontmatter、名称、目录和项目外写入风险；对项目 Skill
再次运行 `quick_validate.py`。

- [ ] **步骤 2：检查提交范围**

```bash
git status --short
git log --oneline --max-count=8
git diff origin/yifeng/docker-compose...HEAD --check
```

- [ ] **步骤 3：汇报结果**

最终汇报必须给出安装目录、验证结果、审计报告路径、Top 3 需求和未执行事项。
