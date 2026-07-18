# Word Journey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 Memory Map 中交付基于真实学习记录的可解释词汇掌握轨迹。

**Architecture:** 新增一个无数据库依赖的阶段推导器，以及一个只负责批量归一化 Recite/micro attempt 的证据服务；Memory Map 只做装配。前端使用后端完整展示模型渲染队列、阶段卡、证据时间线和唯一推荐动作，不复制规则。

**Tech Stack:** NestJS、Sequelize、Jest、React、TypeScript、Ant Design、Vitest、Testing Library。

## Global Constraints

- 最多 12 个词、最近 90 天、每词最多 5 条证据。
- 跨时段阈值固定为 8 小时；稳定证据窗口为 30 天。
- 不新增表、依赖或 AI 请求，不返回答案正文。
- 只修改本功能文件并精确暂存，保留工作区原有未提交内容。

---

### Task 1: 纯函数阶段模型

**Files:**
- Create: `../nestjs/src/interface/memory-map/word-journey.ts`
- Create: `../nestjs/src/interface/memory-map/word-journey.spec.ts`

**Interfaces:**
- Consumes: `WordJourneyEvidenceInput { type, occurredAt, correct?, direction? }[]`。
- Produces: `deriveWordJourney(wordId, now, inputs): WordJourney`，包含 `stage`、展示文案、`nextAction`、`suggestedTiming`、最多 5 条 evidence。

- [x] **Step 1: 写失败测试**：覆盖无历史、最新错误、错后语境通过、同日正确、跨 8 小时双次正确、稳定后新错误六种状态。
- [x] **Step 2: 验证 RED**：运行 `npm test -- --runInBand src/interface/memory-map/word-journey.spec.ts`，预期因模块不存在失败。
- [x] **Step 3: 最小实现**：按“最新错误 → 错后语境 → 最新正确 → 跨时段主动回忆”优先级推导；所有时间线降序后截取 5 条。
- [x] **Step 4: 验证 GREEN**：同一命令全部通过，且无 console 警告。

### Task 2: 批量证据读取与安全归因

**Files:**
- Create: `../nestjs/src/interface/memory-map/memory-map-evidence.service.ts`
- Create: `../nestjs/src/interface/memory-map/memory-map-evidence.service.spec.ts`
- Modify: `../nestjs/src/interface/memory-map/memory-map.module.ts`

**Interfaces:**
- Consumes: `getJourneys(userId: number, words: Array<{ id: number; word: string }>, now?: Date)`。
- Produces: `Promise<Map<number, WordJourney>>`；数据库固定进行 recite、task、attempt 三组批量查询。

- [x] **Step 1: 写失败测试**：mock models，断言所有查询含 `userId`；普通 task 被排除；micro attempt 按 `targetWord` 聚合；坏 JSON 忽略；同词同 attempt 合并一条。
- [x] **Step 2: 验证 RED**：运行 `npm test -- --runInBand src/interface/memory-map/memory-map-evidence.service.spec.ts`，预期模块不存在。
- [x] **Step 3: 最小实现**：规范化词文本；查询 90 天 recite；筛选 `requestJson.mode === 'micro'` 的本人任务；只查询这些 taskIds 的本人 attempts；把结果转换为纯函数输入。
- [x] **Step 4: 验证 GREEN**：定向测试通过，并断言空 taskIds 时不发 attempt 查询。

### Task 3: Memory Map 契约装配

**Files:**
- Modify: `../nestjs/src/interface/memory-map/memory-map.service.ts`
- Modify: `../nestjs/src/interface/memory-map/memory-map.service.spec.ts`

**Interfaces:**
- Consumes: `MemoryMapEvidenceService.getJourneys`。
- Produces: overview 的 `weakWords[].journey` 与 word detail 的 `journey`。

- [x] **Step 1: 写失败测试**：断言 overview 把 map 中轨迹装到对应词；证据服务抛错时装配 `unavailable` 展示模型而非模拟证据。
- [x] **Step 2: 验证 RED**：定向 Jest 测试应因 constructor/字段缺失失败。
- [x] **Step 3: 最小实现**：在获取基础数据后只为 weakWords 调用一次证据服务；word-detail 为当前词调用同一服务；捕获证据层失败并返回明确 unavailable。
- [x] **Step 4: 验证 GREEN**：运行整个 memory-map 测试目录。

### Task 4: 前端轨迹面板与队列阶段

**Files:**
- Modify: `apps/english-world/src/page/englishWorld/types/learning.ts`
- Create: `apps/english-world/src/page/englishWorld/memoryMap/WordJourneyPanel.tsx`
- Modify: `apps/english-world/src/page/englishWorld/memoryMap/MemoryMapPage.tsx`
- Modify: `apps/english-world/src/page/englishWorld/memoryMap/MemoryMapPage.test.tsx`

**Interfaces:**
- Consumes: `LearningWord.journey?: WordJourney`。
- Produces: 带文本和图标的阶段标签、解释卡、最多五条证据时间线、一个主要动作。

- [x] **Step 1: 写失败测试**：mock `repairing` 轨迹，断言队列/详情显示“修复中”、真实证据和建议明日；点击主要动作导航到单词定向 Recite。另测无 evidence 空状态与 `context` 导航。
- [x] **Step 2: 验证 RED**：运行 Memory Map Vitest，预期找不到新标签和时间线。
- [x] **Step 3: 最小实现**：新增类型和面板；队列用阶段替代 Lv；详情嵌入面板；使用 `createPlanReviewSearch` 或 URLSearchParams 携带单词 ID；Context Lab 使用 `source=cockpit&words=`。
- [x] **Step 4: 行动中心重排**：移除“标记为已掌握”主按钮；按 `review/context/wait` 只突出一个动作，保留返回词库和自选练习为次级动作。
- [x] **Step 5: 验证 GREEN**：定向 Vitest 通过，键盘可访问名称无重复冲突。

### Task 5: 全量验证、复审与提交

**Files:**
- Modify: `docs/superpowers/specs/spec-word-journey.md`
- Create: `docs/superpowers/prds/prd-english-world-2026-07-18/review-rubric.md`

**Interfaces:**
- Consumes: 两端实现和测试结果。
- Produces: status `done` 的规格、无 blocker 的审查和两个精确本地提交。

- [x] **Step 1: 后端验证**：`npm test -- --runInBand` 后运行 `npm run build`。
- [x] **Step 2: 前端验证**：`npm run test:run` 后运行 `npm run build:english`。
- [x] **Step 3: 浏览器验收**：在 1440×1000 真实页面检查首屏三栏、阶段层级、时间线、导航、loading/error/empty。
- [x] **Step 4: 对抗复审**：检查越权、错误优先级、坏 JSON、N+1、模拟数据、误导性掌握文案和工作区污染；发现问题回到对应 TDD 任务。
- [x] **Step 5: Gemini 与替代审核**：Gemini 首轮盲审问题全部修复；最终调用因账户余额不足中断，以逐分支审查、规格审计、全量回归和真实浏览器验收补齐门槛。
- [x] **Step 6: 精确提交**：仅暂存本轮路径，提交前后分别核对 `git diff --cached --stat`；不推送。

## Self-Review

- PRD FR-1 至 FR-7 均映射到 Task 1–4，验证与反指标映射到 Task 5。
- 计划不含 TBD/TODO/“适当处理”等占位语。
- `WordJourney`、`stage`、`nextAction`、`suggestedTiming` 与前后端命名一致。
