---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - 'docs/superpowers/prds/prd-english-world-2026-07-18/prd.md'
  - 'docs/superpowers/prds/prd-english-world-2026-07-18/addendum.md'
  - 'docs/superpowers/specs/2026-08-04-multi-mode-vocabulary-learning-design.md'
  - 'docs/superpowers/specs/2026-07-30-english-world-ui-design-system-skill-design.md'
  - 'docs/superpowers/specs/2026-06-03-english-world-ai-learning-mvp-design.md'
  - 'docs/superpowers/specs/2026-06-22-context-lab-learning-loop-mvp-design.md'
  - 'docs/superpowers/specs/2026-06-26-recite-short-review-loop-design.md'
  - 'docs/superpowers/specs/2026-07-17-weak-word-context-repair-loop-design.md'
  - 'docs/superpowers/specs/spec-word-journey.md'
  - 'docs/superpowers/specs/2026-07-28-english-world-mobile-usability-design.md'
  - 'docs/superpowers/research/market-english-world-word-journey-2026-07-18.md'
  - 'docs/superpowers/research/2026-07-30-english-world-ux-baseline-audit.md'
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026-08-04'
project_name: 'English World 多模式混合背词系统'
user_name: '用户'
date: '2026-08-04'
---

# English World 多模式混合背词系统架构决策

_本文档通过分步协作逐项追加架构决策，确保后续前后端实现遵循一致的数据边界、状态模型和迁移策略。_

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

- 词库是学习入口：支持已选词或当前筛选范围，每轮 1–20 个词，默认推荐 8–12 个，并在开始前预览适配结果。
- 用户可选择 1–5 种模式；系统只从已选模式中按适配度、薄弱维度、到期状态和最近模式组成 2–4 分钟的短学习段。
- 五种活动共享“理解、主动回忆、验证”生命周期，但分别训练构词、语境、语义边界、听辨/拼写和输出。
- 普通词一轮只有一个主模式；错误、跳过或提示后正确的词可以在间隔若干项目后跨模式回收。
- 每次尝试形成词义识别、主动回忆、拼写、听辨、语境和输出六类逐词事实证据，并记录提示、评分状态和版本。
- 系统根据跨时间证据产生四级掌握建议和下一次复习；用户手动等级与系统等级、客观证据分开保存。
- AI 生成短文、辨析说明和输出反馈；确定性题目由规则评分，AI 待判定不能记成错误。
- 会话必须支持渐进准备、部分可用、暂停、刷新恢复、异步批改和结果复盘。
- 桌面端使用聚焦双栏，移动端使用独立单列阶段流程；业务能力一致而展示结构不同。
- 现有 Recite、Context Lab、Daily Coach 和 Memory Map 需要逐步接入统一证据，不允许一次性破坏旧入口。

**Non-Functional Requirements:**

- 正确性：正确答案、词根关系、掌握变化和复习调度不能由未校验的模型输出直接决定。
- 数据隔离：会话、内容、答案、证据和掌握档案的所有查询必须绑定当前用户；跨用户关联错误阻断发布。
- 幂等与一致性：创建会话、提交答案、异步回调和证据追加必须抵抗网络重试和重复事件。
- 可恢复性：失败保留选择、参数和答案；刷新后以服务端状态恢复，本地草稿只作为补充。
- 诚实反馈：明确区分准备、部分可用、提交、待判定、失败、过期和重连，禁止把系统故障表现为用户答错。
- 性能：预览与会话恢复使用批量查询，不产生逐词 N+1；首个可用学习段优先返回，后续内容渐进准备。
- 成本：确定性内容优先、3–5 词成组生成、版本化缓存、题目轮换和按需 AI 调用。
- 可访问性：状态不能只依赖颜色，键盘焦点可预测，移动触控目标至少 44px，输入字号和安全区符合项目规范。
- 兼容性：旧 `englishLevel`、Recite 历史、Context Lab 任务和 Memory Map 轨迹继续可读；新能力可由功能开关关闭。
- 可观察性：记录流程、生成、恢复、提示和跨日稳定指标，不把用户答案正文写入产品分析事件。

**Scale & Complexity:**

- Primary domain: React Web/移动 Web + NestJS API + 异步 AI 内容生成 + 个性化学习状态
- Complexity level: High
- Estimated architectural components: 14 个左右，包括入口预览、会话编排、五种活动、内容生成、评分、证据、掌握/SRS、结果、恢复和兼容适配
- Multi-tenancy: 共享数据库中的用户级隔离，不是组织级 SaaS 多租户
- Real-time: AI 内容和异步批改需要状态推送或轮询恢复，但不需要协同编辑
- Data volume: 单轮规模小，长期逐词证据持续增长；索引和保留策略比单次计算吞吐更关键

### Technical Constraints & Dependencies

- 前端仓库为 React 18、TypeScript 5.7、Vite、Ant Design 5/Ant Design Mobile、Vitest 和 Cypress。
- 后端是独立 NestJS 10 仓库，使用 Sequelize 6、MySQL、Jest；数据库变更通过显式 SQL migration 与手工维护模型文件完成。
- Redis 已存在但被定义为可选缓存优化，核心学习事实不能依赖 Redis 持久化。
- Context Lab 已有异步任务、Webhook、SSE 和 attempt；其 SSE 事件总线目前是单进程内存监听器，不能假设跨实例可靠投递。
- `english.english_level` 是可手动修改的旧字段，不能同时充当客观系统掌握状态和证据来源。
- `recite_history`、`recite_session`、Context Lab task/attempt 和 `learning_loop_event` 已提供部分事实，但粒度不足以承载六维证据和会话恢复。
- Memory Map 当前从既有记录即时推导 Word Journey；新掌握档案必须保留其“最新错误可回退、证据可解释”的产品原则。
- `EnglishWorld.tsx`、`ContextLabPage.tsx` 和移动端总页面已经较大，新学习域需要独立路由和功能目录，避免继续扩大现有编排组件。
- 当前主库是 MySQL；设计中提到的语义检索不能反向迫使主库迁移，也不能成为第一阶段核心闭环的硬依赖。
- 后端工作区存在用户自己的未跟踪计划文件，后续实施与提交必须保持隔离，不得纳入本功能提交。

### Cross-Cutting Concerns Identified

- 一个版本化、可判别的学习项目契约需要贯穿生成、存储、前端渲染、提交、结果和历史恢复。
- 用户授权、所有权校验和幂等键必须由服务端统一处理，不能分散在五种活动里。
- AI 内容生命周期和用户作答生命周期必须分离，避免生成失败污染答案或掌握状态。
- 证据是追加事实，掌握档案是可重建投影；两者必须能够独立演进和审计。
- SRS/掌握策略应是纯函数和版本化策略模块，页面与控制器只负责调用。
- 移动端和桌面端应共享契约、状态机与 view model，不共享强耦合布局组件。
- 旧入口迁移需要双读/适配和功能开关，不能通过一次全量历史回填制造虚假六维证据。
- 内容缓存、prompt/模型版本、音频来源和 embedding 版本需要统一可追溯元数据。

## Starter Template Evaluation

### Primary Technology Domain

Brownfield full-stack Web application：React/Vite 桌面与移动 Web、NestJS API、MySQL 持久化、Redis 可选缓存，以及外部 AI 内容生成。

### Starter Options Considered

