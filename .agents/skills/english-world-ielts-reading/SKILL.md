---
name: english-world-ielts-reading
description: Use when 出雅思阅读题、按雅思难度生成阅读练习、在管理端逐题审核、发布或补发给指定学生、撤回或查看完成情况；只覆盖 English World 现有阅读练习链路，不包含听力、写作、口语，也不替代 PRD 或功能开发。
---

# English World 雅思阅读出题与发布

把「按雅思难度出题 → 管理端审核 → 发布到指定学生」做成可重复、可追溯的运营流程。真实执行入口是管理端阅读练习 API；不另建题库，不改产品代码，不绕过服务端校验。

默认参数沿用 Web 新建页：**5 题、雅思 6.0、400 词、选择题 + 判断题**。发布默认**指定学生**，不默认全量。

## 先读事实

在开始前按顺序读取，避免把历史资料或代码推断当成已确认需求：

1. `react-font/AGENTS.md` 和 `nestjs/AGENTS.md`（若存在）。
2. `react-font/docs/prd/reading/prd.md` 及本次涉及的功能 PRD，至少：
   - `features/creation-ui/prd.md`（新建参数、发布确认、幂等）
   - `features/sentence-completion/prd.md`（填空边界）
   - `features/automatic-review/prd.md`（AI 检查、阻断问题）
   - `features/add-recipients/prd.md`（补发、接收人语义）
3. `references/ielts-scope-and-review.md`：出题范围、难度校准和逐题审核标准。
4. `references/admin-api.md`：真实接口、状态机、请求体和错误处理。

需求、代码和实际运行证据分别核对。实现偏差不要写成已确认需求；PRD 没有覆盖的能力不要假装支持。

## 能力边界

只做**阅读练习**，使用系统内置 AI 生成器。当前生成接口的真实限制：

| 项目 | 当前支持 |
|---|---|
| 难度 | 雅思 5.0–7.5，0.5 递增 |
| 文章长度 | 200–800 词 |
| 题量 | 3–13 题 |
| 题型 | `choice`、`true_false_not_given`、`sentence_completion`，最多 3 种 |
| 接收范围 | 全部学生或指定学生（最多 1000 人，仅 active） |
| 发布后 | 补发、撤回、完成情况与成绩分析 |

明确**不支持**：

- 听力、写作、口语；需要这些内容时说明当前没有对应链路，不要用阅读接口冒充。
- 雅思阅读的其余官方题型（标题匹配、信息匹配、摘要填空、图表标注、简答等）。`matching_features` 虽出现在部分类型声明中，但生成配置校验会拒绝；不要传入，也不要把其他题型改个名字混过去。
- 「完整雅思套题」。PRD 明确当前句子填空与题型覆盖不是完整雅思考试实现；对外表述用「雅思阅读练习（当前支持题型）」，不要说「完整雅思题库」。

用户要求超出接口上限时（例如雅思 8.0、1000 词、20 题），先说明真实上限，再让用户选择调整参数或放弃；不要静默截断到 7.5/800/13 后当作已满足。

## 运行准备

从 `react-font/` 执行。脚本无第三方依赖，要求 Node 18+。

```bash
export ENGLISH_WORLD_API_BASE="http://127.0.0.1:3000"
export ENGLISH_WORLD_ADMIN_USERNAME="<管理员账号>"
export ENGLISH_WORLD_ADMIN_PASSWORD="<管理员密码>"

node .agents/skills/english-world-ielts-reading/scripts/ielts-admin.mjs login
```

规则：

- 优先从环境变量读取凭据；变量未设置时向用户询问。**不要把密码、cookie 或 token 写进仓库、日志、提交信息或回复。**
- 本地后端默认是 `http://127.0.0.1:3000`；管理端前端可能走 `/api` 代理。以 `login` 后 `GET /admin/me` 成功为准，不要猜生产地址。
- API 基址不是 localhost 时，视为生产/线上环境：先说明环境，得到用户明确授权后才执行写操作；本 skill 的冒烟测试只在本地或测试环境做。
- 所有写命令都有对应 `requestUid`。脚本会在发送前打印；重试必须复用同一个 `requestUid` 和完全相同的参数。改参数必须换新 `requestUid`，否则服务端返回 409。

## 标准流程

### 0. 收齐并确认出题单

必须明确：

