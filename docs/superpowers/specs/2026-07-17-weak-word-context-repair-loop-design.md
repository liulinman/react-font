# English World 薄弱词语境修复闭环设计

Date: 2026-07-17

## 目标

在只新增一张轻量漏斗事件表、不新增词级学习状态表且不破坏普通 Context Lab 和现有复习流程的前提下，把“复习真实错词 → 微语境验证 → 次日优先复查”串成桌面端可恢复闭环。产品需求以 [PRD](../prds/prd-english-world-2026-07-17/prd.md) 为准。

## 核心设计决策

- 一次最多处理 3 个真实错词，与固定 3 道题建立一词一映射。
- 微语境是 Context Lab 的可选 `micro` 模式，默认仍为普通 IELTS 长文。
- `targetWord` 进入题目结构并贯穿任务、提交结果和前端展示。
- 昨日错词由 `recite_history` 动态计算，不新增学习状态表。
- `reciteSessionId` 持久关联语境任务，并提供按回合恢复复习结果的只读接口。
- 微语境创建前由后端从本人回合重新推导修复词并逐项校验，客户端查询参数不能成为事实来源。
- `learning_loop_event` 持久保存最小漏斗事件；学习调度仍只读现有复习历史。
- AI 负责受限内容和解释，规则负责判题、归因、日期边界和任务状态。

## 用户流程

### 流程 A：本轮错词进入微语境

1. 用户提交 Recite 回合，后端先持久化 session 和逐词 history。
2. 前端从 `AnswerResult[]` 按出现顺序提取错词、去重并截取 3 个。
3. 结果页存在修复词时显示次按钮“用错词做语境练习”，附约 3 分钟和单词数量。
4. 点击后导航到 Context Lab，查询参数包含 `mode=micro`、`source=recite-result`、`reciteSessionId` 和修复词。
5. Context Lab 识别微语境入口，隐藏普通来源配置，展示修复词和生成状态，并自动创建一次异步任务。
6. SSE 继续负责任务更新；刷新页面可通过 `taskId` 恢复。
7. 用户完成 3 道题；结果按 `targetWord` 显示语境通过和待修复词。
8. 生成失败或页面刷新时，用户可以通过 `reciteSessionId` 返回并恢复原 Recite 结果。

### 流程 B：次日优先复查

1. “今天”页面请求 Daily Coach 时继续传入当前时区。
2. `ReciteService` 把客户端分钟时区偏移转换为上一自然日的 UTC 查询区间。
3. 在区间内按时间倒序读取当前用户答题历史；每个 wordId 只使用最后一次结果。
4. 最后一次仍为错误且距离请求至少 8 小时的词成为昨日错词，按最后错误时间和 history id 降序返回最多 3 个。
5. Daily Coach 将它们合并到 weakWords 顶部，并把第一行动改为“昨日错词复查”。
6. 点击行动继续复用现有 `wordIds` 定向 Recite 路径。

## API 与数据模型

### 生成请求

`GenerateExerciseDto` 增加：

```ts
enum ExerciseMode {
  STANDARD = "standard",
  MICRO = "micro",
}

mode?: ExerciseMode;
reciteSessionId?: number;
```

- 缺省或 `standard`：沿用普通 Context Lab，至少 3 个词，700–900 词，5 题。
- `micro`：必须为 `sourceType=custom`，1–3 个词，120–180 词，3 题，并携带属于当前用户的 reciteSessionId。
- 后端先查询本人 reciteSession 和 history，按原顺序推导前 3 个去重错词；传入 words 必须逐项完全一致，否则返回 `MICRO_REQUEST_INVALID` 且不创建任务。
- `mode` 与 `reciteSessionId` 保存在任务 `requestJson`；只为漏斗事件增加独立迁移。

### 题目模型

`ExerciseQuestionItem`、`ExerciseQuestionWithAnswer`、Webhook question DTO 和前端 `ContextLabQuestion` 增加可选字段：

```ts
targetWord?: string;
```

普通模式允许缺省；微模式必须存在，规范化为修复词中实际拼写。微模式输出校验要求：

