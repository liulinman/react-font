---
title: 'Word Journey 可解释词汇掌握轨迹'
type: 'feature'
created: '2026-07-18'
status: 'done'
baseline_commit_frontend: 'dcee2f821816bcb8974436247f2d27fc49d84fcd'
baseline_commit_backend: '93342151b51d4323114b30104a2873bd9f20334d'
context:
  - 'docs/superpowers/prds/prd-english-world-2026-07-18/prd.md'
  - 'docs/superpowers/prds/prd-english-world-2026-07-18/addendum.md'
---

<frozen-after-approval reason="用户已授权自主确定下一功能并完成实施；本区保持产品意图不漂移">

## Intent

**Problem:** English World 已能发现错词、完成微语境和次日复查，但静态 `englishLevel` 无法告诉用户一个词为什么再次出现、刚完成的练习证明了什么、下一步应该做什么。

**Approach:** 在 Memory Map 内把已有 Recite 与微语境记录聚合为可解释词汇轨迹：四个可逆阶段、最多五条事实证据和唯一推荐动作。轨迹只解释已有事实，不新增黑盒掌握分或 AI 请求。

## Boundaries & Constraints

**Always:** 批量读取当前用户最多 12 个弱词最近 90 天证据；最新错误优先；跨时段正确至少间隔 8 小时；“趋于稳定”至少需要两次跨时段正确且含一次中译英；无记录显示证据不足；前端不复制阶段算法；不返回用户原始答案；任何新错误都可使阶段回退。

**Ask First:** 需要新增数据库表、修改 Recite/Context Lab 存储语义、引入付费服务或删除现有词库等级编辑时才需要重新确认。本轮方案均不触发这些边界。

**Never:** 不实现 FSRS、遗忘概率或永久掌握；不增加打卡、提醒、口语、造句和新的 AI 调用；不使用模拟时间线；不把普通长文练习当作微语境修复证据；不修改当前工作区中与本功能无关的已有未提交改动。

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| 新词 | 无 Recite/微语境记录 | `needs_review`，原因“还没有独立回忆证据”，推荐定向复习 | 返回空 evidence |
| 最新答错 | 最新 Recite 为错误 | `needs_review`，推荐语境修复 | 更早正确不覆盖最新错误 |
| 错后语境通过 | 最新错误之后有 micro attempt 正确，无延迟独立答对 | `repairing`，说明仍需间隔复查 | 损坏 JSON 忽略该条 attempt |
| 同日答对 | 最新 Recite 正确，证据不足 8 小时或只有单一正确 | `check_later` | 不称为掌握 |
| 跨时段主动回忆 | 两次正确间隔至少 8 小时，含中译英，最新为正确 | `stabilizing` | 后续错误立即回退 |
| 接口失败 | overview 基础词成功但轨迹读取失败 | 页面保留词信息，显示“证据暂不可用” | 不回退 demo 轨迹 |

</frozen-after-approval>

## Code Map

- `nestjs/src/interface/memory-map/word-journey.ts` -- 纯函数阶段推导、证据排序与用户文案。
- `nestjs/src/interface/memory-map/memory-map-evidence.service.ts` -- 批量读取并归一化当前用户 Recite/micro attempt 证据。
- `nestjs/src/interface/memory-map/memory-map.service.ts` -- 把轨迹装配到 overview 和 word detail。
- `react-font/apps/english-world/src/page/englishWorld/types/learning.ts` -- 前端轨迹数据契约。
- `react-font/apps/english-world/src/page/englishWorld/memoryMap/WordJourneyPanel.tsx` -- 阶段解释和证据时间线组件。
- `react-font/apps/english-world/src/page/englishWorld/memoryMap/MemoryMapPage.tsx` -- 队列阶段、详情和唯一推荐动作。

## Tasks & Acceptance

**Execution:**
- [x] 后端先写阶段纯函数测试，再实现四阶段可逆规则。
- [x] 后端先写证据读取测试，再实现三次批量查询、本人过滤、micro/targetWord 归因与坏 JSON 容错。
- [x] 扩展 Memory Map 服务测试，装配轨迹且证据服务失败时返回 unavailable 轨迹。
- [x] 前端先扩展组件测试，再添加类型、轨迹面板、阶段队列和按 action 导航。
- [x] 移除 Memory Map 的“标记为已掌握”主要动作，保留词库原有等级能力。
- [x] 运行两端定向测试、全量测试、构建和桌面浏览器验收。