- 主题/生成要求（`topic`）：雅思阅读常见话题域内，具体到可写出一篇文章，例如「城市自行车共享计划的实施与争议」。
- 难度（`ieltsBand`）：默认 6.0；用户说「雅思难度」但没给分数时，用 6.0 并说明。
- 词数（`wordCount`）：默认 400。
- 题量（`questionCount`）：默认 5。
- 题型（`questionTypes`）：默认选择题 + 判断题；填空只在用户需要时加入。
- 接收人：姓名或用户名。**没有明确接收人时只能生成和审核，不能发布。**
- 环境：本地/测试还是线上。

先向用户复述一行业务摘要（主题、band、词数、题量、题型、接收人、环境），确认后再开始生成。生成会消耗 AI 调用，不要未经确认连续重试。

### 1. 验证管理员会话

```bash
node .agents/skills/english-world-ielts-reading/scripts/ielts-admin.mjs login
```

失败按错误码处理：`4001` 是账号/密码或会话问题；网络错误先确认 API 基址和后端是否启动。

### 2. 解析接收人

```bash
node .agents/skills/english-world-ielts-reading/scripts/ielts-admin.mjs users --search "张三"
```

- 管理端只按 `username` 模糊搜索，不按昵称/邮箱搜索；同名或搜不到时让用户补充准确用户名或用户 ID。
- 只接受 `status=active` 的学生；停用用户会让整次发布失败。
- 发布前把「用户名 → 用户 ID」列表给用户确认，不要自行猜测。

### 3. 生成草稿

```bash
node .agents/skills/english-world-ielts-reading/scripts/ielts-admin.mjs create \
  --topic "城市自行车共享计划的实施与争议" \
  --band 6.5 --words 400 --questions 6 \
  --types choice,true_false_not_given
```

脚本会打印 `practiceId` 和 `requestUid`，记下来用于重试和后续审核。创建成功只代表任务入队，不代表内容可用。

### 4. 等待生成完成

```bash
node .agents/skills/english-world-ielts-reading/scripts/ielts-admin.mjs wait <practiceId>
```

- `queued` / `generating` 继续等待；`draft` 才进入审核；`failed` 读取 `failureSummary`。
- 失败最多 `retry` 一次；再次失败就停止，把原因告诉用户，不要用修改主题或参数的方式反复烧调用。
- 超时不等于失败：重新 `get` 当前状态，不要重复创建。

### 5. AI 质量检查

```bash
node .agents/skills/english-world-ielts-reading/scripts/ielts-admin.mjs check <practiceId>
```

`check` 可能自动修正引用段号或补全缺失答案，从而**递增 revision**。检查后必须重新 `get --json`，以最新 revision 和 content 为准。

### 6. 逐题审核（核心）

先取完整内容：

```bash
node .agents/skills/english-world-ielts-reading/scripts/ielts-admin.mjs get <practiceId> --json
```

然后按 `references/ielts-scope-and-review.md` 的清单，**自己独立做题并核对**，不要只看 AI 检查结果：

1. 不读答案，先根据文章回答每一题。
2. 对照 `correctIndex` / `acceptedAnswers` / `explanation` / `evidence`。
3. 逐题检查：答案是否唯一、证据是否是所标段落的原文子串、解析是否解释得通、判断题是否严格区分 False 与 Not Given、填空题是否只有一个空且答案来自原文、选择题干扰项是否确实错误。
4. 全卷检查：题量、题型覆盖、词数偏差、重复题、答案分布、话题是否在雅思范围、band 是否匹配。
5. 目标 band 6.5 及以上时，额外检查难度下限：如果 5 题里至少 3 题只靠单句定位、干扰项都明显错误，或没有跨段整合/推断题，判定为低于目标难度，退回重做；不要因为配置写了 6.5 就当作实际 6.5。
6. 运行 `issues` 查看服务端未解决问题：

```bash
node .agents/skills/english-world-ielts-reading/scripts/ielts-admin.mjs issues <practiceId>
```

审核结论必须能落到每题：`通过` 或 `需修改`。不能因为服务端 `confirmAll` 可用就跳过阅读。

### 7. 修复问题

- 答案键错误、解析错误、题干/选项问题：用 `get --json` 导出，编辑 `content` 后保存：

```bash
node .agents/skills/english-world-ielts-reading/scripts/ielts-admin.mjs save <practiceId> \
  --file ./practice-content.json --save-check
```