- 恰好 3 道有效题；
- 每题 4 个非空选项和合法 correctIndex；
- 每题目标词属于任务词集合；
- 每个任务词至少被一道题覆盖；
- 文章正文 120–180 个英文词，并包含全部任务词。

### 任务响应

`mapTask` 从 `requestJson` 返回 `mode`，前端据此渲染微模式标题、预计时长和结果文案。旧任务没有 `mode` 时视为 `standard`。

### Recite 回合恢复

新增只读 DTO 和端点：

```ts
POST /recite/session-result
{ sessionId: number }
```

返回原 session 统计及按 history id 升序排列的逐词结果。查询必须同时匹配 `sessionId` 与 `userId`；不存在或非本人统一 404。Recite 结果页在 URL 包含 sessionId 时调用该接口恢复，不在 localStorage/sessionStorage 保存答案。

### 提交结果

单题结果增加 `targetWord?`。微模式的 `weakWords` 只取错误题的 `targetWord`，去重后返回；普通模式保持兼容逻辑。本次会同时把普通模式的归因改为“有 targetWord 时优先使用，缺省才回退旧逻辑”，避免破坏历史任务。整组重试复用同一任务和题目，每次提交新增 attemptId，首次证据不覆盖。

### Daily Coach

Daily Coach 新增 `timezoneOffsetMinutes`，同时兼容现有 `timezone` 小时字段。`ReciteService` 新增只读能力：

```ts
getPreviousDayMistakeWords(
  userId: number,
  timezoneOffsetMinutes: number,
  limit?: number,
): Promise<Array<{ wordId: number; englishWord: string }>>
```

日期算法：

1. 优先使用 `timezoneOffsetMinutes`，范围 `[-720, 840]`；兼容旧小时字段，缺失或非法默认 `480`。
2. 将当前时刻按分钟偏移转换为用户本地日期。
3. 构造本地昨日 `00:00:00.000` 与今日 `00:00:00.000`。
4. 减去偏移得到 UTC 区间 `[start, end)`。
5. 查询当前用户区间记录，按 `createTime DESC, id DESC`。
6. 首次遇到 wordId 即为昨日最后一次结果；仅保留 `isCorrect=false` 且距请求至少 8 小时的记录。

Daily Coach 合并规则：昨日错词在前，静态低等级词在后，按 wordId 去重，摘要最多 8 个。

### 效果关联

处理组由数据库事实确定：任务 `requestJson.reciteSessionId` 指向来源回合、`wordsJson` 给出已验证修复词、最早任务的首次 attempt 给出实际完成处理。下一自然日的 `recite_history` 再按 wordId 和 8–36 小时窗口关联；只有生成但未完成 attempt 的词不进入处理组。同期未完成首次 attempt 的真实错词作为观察性对照。入口曝光、开始和普通复习完成率从持久事件表读取，不从浏览器内存反推。

### 学习漏斗事件

新增 `POST /learning-loop/events` 和 `learning_loop_event`：`eventUid`、`flowId`、事件名、userId、可选 reciteSessionId/contextTaskId/attemptId、wordCount、elapsedSeconds、timezoneOffsetMinutes、status、createTime、expireTime。`(userId,eventUid)` 唯一，默认 180 天到期。服务端校验所有关联记录属于当前用户且 task/session/attempt 关系一致；payload 不接受答案、题目、文章或解释文本。普通复习用同一 flowId 记录 start/completed，其他事件用稳定实体 ID 生成 eventUid。

## 前端信息架构

### Recite 结果页

- 有错词时保留“再练错词”为主按钮。
- 新增“用错词做语境练习”为次按钮，使用实验/文章类图标，不使用裸箭头替代动作语义。
- 按钮文案下方或旁边显示“3 个词 · 约 3 分钟”。
- 全对时不显示入口。

### Context Lab 微模式