**Acceptance Criteria:**
- Given 一个最新答错且随后语境通过的词，when 打开 Memory Map，then 队列和详情均显示“修复中”，时间线展示两条真实证据，主要动作是间隔复查。
- Given 两次间隔至少 8 小时的正确记录且含中译英，when 聚合轨迹，then 显示“趋于稳定”而不是“永久掌握”。
- Given 趋于稳定后发生新错误，when 再次聚合，then 阶段回退“待巩固”。
- Given 没有历史的新词，when 查看详情，then 显示真实空状态和单词定向复习动作。
- Given 其他用户记录或普通 Context Lab attempt，when 查询当前用户轨迹，then 这些记录不进入证据。
- Given 1440px 桌面视口，when 查看完整页，then 阶段、解释、时间线和推荐动作无需滚动横向内容且信息层级清晰。

## Spec Change Log

- 2026-07-18：审查后补强键盘入口、快速切词竞态、异常方向/结果数据、完整 90 天证据读取、失败日志和新微文案可读性；产品边界未改变。

### Review Findings

- [x] [Review][Patch] 弱词队列缺少可见键盘焦点与语义化选择入口。
- [x] [Review][Patch] 快速连续切词时，较慢的旧详情请求可能覆盖当前选择。
- [x] [Review][Patch] 证据尚未加载时会短暂显示无效的“仍要复习”次级按钮。
- [x] [Review][Patch] 微语境任务的 300 条上限可能截断 90 天窗口内的有效证据。
- [x] [Review][Patch] 缺失 direction 的旧复习记录可能被误判为中译英主动回忆。
- [x] [Review][Patch] 非布尔 correct 值会被 JavaScript 真值转换为错误的“通过”证据。
- [x] [Review][Patch] 仅有一次失败语境检查时，下一步应继续语境修复而非普通复习。
- [x] [Review][Patch] 新增轨迹微文案字号与对比度偏弱，未知阶段缺少防御性降级。
- [x] [Review][Patch] 证据聚合异常虽能降级，但缺少服务端可观测日志。

Gemini 盲审、逐分支人工审查和规格验收共提出 13 条候选问题；9 条确认并修复，4 条经代码/架构证据判定为误报（SPA 不存在 SSR hydration、数据库 JSON 字段为 TEXT、attempt 查询依赖 taskIds 不属于 N+1、`git diff --no-index` 的绝对展示路径不影响文件位置）。

## Design Notes

后端返回 `stage/label/reason/nextAction/suggestedTiming/evidence` 完整展示模型；前端只负责渲染和导航。`englishLevel` 继续存在，但只作为旧词库字段，不参与轨迹结论。阶段视觉同时使用图标、文字和颜色，避免纯色表达。

## Verification

**Commands:**
- `npm test -- --runInBand && npm run build`（nestjs）-- 27 个套件、142 项测试和生产构建通过。
- `pnpm --filter @font/english-world test --run --maxWorkers=1 --no-file-parallelism`（react-font）-- 41 个文件、203 项测试通过。
- `pnpm --filter @font/english-world build`（react-font）-- TypeScript 与 Vite 生产构建通过。
- 浏览器在 1440×1000 查看 `/englishWorld/memory-map` -- 三栏层级、空证据、推荐动作和键盘入口清晰；定向复习 URL 精确携带当前词 ID；重新加载后无新增 console error。

## Suggested Review Order

**阶段真值**

- 从纯函数理解四阶段、错误回退和 8 小时间隔门槛。
  [`word-journey.ts:52`](../../../../nestjs/src/interface/memory-map/word-journey.ts#L52)

- 批量归一化本人 Recite 与微语境证据，不暴露答案正文。
  [`memory-map-evidence.service.ts:18`](../../../../nestjs/src/interface/memory-map/memory-map-evidence.service.ts#L18)

- 装配 overview/detail，并在证据层失败时诚实降级。
  [`memory-map.service.ts:24`](../../../../nestjs/src/interface/memory-map/memory-map.service.ts#L24)

**桌面体验**

- 轨迹卡统一阶段、建议时机、事实时间线和空状态。
  [`WordJourneyPanel.tsx:52`](../../../apps/english-world/src/page/englishWorld/memoryMap/WordJourneyPanel.tsx#L52)

- 队列支持键盘选择，并防止旧详情请求覆盖新选择。
  [`MemoryMapPage.tsx:336`](../../../apps/english-world/src/page/englishWorld/memoryMap/MemoryMapPage.tsx#L336)

- 行动中心只突出后端推荐动作并精确携带当前词。
  [`MemoryMapPage.tsx:661`](../../../apps/english-world/src/page/englishWorld/memoryMap/MemoryMapPage.tsx#L661)

**契约与回归**

- 前端类型保持渲染层与阶段算法分离。
  [`learning.ts:16`](../../../apps/english-world/src/page/englishWorld/types/learning.ts#L16)

- 组件测试覆盖轨迹呈现、导航、竞态和键盘入口。
  [`MemoryMapPage.test.tsx:42`](../../../apps/english-world/src/page/englishWorld/memoryMap/MemoryMapPage.test.tsx#L42)