1. **重新用当前 Vite React TypeScript 模板创建前端应用**：会丢失现有 Turbo workspace、认证、路由、Ant Design 主题、测试与大量已验证页面，收益为零。
2. **重新用 Nest CLI 创建后端应用**：官方当前 starter 提供标准模块结构，但现有 NestJS 10 服务已经具备认证、Sequelize、AI、Webhook、SSE 和测试。官方最新文档对新项目要求 Node.js 20+，重新脚手架会把运行时升级和功能交付耦合。
3. **引入新的全栈 starter 或迁入 Next.js**：与现有独立 API、双仓库部署和移动壳层冲突，且不解决本功能的核心数据问题。
4. **保留现有仓库并新增边界清晰的学习域模块**：最大化复用，允许通过功能开关和双读逐步迁移，是唯一符合 brownfield 风险模型的方案。

官方参考：

- [Vite Getting Started](https://vite.dev/guide/) 说明 Vite 已提供开发、构建和插件基础，无需为新增功能重新初始化应用。
- [NestJS First Steps](https://docs.nestjs.com/first-steps) 说明 CLI starter 的价值是建立新项目模块骨架；现有服务已经具备该骨架。
- [Sequelize v6](https://sequelize.org/docs/v6/) 仍是官方稳定文档线，并支持 MySQL 和事务。

### Selected Starter: Existing Repositories (No Re-scaffold)

**Rationale for Selection:**

- 本功能是现有产品中的新学习域，不是新应用。
- 继续使用项目已经部署和测试的技术，将风险集中在会话、证据和掌握策略本身。
- 新域可以通过 Nest module、独立前端 feature directory 和显式 migration 获得与 starter 相同的结构收益。
- React、NestJS、Sequelize 或 Node 大版本升级应另立技术项目，不与本功能混合。

**Initialization Command:**

无。实施从现有两个仓库和各自基线提交开始，不运行 `create-vite`、`nest new` 或全栈脚手架。

**Architectural Decisions Provided by Existing Baseline:**

**Language & Runtime:**

- 两端继续使用 TypeScript。
- 前端沿用 React 18.3 和现有 Node/pnpm workspace。
- 后端沿用 NestJS 10 与当前部署运行时；上线前单独核验实际 Node 版本，不在本功能内升级框架主版本。

**Styling Solution:**

- 桌面使用 Ant Design 5，移动使用 Ant Design Mobile，颜色和间距以现有主题 Token 为事实来源。
- 不增加第二套 CSS-in-JS、表单或组件框架。

**Build Tooling:**

- 前端继续使用 Vite、TypeScript project build 和 Turbo/pnpm。
- 后端继续使用 Nest CLI/TypeScript 编译。

**Testing Framework:**

- 前端使用 Vitest、Testing Library 和 Cypress。
- 后端使用 Jest，并为纯策略、服务与控制器分层测试。

**Code Organization:**

- 前端在 `apps/english-world/src/page/englishWorld/learning/` 建立独立功能目录和路由。
- 后端在 `src/interface/learning-session/` 建立独立 Nest module；掌握策略和活动契约使用同域内小模块。
- 不继续扩大 `EnglishWorld.tsx`、`ContextLabPage.tsx` 或 `ExerciseAgentService` 的职责。

**Development Experience:**

- 继续采用 TDD、每个可独立验收任务一个聚焦提交、跨仓库分别验证。
- SQL migration、Sequelize model 和 `init-models.ts` 必须在同一后端任务中同步更新。

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**

- MySQL 是学习事实的唯一持久化来源；Redis、SSE 和浏览器草稿都不能成为完成状态的唯一来源。
- 学习尝试、逐维证据、掌握投影和复习调度分层建模，不再让 `english_level` 同时承担四种语义。
- 五种活动使用同一个版本化判别联合契约，正确答案只保存在服务端。
- 确定性提交在一个 MySQL 事务内完成 attempt、evidence、mastery projection 和 session cursor 更新。
- AI 输出提交先持久化为 `grading_pending`；异步批改完成后通过相同 finalization transaction 追加证据。
- 会话 REST snapshot 是状态真值；SSE 只通知“可能有新状态”，断线后通过详情轮询恢复。
- 旧数据不批量伪造六维证据；新系统以 `legacy_baseline` 惰性建立掌握档案。

**Important Decisions (Shape Architecture):**

- 前端用 TanStack Query 管理服务端快照，用纯 reducer 管理活动交互，不增加 XState/Redux。
- 桌面和移动端共享 API、类型、状态 reducer 与 view model，但使用独立页面壳和活动布局。
- AI 内容和异步任务使用新学习域的通用内容/任务表，不继续扩展 Context Lab 的 article task 语义。
- 内容 payload 使用版本化 JSON 文本；需要筛选、关联和排序的字段保持规范化列。
- 生成成本通过分组、缓存、渐进准备和确定性评分控制。
- 功能开关、双读和旧入口适配用于渐进发布。

**Deferred Decisions (Post-MVP):**

- 独立向量数据库、pgvector 或主库迁移：当前 1–20 词会话没有足够规模收益。
- FSRS 参数训练和遗忘概率：先积累一致的逐词证据。
- Redis/BullMQ 任务队列：Redis 当前是可选依赖，第一版使用 MySQL 持久任务。
- 跨实例事件总线：第一版 SSE 为优化；真实扩容需要时再引入 Redis Pub/Sub 或消息中间件。
- 框架大版本升级：React、Vite、NestJS、Sequelize 和 Node 升级另立项目。

### Data Architecture

#### Authoritative Stores

- **MySQL**：会话、内容、任务、尝试、证据、掌握档案、调度和知识数据的事实来源。
- **Redis**：缓存可复用 AI 内容、热点只读资料和限流计数；Redis 不可用时核心学习仍可运行。
- **Local Storage**：只保存尚未提交的输入草稿和 UI 偏好；服务端已经接受的答案不依赖本地恢复。

#### Core Tables

| Table | Responsibility | Key constraints |
| --- | --- | --- |
| `learning_session` | 一轮混合学习的配置、状态和恢复游标 | `(user_id, session_uid)` unique；状态、当前 block/item 为规范化列 |
| `learning_session_word` | 原始选词顺序、适配结果、主模式与回收状态 | `(session_id, word_id)` unique；保存 source order |
| `learning_block` | 连续短学习段、模式、顺序与内容状态 | `(session_id, block_order)` unique |
| `learning_item` | 一个可提交活动项目和服务端答案契约 | `item_uid` unique；`prompt_json` 与 `answer_contract_json` 分开映射 |
| `learning_item_word` | item 与一个或多个目标词的关系 | `(item_id, word_id, role)` unique |
| `learning_attempt` | 用户提交、提示、评分状态和结果 | `(user_id, attempt_uid)` unique；pending/final 明确分离 |
| `learning_evidence` | 追加写入的逐词、逐维事实证据 | `(user_id, event_uid)` unique；final attempt 才能产生对掌握有影响的证据 |
| `word_mastery_profile` | 六维聚合、系统等级、手动覆盖与 SRS 投影 | `(user_id, word_id)` unique；带 `policy_version` 和乐观版本号 |
| `learning_mastery_override` | 用户每次手动等级设置/清除的审计与幂等事实 | `(user_id, override_uid)` unique；不伪装成客观 evidence |
| `learning_content` | 版本化活动材料与缓存元数据 | `cache_key` unique；记录 schema/prompt/model/quality 版本 |
| `learning_job` | `prepare_block`、`grade_output` 等持久异步工作 | `job_uid` unique；状态、重试、下次执行和 lease 列可查询 |

知识表按活动阶段增加：

- `root_morpheme`、`word_root_mapping`：全局审核词根和规范化英文映射。
- `user_mnemonic`：用户个人构词联想，不覆盖系统资料。
- `confusion_pair`、`user_confusion_pair`：全局与个人易混对；具体误选方向仍记录在 evidence。

#### JSON Boundary

- `selected_modes_json`、活动 prompt/answer contract、内容 envelope、维度聚合和 SRS 内部状态可使用 JSON 文本。
- 用户、单词、模式、状态、顺序、时间、幂等键、评分状态和版本必须是可索引列。
- 每个 JSON envelope 必须包含 `schemaVersion`，由集中 parser 读取；禁止在控制器和组件中直接 `JSON.parse` 后假定结构。

#### Submission Transaction

确定性答案提交：

1. 按当前用户锁定 session、item 和已有 attempt。
2. 使用 `attemptUid` 检查幂等；相同 payload 返回原结果，不同 payload 返回冲突。
3. 服务端按 item answer contract 评分。
4. 创建 final attempt，并为每个目标词追加一条或多条 evidence。
5. 用 `MasteryPolicyV1` 计算并更新 mastery profile 与 `next_review_at`。
6. 更新 session/item cursor；必要时插入延迟回收 item。
7. 在同一事务提交后发布本地更新通知。

开放输出提交：

1. 事务内保存 `grading_pending` attempt 和 `grade_output` job。
2. 立即返回待判定，不写正确/错误 evidence。
3. worker 取得数据库 lease，调用 AI 并校验结构。
4. finalization transaction 锁定 attempt；若尚未终态，则更新结果、追加 evidence、更新 mastery 和会话状态。
5. 重复 worker、回调或用户重试通过 `attemptUid/jobUid` 收敛到同一结果。

#### Mastery Projection

- `system_level` 由版本化策略根据 final evidence 计算。
- `manual_level` 可空；存在时成为 `display_level`，但不改变 `system_level`。
- `english.english_level` 在迁移期间同步 `display_level` 供旧页面读取。
- 旧词第一次进入新系统时，以当前 `english_level` 创建 `legacy_baseline`，不生成历史 evidence。
- 旧词库手动等级接口在功能启用后双写 manual override；关闭功能时保持旧行为。
- 每次会话最多自动跨一个等级；精通要求跨日期、多维证据，pending 不参与计算。

### Authentication & Security

- 沿用现有 cookie session 与 `AuthGuard`，不引入第二套身份系统。
- 所有学习 Controller 使用当前用户 ID；客户端提供的 userId 一律忽略或拒绝。
- 创建/预览只接受 word IDs，服务端批量查询并验证全部归属；客户端词文本不是事实来源。
- session、block、item、attempt、job 和 mastery 查询同时匹配实体 ID 与当前 userId；未找到和无权限统一返回资源不可用。
- 正确答案、rubric 内部阈值和 AI grading contract 在提交前不得出现在前端 DTO、SSE 或日志中。
- AI prompt 把用户文本放入有边界的数据字段，限制长度并要求结构化输出；模型输出经过 schema、目标词覆盖和答案唯一性校验。
- 生成与开放评分按用户限额；Redis 可加速计数，但最终配额可从 MySQL job/session 统计降级判断。
- 产品分析事件不保存答案、短文或解释正文；服务日志只记录实体 UID、状态、错误码、耗时和版本。
- 删除单词前必须检查学习关联策略：历史证据保留可审计快照或阻止硬删除，不能产生悬空外键。

### API & Communication Patterns

#### API Style

- 延续现有 JSON REST/command 风格和 `{ code, message, data }` 响应包装，不引入 GraphQL。
- 新路由集中在 `learning-session` 与 `learning-mastery` 模块，避免把五种活动暴露为五组无关 API。

主要能力：

```text
POST /learning-session/capabilities
POST /learning-session/preview
POST /learning-session/create
POST /learning-session/detail
POST /learning-session/submit
POST /learning-session/pause
POST /learning-session/complete
POST /learning-session/retry-job
GET  /learning-session/events?sessionId=...
POST /learning-mastery/override
POST /learning-mastery/word-detail
```

- `preview` 返回模式覆盖、不适配原因、预计 blocks 和推荐后备模式，不创建持久会话。
- `create` 接受客户端 `requestUid` 并把 preview 输入在服务端重新校验；不能信任客户端回传的编排结果。
- `detail` 返回服务端 authoritative snapshot、当前公开 item 和已提交结果，不返回未来答案。
- `submit` 使用 `attemptUid` 幂等，返回 final 或 `grading_pending`。
- `events` 只发送 session/job 版本变化；客户端收到事件后重新请求 detail。

#### Versioned Activity Contract

所有 activity 使用 `ActivityEnvelopeV1` 判别联合：

```ts
type LearningMode =
  | 'root_family'
  | 'micro_scene'
  | 'confusion'
  | 'listening'
  | 'output';

type PublicLearningItem =
  | RootFamilyPublicItem
  | MicroScenePublicItem
  | ConfusionPublicItem
  | ListeningPublicItem
  | OutputPublicItem;

interface ActivityEnvelopeV1<TItem extends PublicLearningItem> {
  schemaVersion: 1;
  mode: TItem['mode'];
  phase: 'understand' | 'recall' | 'verify';
  item: TItem;
}
```

- 后端存储类型含 `answerContract`，public mapper 显式剥离答案。
- 前端镜像 public union，并对未知 schema/mode 显示可恢复错误。
- 两仓库用共享 JSON contract fixtures 做兼容测试，不在本阶段引入代码生成平台。

#### Errors and Realtime

- 使用稳定错误码，例如 `LEARNING_WORD_NOT_OWNED`、`LEARNING_MODE_UNSUPPORTED`、`LEARNING_ITEM_STALE`、`LEARNING_GRADING_PENDING`、`LEARNING_CONTENT_INVALID`。
- 用户文案由前端映射，服务端 message 只提供安全兜底。
- SSE 是提示通道，不承载完整答案或唯一状态；断线时指数退避重连并轮询 detail。
- 单进程本地 event emitter 可继续使用；多实例时即使漏事件，REST polling 仍会收敛。

### Frontend Architecture

#### Routing and Shells

- 桌面：`/englishWorld/learn/session/:sessionId`，使用专注型学习页面，不放入现有 Context Lab 页面。
- 移动：`/englishWorldMobile/learn/session/:sessionId`，使用独立移动壳；从移动词库进入时保持移动返回路径。
- 两端结果页使用同一 session route 的 completed 状态，避免额外复制结果实体。

#### State Ownership

- TanStack Query 管理 capabilities、preview、session detail 和 mastery detail。
- mutation 处理 create、submit、pause、complete、retry 和 override；成功后以服务端 snapshot 替换本地推断。
- `learningSessionReducer` 只管理当前活动阶段、选项、输入草稿、提示展开和提交保护。
- 草稿按 `sessionId + itemUid` 保存到项目已有的共享 local-storage helper，提交成功立即清理。
- SSE hook 只触发 query invalidation；连接失败切换 polling，并显示 reconnecting 状态。

#### Component Boundaries

```text
learning/
  api/
  contracts/
  setup/
  session/
  activities/
  mastery/
  mobile/
  shared/
```

- `LearningSetupDrawer` 只负责输入与 preview，不复制编排算法。
- `MixedLearningSessionPage` 负责 snapshot、导航保护和 activity registry。
- 五个 activity renderer 只消费自己的 public item，并发出统一 `LearningAnswerDraft`。
- `LearningResultView` 和 `MasteryOverrideDrawer` 只消费后端 evidence summary。
- 桌面/移动 renderer 可以不同，但 answer draft 与提交 command 一致。

#### Performance

- 路由级 lazy-load 学习域和五个 activity renderer，避免增加词库首屏主 bundle。
- detail 返回当前 block 和必要的下一 block 摘要，不一次下发整轮正确答案或全部大型内容。
- 预览和 detail 使用批量 word 查询；客户端不发逐词请求。
- 长结果列表最多 20 词，不需要虚拟滚动。

### Infrastructure & Deployment

- 新表通过 additive SQL migration 创建，保留回滚说明；不得用 `sequelize.sync()` 修改生产结构。
- `learning_job` 使用 MySQL 行锁和 lease 实现小规模持久 worker；worker 可在 Nest 进程启动，重复实例通过 lease 避免重复完成。
- Redis 不可用时跳过缓存与加速限流，不能阻塞确定性学习和已缓存内容读取。
- 内容生成使用现有 DeepSeek/OpenAI client factory 与环境变量，不硬编码密钥或模型。
- 后端功能开关是权威来源；前端通过 capabilities 决定是否显示入口，避免前后端 build flag 漂移。
- 先在内部用户启用，再扩大；关闭开关只隐藏新会话创建，已存在 session 仍可恢复和完成。
- 结构化日志覆盖 requestUid、sessionUid、attemptUid、jobUid、状态转换、模型/策略版本和错误码，不记录答案正文。
- 上线 migration、后端、前端的顺序必须保证旧客户端可继续工作；所有新字段/表均为附加式。

#### Semantic Retrieval Decision

- 第一阶段不部署向量数据库，也不创建 embedding 表。
- 微场景对 1–20 个已选词使用批量内容规划：先依据掌握级别、词性和已有来源形成候选，再由一次受控 AI 请求完成自然分组与内容生成。
- 易混优先来自真实错误方向、审核词对和用户自定义，不用纯相似度直接认定关系。
- 当出现跨用户大规模例句检索、候选库增长或 p95 明显不达标时，再引入 `SemanticCandidateProvider` 和版本化 embedding storage。
- 即使未来加入向量检索，它也只召回候选；关系校验、答案和掌握策略仍由规则控制。

### Decision Impact Analysis

**Implementation Sequence:**

1. 建立版本化 activity contract、数据库迁移、模型和纯 mastery/orchestration 策略。
2. 交付“词库入口 → preview → listening 纵向会话 → evidence/mastery → result”的无 AI 可运行闭环。
3. 加入持久 content/job、微场景渐进生成与恢复。
4. 加入词根知识、个人联想和词根 activity。
5. 加入易混事实模型和 activity。
6. 加入输出 activity、pending grading 和异步 finalization。
7. 开启多模式短 block 编排、跨模式薄弱回收和下一次模式轮换。
8. 接入移动端，并让 Daily Coach/Memory Map/旧手动等级逐步读取统一档案。
9. 完成跨仓库 E2E、功能开关发布和可观察性验收。

**Cross-Component Dependencies:**

- 所有 activity 依赖共同 contract、session ownership、attempt idempotency 和 evidence finalization。
- mastery/SRS 依赖 final evidence，但 activity UI 不依赖 mastery 内部权重。
- result、Daily Coach 和 Memory Map 依赖 mastery/evidence read model，不直接扫描五种活动 payload。
- async content 与 grading 依赖 durable job；SSE、Redis 和客户端 polling 只改善体验。
- 移动端依赖稳定 API/reducer，而不依赖桌面组件实现。
- 向量检索被隔离在内容候选层，不影响核心会话和证据数据模型。

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 14 类，包括数据库命名、UID/ID、活动契约、答案保密、响应包装、时间、事件、幂等、状态机、事务、重试、文件边界、跨端共享和跨仓库验证。

### Naming Patterns

**Database Naming Conventions:**

- 新表使用现有项目的单数 `snake_case`：`learning_session`、`learning_attempt`。
- 列使用 `snake_case`：`user_id`、`next_review_at`；Sequelize 属性使用 `camelCase` 并通过 `field` 映射。
- 数字主键统一为 `id`；外部幂等/恢复标识使用 `<entity>_uid`，例如 `session_uid`、`attempt_uid`。
- 普通索引命名 `idx_<table>_<columns>`；唯一索引命名 `uk_<table>_<columns>`。
- 外键字段使用 `<entity>_id`，不使用 `fkEntity` 或含糊的 `owner`。
- 时间列统一 `create_time`、`update_time`、`complete_time`、`next_review_at`；API 对应 `createTime` 等 camelCase。

**API Naming Conventions:**

- 路径使用现有风格的单数 kebab-case 模块：`/learning-session/detail`。
- 请求和响应 JSON 使用 camelCase；不把数据库 snake_case 暴露到 API。
- 路由中的数字实体统一命名 `sessionId`、`wordId`；幂等字符串统一 `requestUid`、`attemptUid`。
- wire enum 使用 lower snake case：`root_family`、`grading_pending`、`active_recall`。
- 稳定错误码使用大写 snake case并带域前缀：`LEARNING_ITEM_STALE`。

**Code Naming Conventions:**

- React 组件和文件使用 PascalCase：`MixedLearningSessionPage.tsx`。
- hook 使用 `use` + camelCase：`useLearningSession.ts`。
- 纯函数、service 方法和变量使用 camelCase：`deriveMasteryProjection`。
- 后端 DTO 使用动词/意图：`CreateLearningSessionDto`、`SubmitLearningAttemptDto`。
- contract、policy、mapper 文件使用 kebab-case：`activity-contract.ts`、`mastery-policy.ts`。
- test 与源文件同目录：`mastery-policy.spec.ts`、`ListeningActivity.test.tsx`。

### Structure Patterns

**Project Organization:**

- 按学习域/活动组织，不建立全局 `components/`、`utils/` 垃圾抽屉。
- controller 只做认证上下文、DTO 接收和响应包装；业务规则进入 application/domain service。
- 数据库读取集中在 repository/service，不让 activity generator 直接查询任意表。
- 五种活动共享 contract 和提交 command；活动特有 validator/mapper 放在自己的子目录。
- 只有三处以上真实复用时才上移到 `shared/`，遵守 Rule of Three。

**File Structure Patterns:**

- 后端 migration、database model、`init-models.ts`、module provider 和测试属于同一任务/提交。
- 前端 API request descriptor 放 `learning/api/`，public types 放 `learning/contracts/`，query hooks 放 `learning/session/`。
- 桌面和移动专属布局放不同目录；纯 view model、draft、contract 和 API 不重复。
- contract fixtures 放两端各自测试目录，并由跨仓库验收任务比较同一 fixture 内容。
- 架构、设计和实施计划分别放 `docs/superpowers/architecture`、`specs`、`plans`。

### Format Patterns

**API Response Formats:**

成功保持项目包装：

```ts
{ code: 200, message: 'success', data: payload }
```

失败使用真实 HTTP status，并保留数值 `code` 兼容现有 request 层，同时增加稳定 `errorCode`：

```ts
{
  code: 409,
  message: '当前题目已更新，请刷新后继续',
  errorCode: 'LEARNING_ITEM_STALE'
}
```

- 前端业务分支只依赖 `errorCode`，不解析中文 message。
- 分页使用 `{ list, total, page, pageSize, totalPages }`；不为同类接口创造 cursor/offset 混用。
- `detail` 返回 `sessionVersion`；submit command 携带客户端看到的 version 以检测陈旧题目。

**Data Exchange Formats:**

- 所有 API 时间为 UTC ISO-8601 字符串；前端只在展示层本地化。
- 时长使用整数秒，时区继续使用 `timezoneOffsetMinutes`。
- boolean 使用 `true/false`，不在新 DTO 中使用 `0/1`。
- 可选字段无值时省略；需要表达“用户明确清除”的 command 使用 `null`。
- JSON envelope 第一层必须有 `schemaVersion` 与判别字段 `mode`/`itemType`。
- 用户答案统一为判别联合，不使用无类型 `Record<string, any>`：

```ts
type LearningAnswer =
  | { kind: 'choice'; selectedValue: string }
  | { kind: 'spelling'; text: string }
  | { kind: 'output'; text: string };
```

### Communication Patterns

**Event System Patterns:**

- 事件名使用带版本的点分词：`learning.session.updated.v1`、`learning.job.updated.v1`。
- 事件只通知变化，不携带完整会话和答案：

```ts
interface LearningSessionUpdatedEventV1 {
  schemaVersion: 1;
  eventUid: string;
  sessionId: number;
  sessionVersion: number;
  occurredAt: string;
}
```

- consumer 收到事件后重新读取 REST snapshot；不得把事件 payload 直接当最终状态。
- eventUid、attemptUid 和 jobUid 重复时必须幂等；不同 payload 复用同一 UID 返回 conflict。
- 日志使用同一 UID 串联请求、任务和批改，不记录答案正文。

**State Management Patterns:**

- React Query key 只能从 `learningKeys` factory 创建，例如 `learningKeys.session(sessionId)`。
- 服务端 snapshot 更新通过 query cache replacement/invalidation，不在多个组件维护副本。
- reducer action 使用 lower snake case：`snapshot_replaced`、`draft_changed`、`hint_revealed`、`submit_started`。
- 状态使用判别联合，不使用 `isLoading/isSubmitting/isFailed/isPending` 多布尔组合制造非法状态。
- 已提交 attempt 后 activity 进入只读 result；“再练一次”创建新 item/attempt，不修改旧结果。

### Process Patterns

**Error Handling Patterns:**

- DTO 验证失败在 controller 边界返回稳定 errorCode；domain invariant 由 domain error 表达；未知异常统一记录并返回安全兜底。
- 生成失败、音频失败、提交失败、批改待定和状态同步失败使用不同 errorCode 与 UI 状态。
- mutation 不自动重复提交用户答案；用户点击重试时必须复用原 attemptUid。
- query/SSE 可自动退避重试；重连时保留当前 snapshot 和草稿。
- AI invalid output 不能宽松转成成功；可以标记 block 部分可用，并保留失败原因。
- Redis/通知/SSE 失败只能降级体验，不能回滚已经提交的 MySQL 事实。

**Loading State Patterns:**

- 页面级状态来自服务端 session status；activity 局部输入状态来自 reducer。
- `preparing` 显示当前和下一 block；`partial_ready` 允许开始可用 block；`reconnecting` 保留旧内容。
- skeleton 只用于首次无数据加载；已有 snapshot 更新时使用局部状态文字，不清空页面。
- 主操作在请求中禁用并显示明确动词，例如“正在提交答案”，不只显示通用 spinner。
- 失败保留参数和答案，恢复动作紧邻失败信息。

**Transaction and Projection Patterns:**

- evidence 只追加，不 update outcome；需要纠正时追加 superseding evidence，并保留关联。
- mastery profile 是可重建 projection；任何更新必须经 `MasteryPolicy`，controller/activity 不直接写等级。
- session cursor 只能在 attempt finalization transaction 内前进；pending attempt 不提前产生掌握变化。
- worker 必须先 claim lease，再调用外部服务；外部调用不持有数据库事务。
- 回来写结果时重新锁定 attempt 并检查是否已终态。

### Enforcement Guidelines

**All AI Agents MUST:**

- 先写 contract/policy/validator 的失败测试，再写实现。
- 每个 API 查询同时验证 current user ownership。
- 所有 public mapper 都显式剥离 answer contract。
- 使用 attemptUid/requestUid/jobUid 幂等，不靠按钮禁用防重复。
- 只把 final evidence 交给 mastery policy。
- 保留旧入口和 feature flag 行为，除非当前任务明确负责迁移。
- 在前后端仓库分别提交，只暂存当前任务文件。
- 后端提交前检查用户已有未跟踪文件未被纳入。

**Pattern Enforcement:**

- 后端 Jest 覆盖 contract stripping、ownership、idempotency、transaction 和 policy。
- 前端 Vitest 覆盖 reducer 非法状态、错误恢复、answer mapping 和 renderer registry。
- Cypress 覆盖跨模式、刷新恢复、pending grading 和移动固定操作。
- `git diff --check`、定向测试、全量构建和提交范围检查是每个阶段门槛。
- 若必须偏离本架构，在实施计划或后续 ADR 中记录原因、影响和回滚方式，不在代码中静默分叉。

### Pattern Examples

**Good Examples:**

```ts
await finalizeAttemptTransaction({
  userId,
  sessionId,
  itemId,
  attemptUid,
  answer,
  policyVersion: 'mastery-v1',
});
```

```ts
const publicItem = stripAnswerContract(storedActivityEnvelope);
return { code: 200, message: 'success', data: publicItem };
```

```ts
queryClient.invalidateQueries({
  queryKey: learningKeys.session(event.sessionId),
});
```

**Anti-Patterns:**

- activity component 直接调用“更新 englishLevel”接口。
- 把 `correctAnswer` 放进 detail/SSE public payload 后依赖 CSS 隐藏。
- AI 请求失败后创建 `correct: false` evidence。
- 用五组 boolean 表达互斥状态。
- SSE 断线后一直保留“处理中”且不轮询。
- 为微场景单独建立一套 session/attempt/mastery 表。
- 用 Redis 作为唯一 job queue，却声称 Redis 可选。
- 因为需要语义分组而迁移整个 MySQL 主库。

## Project Structure & Boundaries

### Complete Project Directory Structure

本功能继续使用现有双仓库。下列树列出本域会新增或直接修改的完整边界；未列出的既有产品模块不因本功能搬迁。

```text
/Users/liulin/Desktop/font/english/
├── react-font/                                      # 前端仓库
│   ├── package.json                                 # workspace scripts，不新增包管理器
│   ├── pnpm-lock.yaml
│   ├── turbo.json
│   ├── docs/superpowers/
│   │   ├── architecture/
│   │   │   └── 2026-08-04-multi-mode-vocabulary-learning-architecture.md
│   │   ├── specs/
│   │   │   └── 2026-08-04-multi-mode-vocabulary-learning-design.md
│   │   └── plans/                                  # 分阶段实施计划
│   └── apps/english-world/
│       ├── package.json
│       ├── vite.config.ts
│       ├── vitest.config.ts
│       ├── cypress.config.ts
│       ├── cypress/
│       │   └── e2e/
│       │       ├── learning-listening-session.cy.ts
│       │       ├── learning-mixed-session.cy.ts
│       │       ├── learning-output-recovery.cy.ts
│       │       └── learning-mobile-session.cy.ts
│       └── src/
│           ├── router/
│           │   └── router.tsx                      # 桌面/移动 session 路由 lazy import
│           ├── shared/storage/
│           │   └── localStoragePreference.ts       # 复用；增加学习草稿命名空间
│           ├── page/englishWorld/
│           │   ├── EnglishWorld.tsx                # 只增加入口，不承载学习编排
│           │   ├── server/learning.ts              # 旧接口兼容；新调用转到 learning/api
│           │   ├── types/learning.ts               # 旧公开类型兼容导出
│           │   └── learning/
│           │       ├── api/
│           │       │   ├── learningApi.ts
│           │       │   ├── learningApi.test.ts
│           │       │   └── learningKeys.ts
│           │       ├── contracts/
│           │       │   ├── activity-contract.ts
│           │       │   ├── activity-contract.test.ts
│           │       │   ├── learning-session.ts
│           │       │   └── fixtures/activity-envelope-v1.json
│           │       ├── setup/
│           │       │   ├── LearningSetupDrawer.tsx
│           │       │   ├── LearningSetupDrawer.test.tsx
│           │       │   ├── LearningModePicker.tsx
│           │       │   ├── LearningPreviewPanel.tsx
│           │       │   └── setupViewModel.ts
│           │       ├── session/
│           │       │   ├── MixedLearningSessionPage.tsx
│           │       │   ├── MixedLearningSessionPage.test.tsx
│           │       │   ├── LearningSessionShell.tsx
│           │       │   ├── LearningBlockRail.tsx
│           │       │   ├── LearningResultView.tsx
│           │       │   ├── activityRegistry.tsx
│           │       │   ├── learningSessionReducer.ts
│           │       │   ├── learningSessionReducer.test.ts
│           │       │   ├── useLearningSession.ts
│           │       │   └── useLearningSessionEvents.ts
│           │       ├── activities/
│           │       │   ├── shared/
│           │       │   │   ├── ActivityFrame.tsx
│           │       │   │   ├── ActivityFeedback.tsx
│           │       │   │   └── answerDraft.ts
│           │       │   ├── listening/
│           │       │   │   ├── ListeningActivity.tsx
│           │       │   │   └── ListeningActivity.test.tsx
│           │       │   ├── micro-scene/
│           │       │   │   ├── MicroSceneActivity.tsx
│           │       │   │   └── MicroSceneActivity.test.tsx
│           │       │   ├── root-family/
│           │       │   │   ├── RootFamilyActivity.tsx
│           │       │   │   └── RootFamilyActivity.test.tsx
│           │       │   ├── confusion/
│           │       │   │   ├── ConfusionActivity.tsx
│           │       │   │   └── ConfusionActivity.test.tsx
│           │       │   └── output/
│           │       │       ├── OutputActivity.tsx
│           │       │       └── OutputActivity.test.tsx
│           │       ├── mastery/
│           │       │   ├── MasteryEvidenceSummary.tsx
│           │       │   ├── MasteryOverrideDrawer.tsx
│           │       │   └── masteryViewModel.test.ts
│           │       └── shared/
│           │           ├── LearningErrorState.tsx
│           │           ├── LearningStatusBanner.tsx
│           │           └── learningDraftStorage.ts
│           └── page/englishWorldMobile/
│               ├── EnglishWorldMobile.tsx           # 只增加入口
│               └── learning/
│                   ├── MobileLearningSetupSheet.tsx
│                   ├── MobileLearningSessionPage.tsx
│                   ├── MobileLearningSessionPage.test.tsx
│                   ├── MobileActivityStage.tsx
│                   └── MobileLearningActionBar.tsx
└── nestjs/                                          # 后端仓库
    ├── package.json
    ├── nest-cli.json
    ├── tsconfig.json
    ├── init.sql                                     # 新环境安装快照同步新增表
    ├── migrations/
    │   ├── README.md                                # 登记迁移顺序与回滚说明
    │   ├── create-mixed-learning-foundation.sql
    │   └── create-mixed-learning-knowledge.sql
    ├── test/
    │   ├── learning-session.e2e-spec.ts
    │   └── learning-session.e2e-fixtures.ts
    └── src/
        ├── app.module.ts                            # 注册两个域模块
        ├── database/
        │   ├── learning-session.ts
        │   ├── learning-session-word.ts
        │   ├── learning-block.ts
        │   ├── learning-item.ts
        │   ├── learning-item-word.ts
        │   ├── learning-attempt.ts
        │   ├── learning-evidence.ts
        │   ├── word-mastery-profile.ts
        │   ├── learning-mastery-override.ts
        │   ├── learning-content.ts
        │   ├── learning-job.ts
        │   ├── root-morpheme.ts
        │   ├── word-root-mapping.ts
        │   ├── user-mnemonic.ts
        │   ├── confusion-pair.ts
        │   ├── user-confusion-pair.ts
        │   └── init-models.ts                       # 同步模型关联与导出
        └── interface/
            ├── learning-session/
            │   ├── learning-session.module.ts
            │   ├── learning-session.controller.ts
            │   ├── learning-session.controller.spec.ts
            │   ├── dto/
            │   │   ├── preview-learning-session.dto.ts
            │   │   ├── create-learning-session.dto.ts
            │   │   ├── learning-session-command.dto.ts
            │   │   └── submit-learning-attempt.dto.ts
            │   ├── contracts/
            │   │   ├── activity-contract.ts
            │   │   ├── activity-contract.spec.ts
            │   │   ├── activity-public.mapper.ts
            │   │   └── fixtures/activity-envelope-v1.json
            │   ├── domain/
            │   │   ├── learning-session.types.ts
            │   │   ├── learning-session.machine.ts
            │   │   ├── learning-session.machine.spec.ts
            │   │   ├── orchestration-policy.ts
            │   │   └── orchestration-policy.spec.ts
            │   ├── repositories/
            │   │   ├── learning-session.repository.ts
            │   │   ├── learning-attempt.repository.ts
            │   │   ├── learning-content.repository.ts
            │   │   └── learning-job.repository.ts
            │   ├── services/
            │   │   ├── learning-session.service.ts
            │   │   ├── learning-session.service.spec.ts
            │   │   ├── attempt-finalization.service.ts
            │   │   ├── attempt-finalization.service.spec.ts
            │   │   ├── activity-generation.service.ts
            │   │   └── learning-session-events.service.ts
            │   ├── activities/
            │   │   ├── activity-adapter.ts
            │   │   ├── listening.activity.ts
            │   │   ├── micro-scene.activity.ts
            │   │   ├── root-family.activity.ts
            │   │   ├── confusion.activity.ts
            │   │   ├── output.activity.ts
            │   │   └── activities.spec.ts
            │   └── workers/
            │       ├── learning-job.worker.ts
            │       └── learning-job.worker.spec.ts
            └── learning-mastery/
                ├── learning-mastery.module.ts
                ├── learning-mastery.controller.ts
                ├── learning-mastery.controller.spec.ts
                ├── dto/learning-mastery.dto.ts
                ├── mastery-policy.ts
                ├── mastery-policy.spec.ts
                ├── mastery-projection.service.ts
                ├── mastery-projection.service.spec.ts
                └── legacy-mastery.adapter.ts
```

### Architectural Boundaries

**API Boundaries:**

- `learning-session.controller` 是会话 command/query 的唯一 HTTP 边界；它只从 `AuthGuard` 取得当前用户、验证 DTO 并调用 application service。
- `learning-mastery.controller` 只处理证据详情和手动覆盖；活动组件和旧页面不能直接更新 `systemLevel`。
- `capabilities` 是前端入口开关的权威来源；前端环境变量不能单独开启功能。
- public mapper 是答案保密边界。数据库 envelope 在离开后端前必须经过 `activity-public.mapper`，SSE 也不得绕过它。
- 现有 Recite、Context Lab、Daily Coach 和 Memory Map 通过 application service/adapter 读取统一投影，不直接调用新 controller。

**Component Boundaries:**

- `LearningSetupDrawer`/`MobileLearningSetupSheet` 只收集词范围、模式多选和预览参数；模式适配与排序始终由后端决定。
- `MixedLearningSessionPage` 与 `MobileLearningSessionPage` 共享 `learningApi`、contract、query hook、reducer 和 activity registry 的业务接口，不共享页面布局。
- activity renderer 是受控组件：输入仅为 public item、current draft 和 display state，输出仅为统一 `LearningAnswerDraft` 与 hint intent。
- result 与 mastery drawer 只消费服务端 evidence summary，不从前端答题历史重新计算掌握度。

**Service Boundaries:**

- `LearningSessionService` 负责编排和生命周期；`AttemptFinalizationService` 是 attempt、evidence、mastery、cursor 同事务提交的唯一入口。
- 每种 activity adapter 只负责资格判断、公开题面、服务端答案契约和确定性评分，不负责用户授权、幂等、掌握或游标。
- `MasteryProjectionService` 接收 final evidence 和既有 profile，在调用方事务中更新投影；其 policy 保持纯函数。
- `LearningJobWorker` 只执行已经持久化的 job。它不能在持有数据库事务时调用模型，返回后必须通过 finalization service 收敛状态。
- AI client、Redis 和本地 event emitter 均通过现有 provider 注入；学习域对其失败采用降级而非事实回滚。

**Data Boundaries:**

- 所有学习表只由两个新 Nest module 读写；其他模块通过 service facade 获取摘要。
- `learning_evidence` 是客观学习事实，`learning_mastery_override` 是用户判断事实，`word_mastery_profile` 是可重建投影，`english.english_level` 是迁移兼容视图，四者不得混写语义。
- answer contract 只存在 `learning_item` 私有存储和后端内存；attempt 保存用户答案与安全评分摘要，分析事件不保存正文。
- Redis 缓存只接受由 `cacheKey + schemaVersion + modelVersion` 标识的可再生成内容；lease/job/session completion 必须在 MySQL。

### Requirements to Structure Mapping

| 需求类别 | 前端位置 | 后端位置 | 持久化/测试位置 |
| --- | --- | --- | --- |
| 词库入口、模式多选、适配预览 | `learning/setup/`、两个入口页 | `learning-session` preview/capabilities | session word 批量查询；setup component test |
| 2–4 分钟短 block 与薄弱回收 | `learning/session/` | `domain/orchestration-policy.ts`、session service | session/block/item 表；policy spec、E2E |
| 听写模式 | `activities/listening/` | `activities/listening.activity.ts` | item/attempt/evidence；纵向 E2E |
| 微场景短文 | `activities/micro-scene/` | micro-scene adapter、generation service/worker | content/job；invalid-output 和恢复测试 |
| 词根记忆与自定义联想 | `activities/root-family/` | root-family adapter | root mapping/user mnemonic；ownership test |
| 易混辨析 | `activities/confusion/` | confusion adapter | confusion pair/evidence；方向性评分测试 |
| 造句输出与异步批改 | `activities/output/` | output adapter、job worker、finalization | pending attempt/job；重复 worker 测试 |
| 六维证据、四级掌握、SRS | `mastery/` | `learning-mastery/` | evidence/profile；纯 policy test |
| 暂停、刷新恢复、部分可用 | session hooks/status UI | session service/events service | session version/cursor；recovery E2E |
| 桌面/移动一致能力 | desktop session + mobile learning | 同一 API | contract fixture + 两端 Cypress |
| 旧入口渐进迁移 | 旧 types/server 兼容导出 | legacy mastery adapter | legacy baseline 与 feature-flag integration tests |

**Cross-Cutting Concerns:**

- 身份与所有权：controller guard + 每个 repository 查询条件 + controller/service tests。
- 幂等：DTO UID + repository unique index + finalization tests。
- 版本化：前端 `contracts/`、后端 `contracts/`、双端同名 fixture。
- 可恢复性：REST detail/session version 为主，SSE hook 与 local draft storage 为辅。
- 可观察性：session/service/worker 统一 UID 结构化日志；正文在日志和分析事件边界剥离。
- 功能发布：后端 capabilities + `app.module.ts` provider configuration + 前端入口条件渲染。

### Integration Points

**Internal Communication:**

- 前端入口创建 session 后只导航 `sessionId`；学习页通过 query key factory 读取详情，activity 不自行发网络请求。
- 后端 controller 调用 session/mastery facade；facade 通过 repositories 和显式 Sequelize transaction 访问数据库。
- finalization transaction 提交后，events service 发布版本通知；前端收到后 invalidate detail query。
- Daily Coach/Memory Map 后续只依赖 mastery read model，避免了解五种 activity payload。

**External Integrations:**

- 现有 DeepSeek/OpenAI provider：只由 generation service/worker 调用，输入输出经过版本化 schema validator。
- Redis：可选内容缓存、限流和将来的跨实例通知；连接失败不改变核心 API 语义。
- 浏览器语音：听力首版复用现有发音/音频能力；若远端音频失败，UI 明确降级到可重试状态，不自动判错。

**Data Flow:**

```text
词库选择 → preview → create session → 生成当前可用 block → public mapper → REST snapshot
    → activity draft → submit(attemptUid) → 确定性评分/final 或 grading_pending
    → append evidence → mastery projection/SRS → cursor/recycle → session snapshot/result
                                  ↘ durable job → AI schema validation → finalization transaction
```

### File Organization Patterns

**Configuration Files:** 保留两个仓库现有配置；新增功能开关、模型和策略版本进入已有 Nest config provider，不建立散落的 `.env.learning`。

**Source Organization:** 新功能只进入 `learning/`、`learning-session/` 和 `learning-mastery/`。现有大页面仅增加入口；公共 contract 必须显式导出，不能经深层路径隐式依赖内部实现。

**Test Organization:** 单元测试与源文件相邻；Nest HTTP/事务跨层测试放 `test/`；浏览器主流程放 Cypress。双端 contract fixture 的字段和值必须一致。

**Asset Organization:** 首版不新增静态音频包。可复用生成内容保存在 `learning_content`，前端图标继续使用现有 icon/Ant Design 体系。

### Development Workflow Integration

**Development Server Structure:** 前端和后端继续独立启动；功能开关关闭时不影响现有词库、Recite 或 Context Lab。开发 fixture 通过测试工厂创建，不在页面硬编码演示结果。

**Build Process Structure:** 路由和活动 renderer lazy-load；前端 TypeScript/Vite build 与后端 Nest build 分别作为门禁。任何共享 contract 变化必须同时跑两仓 contract fixture 测试。

**Deployment Structure:** 依次部署 additive migration、兼容新表但默认关闭的后端、前端入口、最后打开服务端 capability。回滚时关闭新会话创建但保留 detail/submit，使进行中的会话可完成。

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**

- React 18/Vite/TanStack Query 的 snapshot + reducer 方案与现有前端一致，不要求引入新的全局状态框架。
- NestJS 10/Sequelize 6/MySQL 的显式事务、行锁和唯一索引足以实现 session、attempt、evidence、mastery 和 durable job；Redis 保持可选不存在持久化矛盾。
- REST authoritative snapshot 与 SSE invalidation 分工一致：SSE 丢失不会造成状态永久错误，轮询也不会绕过权限和 public mapper。
- AI 生成/批改与确定性事实分离；`grading_pending` 不产生错误证据，满足掌握正确性和可恢复性要求。
- 桌面/移动共享 contract、draft 和 reducer，独立布局；既避免业务漂移，也不强迫移动端复用桌面 DOM。
- 语义检索延后不会阻塞 1–20 词场景；未来 provider 边界也不会改变会话、答案或证据模型。

**Pattern Consistency:**

- 数据库 snake_case、API camelCase、wire enum lower_snake_case 和代码命名规则覆盖了双仓库转换边界。
- answer stripping、ownership、idempotency、append-only evidence 和 final-only projection 均有唯一执行边界及对应测试位置。
- query key factory、discriminated state 和 stable error code 与 snapshot/event 机制一致，不依赖中文文案或多份本地真值。
- additive migration、模型同步、分仓提交和定向验证符合现有 brownfield 工作流。

**Structure Alignment:**

- 前端 `learning/` 域覆盖 setup、session、五种 activity、mastery 和共享基础；现有大页面只增加入口。
- 后端 `learning-session` 负责生命周期和活动，`learning-mastery` 负责投影与覆盖；跨表提交收敛到 finalization service。
- 数据模型、API、任务 worker、事件、兼容 adapter 和三层测试均有明确文件位置，没有出现按模式复制会话系统的结构。

### Requirements Coverage Validation ✅

**Feature Coverage:**

- 五种记忆方式、多选混合、主模式、薄弱回收、短 block、预览和模式轮换均由 activity registry + orchestration policy 支持。
- 理解—回忆—验证、提示后正确、跳过、pending、暂停、刷新恢复和完成复盘均有 session/item/attempt 状态承载。
- 六维证据、系统建议、手动覆盖、下一次复习和旧 `englishLevel` 兼容由 evidence/profile/policy/adapter 分层实现。
- 自定义词根联想、个人易混词、短文内容和输出批改都有所有权、内容版本和异步任务边界。

**Functional Requirements Coverage:**

- 从词库范围选择到 preview/create/detail/submit/result 的完整纵向流已映射到具体 API、组件、表和测试。
- 当前 block 优先、后续渐进准备和部分可用状态由 content/job/block 状态与 authoritative detail 表达。
- 答案保密由私有 answer contract 与 public mapper 实现；前端不能根据公开 payload 伪造评分。
- 旧 Recite/Context Lab/Daily Coach/Memory Map 通过 legacy adapter/read model 渐进接入，不要求历史数据伪回填。

**Non-Functional Requirements Coverage:**

- 安全：cookie guard、逐资源 owner scope、只接收 word IDs、答案剥离、正文日志隔离和输入长度/schema 校验。
- 一致性：UID 唯一约束、payload 冲突检测、finalization transaction、append-only evidence、worker lease 和 session version。
- 性能与成本：批量选词、无 N+1、路由 lazy-load、3–5 词成组生成、版本缓存和确定性评分优先。
- 可恢复/可用：MySQL 事实、REST refetch、SSE/Redis 降级、草稿辅助、部分可用和失败保参。
- 可访问/跨端：状态非颜色唯一表达、键盘/触控规范、移动独立单列壳与共享业务契约。
- 发布/兼容：additive migration、服务端 capability、旧字段双写、进行中会话可完成和分阶段开关。

### Implementation Readiness Validation ✅

**Decision Completeness:**

- 栈与边界均以当前 brownfield 版本为准，明确禁止在本功能中重脚手架或升级主版本。
- activity contract、policy、prompt/model/content 和事件均具备版本字段；未知版本有明确失败而非宽松解析。
- 首个纵向切片、异步扩展、模式扩展、移动接入与旧系统迁移有依赖顺序。

**Structure Completeness:**

- 双仓库的修改入口、新目录、模型、migration、worker、adapter、unit/integration/E2E 文件均已列出。
- API、component、service、data 四层边界和内部/外部集成点均已定义。
- 每类需求都映射到前端、后端、持久化和测试位置。

**Pattern Completeness:**

- 14 类冲突点均有规则：命名、UID、contract、保密、response/time/event、幂等、state、transaction、retry、文件、跨端和跨仓验证。
- 正向和反模式示例覆盖最容易产生数据错误的实现分叉。

### Gap Analysis Results

**Critical Gaps:** 无。没有会阻塞第一个可运行纵向切片的未决技术选型或数据边界。

**Important Gaps:** 已在架构中转为实施约束，不再保持开放：

1. **并发提交语义**：detail 返回 `sessionVersion`；submit 同时校验 version 与 `attemptUid`。同 UID 同 payload 返回原结果，同 UID 异 payload 返回 conflict。
2. **异步会话推进**：pending attempt 不推进该 item；其他已经准备的独立 item 可以继续。finalization 后服务端重新计算 cursor，前端只 refetch snapshot。
3. **功能关闭语义**：capability 关闭只阻止 preview/create，不阻断已创建 session 的 detail/submit/complete。
4. **迁移原子范围**：SQL、所有 Sequelize model、`init-models.ts`、`init.sql` 和 migration README 必须同任务验证，避免运行时模型与库结构漂移。
5. **跨仓 contract 漂移**：两个仓库保存同名 V1 fixture，并在集成阶段做字节/结构等价检查；不以复制 TypeScript 类型替代运行时兼容测试。

**Nice-to-Have Gaps:** 不阻塞 MVP，保留为真实使用数据后的增强：

- embedding provider/向量索引、FSRS 参数训练、跨实例消息总线和内容审核后台。
- 更细的模型路由、成本预算面板和运营分析维度。
- 历史 evidence 冷存储/分区策略；在真实增长数据出现前先保留索引和 retention 观察指标。

### Validation Issues Addressed

- 将“多选模式”澄清为编排输入，而非同一单词同一轮重复五次；普通词一个主模式，薄弱词才跨模式回收。
- 将“AI 失败”从答题错误中彻底分离；只有 final、结构校验通过的评分才产生掌握证据。
- 将“用户掌握程度”拆为系统事实建议与用户手动显示覆盖，解决旧 `englishLevel` 语义冲突。
- 将 Redis/SSE 降为优化层，消除可选依赖成为单点真值的部署风险。
- 将向量检索放在未来候选召回 provider，避免为小规模会话提前迁移主库。

### Architecture Completeness Checklist

**Requirements Analysis**

- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**Architectural Decisions**

- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**Implementation Patterns**

- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**Project Structure**

- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High。关键事实流不依赖 AI、Redis 或 SSE，可先用听写模式验证整个闭环，再逐层增加智能内容。

**Key Strengths:**

- 一个会话/证据/掌握核心承载五种模式，扩展成本受控。
- 主观 AI 能力与确定性学习事实之间有持久 pending 边界。
- 用户手动判断得到尊重，但不会覆盖可解释的客观证据。
- 双端共享业务契约而保留各自体验，旧系统可渐进迁移。
- 第一阶段不引入向量数据库等不必要基础设施。

**Areas for Future Enhancement:**

- 基于真实证据训练更精细的 SRS/FSRS 参数与模式推荐策略。
- 内容库规模足够大后增加语义候选检索和审核工具。
- 多实例规模增长后将事件通知迁入 Redis Pub/Sub 或正式消息总线。

### Implementation Handoff

**AI Agent Guidelines:**

- 严格遵循本文的事实边界、事务边界、public mapper 和版本化 contract。
- 先完成听写纵向切片，不并行复制五套未验证框架。
- 每个阶段先写失败测试；跨仓变更分别提交并检查提交范围。
- 任何偏离必须写入计划或 ADR，说明理由、影响与回滚方式。
- 后端仓库中用户现有未跟踪文件不属于本功能，禁止纳入提交。

**First Implementation Priority:**

从 `ActivityEnvelopeV1` fixture、foundation migration、Sequelize models、`MasteryPolicyV1` 和 orchestration policy 的失败测试开始；随后完成“词库入口 → preview/create → listening activity → submit/final evidence → mastery/result”的无 AI 可运行闭环。

### Implementation Plan Set

按以下 gate 顺序执行，每个阶段都必须通过自己的退出条件后再进入下一阶段：

1. [Foundation and Listening](../plans/2026-08-04-multi-mode-learning-foundation-listening.md)：契约、核心表、听音选义/听写、证据、掌握、结果和首条 E2E。
2. [Content, Root Family, and Micro-Scene](../plans/2026-08-04-multi-mode-learning-content-root-scene.md)：MySQL durable job、严格内容校验、渐进准备、词根来源和个人联想。
3. [Confusion, Output, and Mixing](../plans/2026-08-04-multi-mode-learning-confusion-output-mixing.md)：方向性易混证据、输出 pending/finalization、五模式 block 与跨模式回收。
4. [Mobile, Legacy Integration, and Rollout](../plans/2026-08-04-multi-mode-learning-mobile-legacy-rollout.md)：用户手动等级、移动单列体验、旧入口新证据、下游双读和灰度关停。
