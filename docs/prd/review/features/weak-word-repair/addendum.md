# PRD Addendum：技术边界与方案取舍

## 1. 为什么选择 1–3 个修复词

微语境固定 3 道题，并要求每题只有一个可核查的目标词。若一次传入 5 个词，会出现部分词只在文章中曝光、却被结果页误认为已验证的问题。MVP 因此将修复词上限设为 3；更多错词保留在原复习结果和次日任务中。

## 2. 方案对比

| 方案 | 优点 | 缺点 | 决策 |
|---|---|---|---|
| 完整 SRS 与新状态表 | 长期能力完整 | 迁移、算法和口径成本高，难验证语境价值 | 暂缓 |
| 仅增加结果页到 Context Lab 的链接 | 开发最快 | 仍是长文，归因错误，次日不回流 | 拒绝 |
| 昨日错词微语境闭环 | 复用高、价值可测，只需一张轻量事件表 | 只覆盖上一自然日，不是长期调度 | 采用 |

## 3. 推荐技术切面

- 前端从 `AnswerResult[]` 计算最多 3 个修复词，并通过稳定查询参数进入 Context Lab。
- 查询参数携带 `reciteSessionId`；后端任务 `requestJson` 持久保存该 ID，使语境任务和来源回合可查询关联。
- 后端以本人 reciteSession history 推导确定性的前 3 个错词，并与客户端传值逐项核验；不信任路由参数建立来源关联。
- Recite 增加按 session ID 读取本人回合结果的接口，刷新和跨页返回不依赖页面内存。
- `GenerateExerciseDto` 增加可选模式；默认值保持普通长文，避免破坏旧调用。
- 微语境提示词与普通提示词分开，生成后执行结构校验。
- 题目模型增加 `targetWord`，Webhook DTO、任务持久化 JSON 和前端类型同步兼容。
- 提交结果按 `targetWord` 生成 weak words，移除微语境中的序号取模归因。
- Daily Coach 直接查询 `recite_history`，按客户端分钟时区偏移计算上一自然日，并过滤不足 8 小时的记录，不新增学习状态表。
- 同词多次答题按上一自然日最后一条记录决定是否仍为错词。
- 新增 `learning_loop_event` 作为漏斗持久落点；`eventType` 为受控枚举，`eventUid` 幂等，`flowId` 关联普通复习开始/完成，其他关联 ID 均做本人归属校验。

## 4. 数据限制

没有词级学习状态表意味着 v1 不能准确计算稳定度、下次到期时间或多日掌握阶段。新增事件表只服务漏斗和实验归因，不参与学习调度。产品只能陈述“语境通过”和“下一自然日复查”，不能宣称长期掌握。若 MVP 数据通过，再新增词级学习状态表并设计迁移。

## 5. 视觉取舍

结果页新增入口与现有“再练错词”同属修复动作：当存在错词时，“再练错词”仍为主按钮，“用错词做语境练习”为带图标的次按钮；微语境入口不默认高亮整张结果卡。Context Lab 微模式隐藏普通生成配置，把修复词、预计时长和生成状态置于首屏。

## 6. Brownfield 合同兼容矩阵

| 现有合同 | 新增内容 | 默认与旧数据行为 | 兼容测试 | 迁移 |
|---|---|---|---|---|
| `GenerateExerciseDto` | `mode?`, `reciteSessionId?` | 缺省 `standard`；普通请求规则不变 | 旧请求仍生成长文；micro 才允许 1–3 词 | 无 |
| task `requestJson` | 保存 mode 和 reciteSessionId | 旧任务缺字段时按 standard 且无来源回合 | detail/history/SSE 对旧任务返回默认模式 | 无 |
| question JSON | `targetWord?` | 旧题目可缺省；普通历史任务继续提交 | 旧任务解析、PDF、提交回归 | 无 |
| submit result | `targetWord?` | 有 targetWord 时精确归因；旧任务使用兼容回退 | 微模式不得序号猜词；旧模式结果不崩溃 | 无 |
| Recite API | `session-result` 只读接口 | 旧提交响应已有 sessionId | 本人可读、他人/不存在统一 404、原顺序 | 无 |
| Daily Coach DTO | `timezoneOffsetMinutes?` | 优先分钟字段；缺失时兼容旧 `timezone` 小时；新字段非法直接回退 +480 | 正负、半小时、跨 UTC、非法新字段覆盖合法旧字段 | 无 |
| `recite_history` 查询 | 上一自然日最后答案 + 8 小时下限 | 不改变历史写入 | latest-wins、稳定排序、用户隔离 | 视压测决定索引 |
| Learning event API | 最小事件写入，含 eventUid/flowId 和可选关联 ID | 不参与核心学习事务；失败不阻断答题 | 本人归属、关系一致、重复写幂等、敏感字段拒绝 | 新增 `learning_loop_event` |

## 7. 状态所有权

- Recite 回合和逐词结果由后端 `recite_session` / `recite_history` 所有；前端页面内存只做即时展示。
- Context Lab 任务由 `article_exercise_task` 所有，mode 与 reciteSessionId 位于不可变请求快照。
- 每次提交由 `article_exercise_attempt` 所有，重试新增 attempt，不覆盖首次证据。
- 漏斗事实由后端 `learning_loop_event` 所有，事件 180 天到期；浏览器只负责发送最小 typed payload，不是事实存储。