- 进入时页面标题改为“错词语境巩固”，副标题说明“用一段短文确认你是否真的会用”。
- 首屏只展示修复词、预计时长、生成/失败状态；隐藏普通来源、数量和历史筛选。
- 生成成功后继续复用阅读与作答工作区，但微模式不展示 PDF 下载和批量导入等次要操作。
- 结果按目标词组织，文案使用“语境通过”“还需复查”“下一自然日再确认”。“整组再答一次”清空选择但不覆盖首次 attempt。

### Daily Coach

- 存在昨日错词时第一行动标题为“复查昨日错词”。
- 描述为“这 N 个词昨天最后一次没有答对，今天先确认一次。”
- 行动使用现有定向复习按钮样式，不新增高饱和卡片。

## 错误与降级

- 请求参数不合规：前端提示修复词或来源回合无效，并返回今日路线，不自动降级为普通生成。
- AI 调用失败：任务进入 failed，展示重试；Recite 结果不受影响。
- AI 输出不合规：后端不落成功文章，返回可恢复错误，不用宽松解析制造假成功。
- AI 解释失败：返回规则判题和基础兜底解释“本题重点是 X，请对照正确选项后再试一次”。
- SSE 断开：保留轮询/手动刷新现有能力；不重复创建任务。
- 昨日错词查询失败：Daily Coach 降级到原低等级词路线，不让今日页整体失败，并记录不含答案的结构化服务端警告。

## 兼容策略

- 所有新增请求字段均可选，默认走旧行为。
- `targetWord` 对历史题目可选，旧任务可正常查看和提交。
- 不更改现有学习数据表；任务模式保存在 `requestJson`，题词映射保存在现有 JSON 字段，只新增独立漏斗事件表。
- `timezoneOffsetMinutes` 为新字段，旧 `timezone` 小时字段仍被接受。
- 不触碰后端当前 `english` 模块的未提交修改。
- 前端不覆盖当前统计时间线和 CSS 的未提交修改；新增样式尽量放在相关页面已有选择器附近。

## 测试设计

### 后端

- DTO：standard/custom 仍至少 3 词；micro/custom 接受 1–3 词并拒绝 0 或 4+。
- 生成：微提示词约束、结构校验、targetWord 规范化、普通模式回归。
- 提交：错误题按 targetWord 归因；解释失败仍持久化结果；历史题目兼容。
- Recite：按 session 恢复结果；正负与半小时偏移、跨 UTC 日界、8 小时下限、同词多次最后结果、用户隔离、limit。
- Daily Coach：昨日错词优先、去重、无昨日记录回退、查询失败降级。
- Webhook：微模式 3 题可成功，普通模式仍需原题数；重复回调幂等。
- 事件：本人关联校验、关系一致、eventUid 幂等、180 天到期字段和敏感 payload 拒绝。

### 前端

- 修复词提取：过滤正确项、去重、保持顺序、最多 3 个。
- 结果页：有/无错词按钮状态、图标、导航参数和原动作回归。
- Context Lab 参数解析：micro/source/words/taskId 恢复。
- 微模式：自动创建一次任务、隐藏普通配置、失败重试、结果文案和 targetWord 展示。
- Daily Coach：昨日任务标题和 wordIds 路由。
- 全量单元测试、类型检查、生产构建和修改文件 lint。

## 验收

- UJ-1 与 UJ-2 全流程可在桌面浏览器完成。
- 微语境严格为 1–3 词、120–180 个空白分隔英文 token、3 题，每题有合法目标词。
- 复习结果保存不依赖 AI；失败可恢复。
- 昨日错词来自真实历史，按分钟时区偏移和 8 小时下限计算。
- 普通 Context Lab、旧任务、复习、词库、统计和现有路由不回归。
- Gemini 审核返回 PASS；否则继续修正并复审。

## 自审结论

- 范围明确：只做昨日错词 MVP，不暗含完整 SRS。
- 数据口径明确：语境通过不等于长期掌握。
- 兼容路径明确：可选字段和 JSON 扩展，不迁移数据库。
- 错误路径明确：AI、SSE、日期查询均有降级。
- 无占位符、无阻塞开放问题，可进入实施计划。