- 保存会递增 revision，并重置 `qualityRevision` / 已审核题目；保存后重新运行 `check` 和逐题审核。
- 只允许关闭 `type=ai` 的误报，并且必须给出理由和原文证据；`type=structure`（缺答案、引用找不到、选项非法等）不能作为误报关掉。
- 如果修复需要改变文章主旨、删题凑数或强行改题型，先停下来向用户说明，不要为了通过检查而降低题目质量。

### 8. 发布前确认

只有同时满足以下条件才允许发布：

- `status=draft`
- `workflow.qualityRevision === workflow.revision`
- 没有 `type=structure` 的阻断问题
- 没有未解决的 `blocking` 问题
- 每道题都经过本次人工/AI 审核

向用户展示确认摘要，等待明确的「发布」指令：

```text
练习：<标题>（ID <id>）
参数：雅思 <band> · <词数> 词 · <题数> 题 · <题型>
接收人：<N> 人（<username 列表>）
审核：<N> 题通过；修复 <N> 处；仍未解决 <N> 处
环境：<本地/测试/线上>
```

然后发布：

```bash
node .agents/skills/english-world-ielts-reading/scripts/ielts-admin.mjs publish <practiceId> \
  --target selected --user-ids 12,34 --confirm \
  --request-uid "<沿用或新生成>"
```

- 默认必须 `--target selected`。只有用户明确要求「发给全部学生」时才允许 `--target all --allow-all`，并在确认摘要里单独警示。
- 发布是外部可见动作：**每次都要重新确认接收人，不能沿用上次的授权。**
- 发布后服务端会创建通知和分配记录；不要重复发布。相同 `requestUid` 重试是幂等的，换接收范围必须换新 `requestUid`。

### 9. 发布后验证

```bash
node .agents/skills/english-world-ielts-reading/scripts/ielts-admin.mjs recipients <practiceId>
node .agents/skills/english-world-ielts-reading/scripts/ielts-admin.mjs get <practiceId>
```

核对：

- 练习状态是 `published`。
- 接收人数、用户名和用户 ID 与确认一致。
- `submitted` 只表示是否已提交，不等于通知已读或已送达；不要夸大投递结果。
- 如果发现接收人错误，立即报告并询问是否撤回；撤回只改变练习状态，不会自动抹掉已经产生的通知、分配或作答记录。

### 10. 发布后操作

```bash
# 追加接收人（仅已发布；最多 1000 人；幂等）
node .agents/skills/english-world-ielts-reading/scripts/ielts-admin.mjs assign <practiceId> \
  --user-ids 56,78 --confirm

# 撤回（仅已发布）
node .agents/skills/english-world-ielts-reading/scripts/ielts-admin.mjs withdraw <practiceId> --confirm

# 完成情况与成绩分析
node .agents/skills/english-world-ielts-reading/scripts/ielts-admin.mjs analytics <practiceId>
```

补发前先用 `recipients` 看当前名单，避免重复分配；已有接收人会被服务端跳过或拒绝，按真实返回汇报，不要自行推断。

## 停止并向用户确认的情况

- 接收人未明确、同名无法区分、包含停用用户。
- 生成连续失败两次，或失败原因指向提示词/供应商问题。
- 生成结果明显低于目标 band：例如目标 6.5，但多数题是单句直接定位、干扰项一眼可排除，或没有跨段整合/推断题；退回重做，不要用配置 band 冒充实际难度。
- 质量检查要求改动文章主旨、删掉用户要求的题型，或问题无法在不降低质量的前提下修复。
- 用户要求不支持的题型、完整雅思套题、听力/写作/口语内容。
- 环境是线上，但没有明确的发布授权。
- 内容涉及真实个人信息、近期新闻事实、医疗/法律建议、政治或宗教倾向、暴力或性内容。

## 不要做

- 不要在未读文章和题目的情况下调用 `publish --confirm`；`confirmAll` 不是审核。
- 不要默认发给全部学生；不要把「已创建分配」说成「通知已送达」。
- 不要直接改数据库、绕过 `check` 或把结构问题标成误报。
- 不要把管理员密码、cookie、token 或学生个人信息写进仓库和公开文档。
- 不要在线上环境创建测试练习或给真实学生发测试内容。

## 完成汇报

向用户汇报时至少包含：

- 练习 ID、标题、最终状态、发布时间。
- 雅思 band、词数、题数、题型。
- 接收人数和用户名；补发/撤回的实际结果。
- 审核中发现并修复的问题，以及仍未解决或属于能力限制的事项。
- 使用的是本地/测试还是线上环境。
- 如果只完成到草稿，明确说明「已生成并审核，未发布」及下一步需要用户确认的内容。
