# PRD Quality Review — English World 薄弱词语境修复闭环（最终复审）

## Overall verdict

**PASS — 无发布 blocker。** PRD 已达到可进入 UX、架构、story 拆分和实现验收的质量：真实错词来源由后端验证，复习结果与异步任务可恢复，漏斗数据有持久且可治理的事实源，入口/完成/生成质量与反指标都有可执行门槛。SM-3 已正确降为探索性方向指标；在基于真实基线、用户内聚类和最小效应完成 power calculation 且达到所需样本前，只报告样本量、95% 置信区间与方向，不再触发本轮继续/停止决策或因果宣称。

## Decision-readiness — strong

方案选择、非目标、实验顺序和继续/停止规则已经完整。产品可以先隐藏入口部署事件采集，形成 7 天普通复习基线，再启用至少 14 天 MVP；SM-1、SM-2、SM-4 与 SM-C1/SM-C4 构成本轮发布决策，SM-3 明确只为下一轮实验设计提供方向证据，不再让不足样本驱动投资判断。

### Findings

无 critical/high findings。

## Substance over theater — strong

愿景、两条具名旅程、12 个 FR、NFR 阈值、事件治理、公众发布检查和 brownfield 兼容矩阵均承担实际决策作用。AI 可用率、用户接受度、查询性能、事件关联和写入成本被诚实标为 A-1–A-5，并有 owner、验证和失败动作。

### Findings

无新增高价值问题。

## Strategic coherence — strong

“真实错词 → 微语境 → 下一自然日证据”的 thesis、MVP 范围和指标现在完全对齐。处理组只包含来源复习后 30 分钟内完成最早任务首次 attempt 的修复词；同一来源回合与词只取最早任务首次 attempt；任务创建/生成成功单列 intention-to-treat 方向指标，不再被当作学习处理。

### Findings

无 blocker。后续若正式评估 SM-3，按 PRD 要求预先基于实际基线、目标最小效应和用户内聚类确定 power 与分析方法即可。

## Done-ness clarity — strong

核心状态行为均有唯一验收路径：后端验证 reciteSessionId 本人归属、按原 history 顺序推导前 3 个去重错词并与客户端逐项核验；不一致不落任务；结果页可按 session 恢复；mode 贯穿异步生命周期；重试新增 attempt 且不覆盖首次证据；昨日错词有分钟偏移、latest-wins、8 小时下限和稳定排序。

### Findings

- **medium（非阻塞）** 新旧时区字段同时出现且新字段非法时仍有轻微歧义（FR-8）— “新字段优先、缺失时兼容旧字段、二者缺失或非法时回退 480”没有明确“新字段非法、旧字段合法”的唯一结果。*Fix:* 实现计划中明确是拒绝/回退 480，还是尝试旧字段，并补一个验收用例。

## Scope honesty — strong

非目标与数据限制清晰：本轮不建立完整 SRS、不宣称长期掌握，事件表只服务漏斗与实验归因，不参与学习调度。所有事实性未知均进入假设索引；验证失败时关闭入口、迁移索引或增加显式关联字段，而不是静默降低标准。

### Findings

无新增高价值问题。

## Downstream usability — strong

FR-1–FR-12、UJ-1–UJ-2、SM-1–SM-6、SM-C1–SM-C4、A-1–A-5 连续唯一；reciteSessionId、contextTaskId、attemptId、合格曝光、下一自然日复查、状态所有权和兼容矩阵均可单独抽取。UX、架构、数据库迁移和 stories 可以直接从文档建立合同与验收测试。

### Findings

- **medium（非阻塞）** 事件字段清单应显式列出 `eventType`（FR-12）— 文档已明确表会记录八类事件且 eventUid 由事件类型参与生成，因此语义可推导；为避免实现者把类型编码进不可查询的 eventUid，建议在最小字段中直接列 `eventType` 并限定枚举。
- **low（非阻塞）** 仍有两处术语漂移（愿景、FR-7）— 愿景的“最需要修复”实际是“前 3 个去重错词”；FR-7 的“待修复词”应统一为 glossary 中的“修复词”。

## Shape fit — strong

该 brownfield consumer 功能采用具名同日/次日旅程、能力型 FR、实验指标、跨功能护栏和独立 addendum，形状与风险匹配。文档没有扩张成完整课程/SRS 路线图，也没有 persona、追踪矩阵或合规家具。

### Findings

无需新增结构性章节。

## Mechanical notes

- **Persistent metrics source:** `learning_loop_event` 覆盖普通复习开始/完成、合格曝光、micro 启动/生成/首次完成与次日事件；`flowId` 支持 SM-C1 基线和 MVP 比较。
- **Idempotency / ownership:** `(userId, eventUid)` 唯一；重复返回原记录；所有非空关联 ID 做本人归属和关系一致性校验。
- **Retention / deletion:** 180 天、`expireTime`、定期清理、账号删除随用户数据删除。
- **Micro trust boundary:** 服务端 session history 是修复词唯一事实来源；客户端词只参与一致性校验。
- **SM-3:** 首次 attempt treatment 已闭合；power 前只报告 N、CI 和方向；不触发本轮决策、不宣称因果。
- **ID continuity:** 所有 UJ/FR/SM/SM-C/A ID 连续唯一，无悬空引用。
- **Assumptions roundtrip:** A-1–A-5 正文与索引一一对应。
- **Document status:** 当前 `status: draft` 与复审过程一致；本次 PASS 后可在最终化流程中标记 `final`。
