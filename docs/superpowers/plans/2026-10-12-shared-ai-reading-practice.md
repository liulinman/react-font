# Shared AI Reading Practice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 后台发布 AI 生成的共享阅读练习，用户独立作答，提交后查看成绩、正确答案、中文解析和原文依据。

**Architecture:** 新增共享试卷、接收人、正式提交与运行记录，保留个人 Context Lab 的归属模型。AI 生成和定时运行使用 MySQL 持久化任务及租约；发布通知采用事务与可重试投递。前端共用独立的阅读练习 API/展示组件，接入后台、桌面和移动端。

**Tech Stack:** 现有 NestJS 10、Sequelize 6、MySQL、React 18、TypeScript、Ant Design、Jest、Vitest、Cypress；复用服务端 DeepSeek 客户端，不引入新的队列基础设施。

**Spec:** `docs/superpowers/specs/2026-10-12-shared-ai-reading-practice-design.md`（2026-10-12 用户已批准）。

## Global Constraints

- “同一套题、每位用户独立作答”。英文文章、英文题干与选项、中文解析。
- 默认 400 词、5 题、雅思 6.0；200–800 词、3–13 题、雅思 5.0–7.5，0.5 步长。
- 单选题和 True / False / Not Given；每题一项正确答案。各题等权，成绩取整数。
- 每人每套练习一次正式提交；提交后可长期回看。不加入排名、作文、口语、开放填空或跨设备草稿同步。
- 提交前的任何用户响应、通知、SSE、前端缓存和资源都不包含正确答案、解析或答案依据。
- 发布时固定正常用户接收名单；已发布内容不可原位修改。
- 生成输出最多一次修复生成；任务最多三次运行尝试。失败不发布占位内容。
- 草稿/自动发布两种模式；普通通知和个人练习保持兼容。
- 桌面 Web 和移动端 Web 都交付，原生打包不在范围内。
- 不覆盖现有未提交改动；不执行整仓 reset、checkout 或宽泛 git add。最终部署仍需要发布授权。

## Review Focus

1. 用户、题目或提交 ID 被替换：不可获取他人的成绩或提交前的答案。归 Task 2 的真实双用户接口测试。
2. 撤回与提交/投递同时发生：以事务内锁定顺序确定结果，撤回后拒绝新提交与补投。归 Task 2/4 的并发测试。
3. AI 调用完成时租约已过期、任务被删除或已被新 worker 领取：旧 worker 不得覆盖新状态。归 Task 3 的 CAS 测试。
4. 指定用户在发布前被封禁或删除：发布拒绝不完整受众，不静默发给其他用户；全员范围取发布时正常用户快照。归 Task 4 的受众测试。
5. 退出后换账号、切换试卷、网络断开再提交：草稿隔离且一次提交，已完成页面恢复服务端结果。归 Task 7/8 的浏览器测试。

## Workspace and execution rules

- 前端仓库：`/Users/liulin/Desktop/font/english/react-font`。
- 后端仓库：`/Users/liulin/Desktop/font/english/nestjs`。
- 本计划路径均相对于这两个仓库的共同父目录 `/Users/liulin/Desktop/font/english`，除非命令明确给出 cwd。
- 执行前保存两仓 `git status --short` 和相关 diff 到任务记录；现有知识笔记、移动端、通知及后台优化不得覆盖。
- 直接在当前工作区增量实现，保留未提交后台优化作为依赖；如需隔离，先按 using-git-worktrees 技能建立工作树并显式携带相关基线，不能从旧 HEAD 丢弃依赖。
- 每个任务遵循测试失败 → 最小实现 → 测试通过 → 审查；只提交该任务的明确路径。涉及已有未提交文件，使用精确分块暂存，无法可靠拆分时先保留工作区改动并在任务记录说明，不能夹带无关内容。
- 不向生产 AI 或真实用户发送测试内容；集成测试仅替换外部 AI HTTP 边界，数据库、授权和业务逻辑保持真实。

## Shared contracts

以下类型由 Task 1 定义，前端在 Task 6 镜像 API DTO；不把服务端含答案类型放进用户页面 props。

```ts
type QuestionKind = 'choice' | 'true_false_not_given';
type PracticeStatus = 'queued' | 'generating' | 'draft' | 'published' | 'withdrawn' | 'failed';
interface PracticeConfig {
  topic: string; wordCount: number; questionCount: number; ieltsBand: number;
  questionTypes: QuestionKind[];
  targetType: 'all' | 'selected'; targetUserIds?: number[];
}
interface PublicQuestion { id: string; kind: QuestionKind; stem: string; options: string[] }
interface AnswerKey { correctIndex: number; explanation: string; evidence: { paragraph: number; quote?: string; missingInformation?: string } }
interface GeneratedPractice { title: string; paragraphs: string[]; questions: (PublicQuestion & AnswerKey)[] }
interface PublicPractice { id: number; title: string; paragraphs: string[]; questions: PublicQuestion[]; ieltsBand: number; status: 'published' | 'withdrawn'; submitted: boolean }
interface SubmitPractice { requestUid: string; answers: { questionId: string; selectedIndex: number }[] }
interface PracticeResult { practiceId: number; submittedAt: string; score: number; correctCount: number; total: number; results: (PublicQuestion & AnswerKey & { selectedIndex: number; correct: boolean })[] }
interface Page<T> { list: T[]; total: number; page: number; pageSize: number }
```

## Task 1: 持久化模型、迁移与严格契约

**Files:** 新建 `nestjs/migrations/create-reading-practice.sql`、`nestjs/src/database/reading-practice.ts`、`reading-practice-assignment.ts`、`reading-practice-submission.ts`、`reading-practice-run.ts`；修改 `nestjs/src/database/init-models.ts`、`notification-schedule.ts`、`nestjs/migrations/README.md`、`nestjs/init.sql`；新建 `nestjs/src/interface/reading-practice/reading-practice.types.ts`、`reading-practice.contract.ts`、`reading-practice.contract.spec.ts`、`dto/reading-practice.dto.ts`。

**Interfaces:** `validateGeneratedPractice(raw: unknown, config: PracticeConfig): GeneratedPractice`；`toPublicPractice(row, submitted): PublicPractice`；`gradePractice(content: GeneratedPractice, submission: SubmitPractice): Omit<PracticeResult, 'practiceId' | 'submittedAt'>`。所有 DTO 拒绝非法数值、重复题目、漏题及越界选项。

- [ ] 写契约失败测试：`expect(() => validateGeneratedPractice({questions: []}, config)).toThrow()`；合法 fixture 包含至少三题、真实段落、中文解析和 3/4 项选项，题量必须等于 config。
- [ ] 写评分失败测试：三题选择分别正确/错误/正确，断言 `score === 67`、`correctCount === 2`；重复 questionId 和伪造题目 ID 均拒绝。
- [ ] 在后端运行 `pnpm test -- --runInBand reading-practice.contract.spec.ts`，确认新契约未实现造成失败。
- [ ] 实现白名单公开序列化与确定性评分：

```ts
const publicQuestions = content.questions.map(({ id, kind, stem, options }) => ({ id, kind, stem, options }));
const correctCount = results.filter(result => result.correct).length;
const score = Math.round(correctCount * 100 / results.length);
```

- [ ] 创建迁移：assignment/submission 都对 `(practice_id, user_id)` 唯一；practice 对生成 requestUid 唯一；run 对 `run_key` 唯一。JSON 内容用现有项目兼容的 TEXT/JSON 序列化方式，公开响应绝不直接 spread 数据库行。
- [ ] practice 保存 status、配置/内容 JSON、requestUid、generationAttempts、leaseToken、leaseUntil、nextAttemptAt、failureSummary 和时间戳；assignment 保存 notificationId 和 pending/delivered 状态；submission 保存 requestUid、answers/results JSON；run 保存 scheduleId、scheduledFor、人工 requestUid、practiceId、lease 及状态。
- [ ] 现有 schedule 添加 `contentKind`（默认 notification）和可空 `practiceConfigJson`；旧记录与旧请求仍有效。迁移在空库和现有结构副本各执行两遍验证幂等，不使用生产库。
- [ ] 测试通过后只暂存任务文件，提交 `feat: add shared reading practice data contracts`。

## Task 2: 用户授权、作答与持久化结果

**Files:** 新建 `nestjs/src/interface/reading-practice/reading-practice.service.ts`、`reading-practice.controller.ts`、`reading-practice.module.ts`、`reading-practice.service.spec.ts`、`nestjs/test/integration/reading-practice.integration-spec.ts`；修改 `nestjs/src/app.module.ts` 和测试 fixture。

**Interfaces:** `ReadingPracticeService.listForUser(userId, page, pageSize)`、`getForUser(userId, practiceId)`、`submit(userId, practiceId, dto)`、`getResult(userId, practiceId)`。用户路由为规范中 `/reading-practices`、`/:id`、`/:id/submissions`、`/:id/result`，统一使用 AuthGuard 与 CurrentUser。

- [ ] 在真实 MySQL fixture 创建相同试卷和两个接收人，测试 Alice/Bob 的独立结果以及第三位非接收人的 404。
- [ ] 断言提交前完整响应 `JSON.stringify(body)` 不含 `correctIndex`、`explanation`、`evidence`，并且公开题目字段集合严格等于公共契约。
- [ ] 并发提交相同 requestUid：两个响应读取同一结果且 submission 表只有一行；另一 requestUid 修改答案返回 409。提交返回后再读取 result，逐字段一致。
- [ ] 使用后端 `node scripts/test-local.mjs` 验证新增用例先失败；AI fixture 不参与本任务。
- [ ] 在事务内按固定顺序锁 practice、assignment，校验 published 和接收人，再读取已有 submission；同请求且同答案重放返回原结果，否则冲突。答案齐全校验后评分并插入，唯一约束冲突读取已有结果再判断重放。

```ts
// Transaction policy: lock practice before assignment everywhere.
if (existing && existing.requestUid === dto.requestUid && sameAnswers(existing, dto)) return existing.result;
if (existing) throw new ConflictException('这套练习已经提交');
if (practice.status !== 'published') throw new ConflictException('练习已撤回');
```

`sameAnswers` 在本任务定义：排序规范化 questionId 后逐项比较整数索引，不比较用户对象引用。

- [ ] 撤回与提交并发：已获得 practice 锁的提交先完成则结果可回看；撤回先完成则提交拒绝。result 只验证拥有 submission，不因撤回而删除成绩。
- [ ] 接口用例和 build 通过，提交 `feat: add isolated reading practice submissions`。

## Task 3: AI 生成、校验、租约与失败恢复

**Files:** 新建 `nestjs/src/interface/reading-practice/reading-practice-generator.service.ts`、`reading-practice-worker.service.ts`、`reading-practice-generator.spec.ts`、`reading-practice-worker.spec.ts`；修改 reading-practice 模块和集成 AI fixture。

**Interfaces:** `ReadingPracticeGenerator.generate(config): Promise<GeneratedPractice>`；`ReadingPracticeWorker.tick(now: Date): Promise<void>`；service 增加 `createGeneration(config, requestUid)`、`retryGeneration(id)`。请求签名不同但 requestUid 相同返回 409。

- [ ] 用 HTTP fake 返回有效 JSON、不合法 JSON、缺解析、错误原文引用、重复选项、Not Given 缺信息说明；断言一次修复后仍不合法进入 failed，绝不变 published。
- [ ] worker 用例：两个 worker tick 同时执行只领取一次；重启后租约过期可回收；旧 token 返回的 AI 结果不能更新新租约；三次运行失败终止。
- [ ] 运行 `pnpm test -- --runInBand reading-practice-generator reading-practice-worker` 确认失败。
- [ ] 复用 `createDeepSeekClient` 和 `getDeepSeekModel`；明确 JSON schema，用户 topic 放入内容字段，不授予其覆盖系统结构约束的优先级。AI 结果只作为数据，经 Task 1 校验后持久化。
- [ ] 为每次生成设 90 秒 HTTP 超时，租约 180 秒，超时失败分别在 30 秒、120 秒后重试；达到第三次失败进入 failed。管理员显式重试从 failed 开启新的最多三次周期，不能改变已发布试卷。
- [ ] 原子领取 queued 或已超时 generating 记录，生成新的 leaseToken，写回使用 fencing 条件：

```ts
await models.readingPractice.update(patch, {
  where: { id, status: 'generating', leaseToken },
});
```

- [ ] 自动修复调用仍计入同一次 worker 尝试；错误摘要不存 token、Cookie、完整外部响应。enabled 开关 `READING_PRACTICE_ENABLED` 关闭时 worker 不领取任务。
- [ ] 测试通过，提交 `feat: generate and validate shared AI reading papers`。

## Task 4: 管理员预览、发布、通知投递与撤回

**Files:** 新建 `nestjs/src/interface/reading-practice/admin-reading-practice.controller.ts`、`reading-practice-publishing.service.ts`、`reading-practice-publishing.spec.ts`；修改 `nestjs/src/interface/notification/notification.service.ts` 及通知类型、reading-practice 模块；扩充 MySQL 接口测试。

**Interfaces:** `ReadingPracticePublishing.publish(id)`、`withdraw(id)`、`deliverPending(now)`；service 增加 `listForAdmin(page,pageSize)`、`getForAdmin(id)`、`deleteDraft(id)`。只后台详情可返回答案，所有管理路由使用 AdminAuthGuard。

- [ ] 写失败测试：重复 publish 不增加 assignment/notification；指定用户在发布前被封禁或删除时拒绝发布；全员为空时拒绝并保持 draft；未授权 admin 请求拒绝。
- [ ] 写进程中断测试：事务提交后投递进程中断，再运行 deliverPending，收件箱只存在一条通知；withdraw 先锁住 practice 则 pending 投递停止。
- [ ] publish 事务内锁 practice，解析受众并检查所有指定用户有效；创建一条关联通知、assignment 快照并变 published。通知只含简短题目介绍，不含正文答案。
- [ ] 投递事务按 practice → assignment 顺序加锁，创建对应 userNotification 并标记 delivered；notificationId 由 publish 固定，不能每次 retry 新建 notification。检查/补充接收关系唯一约束，先审计已有重复数据，不能盲目添加会失败的唯一索引。
- [ ] SSE 在事务提交后发送，消费者按通知 ID 去重；即便 SSE 丢失，收件箱和练习列表可从数据库恢复。
- [ ] 通知返回白名单 action：

```ts
return practiceId ? { type: 'reading_practice', practiceId } : undefined;
```

仅信任发布流程写入的有效关联，不把 metadata 或任意 URL 透传。

- [ ] deleteDraft 仅允许未被有效租约占用的 queued/draft/failed 行；worker CAS 必须在删除后无影响。withdraw 不删除 submissions。
- [ ] 集成测试与 build 通过，提交 `feat: publish reading practices with reliable delivery`。

## Task 5: 接入现有定时任务，防止重复运行

**Files:** 新建 `nestjs/src/interface/notification/notification-runner.registry.ts`、`nestjs/src/interface/reading-practice/reading-practice-schedule.service.ts`、`reading-practice-schedule.spec.ts`；修改 `notification-scheduler.service.ts`、`notification.module.ts`、`dto/notification.dto.ts`、`reading-practice.module.ts`。

**Interfaces:** registry 提供 `register(kind, handler)` 和 `run(kind, schedule, runKey)`；kind 为 notification/reading_practice，handler 返回 `Promise<{practiceId?: number; status: string}>`。ReadingPracticeScheduleService 在 OnModuleInit 注册自己的 handler。

- [ ] 模块依赖：ReadingPracticeModule imports NotificationModule，NotificationModule 导出 NotificationService 和 registry；通知模块不反向 import 阅读模块，避免循环依赖。普通通知仍使用原处理器。
- [ ] 测试同一 due slot 重复轮询只建一条 run 和一套 practice；两个实例并发亦相同；人工同 requestUid 重放同结果，新 requestUid 为新运行。
- [ ] 测试“草稿待审核”停在 draft 无通知，“自动发布”只有生成校验成功后调用 Task 4 发布；生成失败不移交半成品。
- [ ] 测试一次任务只执行一次；每日/每周按原 computeNextRun 算法与北京时间执行；人工运行不改变下一计划时间。
- [ ] 在 `runDueSchedules` 中遇到 reading_practice 使用 `schedule:{id}:{scheduledForISO}` 作为 runKey，事务记录 run 和下次运行时间；run 的 practiceId 固定关联，重试不另建试卷。普通通知保持旧逻辑。
- [ ] 定时 DTO 必填完整 practiceConfig，练习模式不允许 aiMode=off；删除 schedule 不删除已经 published 的练习与提交。新增状态响应包含最近运行状态、失败摘要与 practiceId。
- [ ] 模拟 worker 在 claim 后退出、再启动恢复同一次 run，验证唯一性。测试通过提交 `feat: schedule shared reading practices safely`。

## Task 6: 后台练习管理与计划配置

**Files:** 新建 `react-font/apps/admin/src/api/readingPractice.ts`、`readingPractice.type.ts`、`ReadingPracticePanel.tsx`、`ReadingPracticeEditor.tsx`、`ReadingPracticePreview.tsx`、`__tests__/ReadingPracticePanel.test.tsx`；修改 `AdminApp.tsx`、`ScheduleEditor.tsx`、`api/notification.type.ts`、`styles.css`。

**Interfaces:** API 镜像规范路由及 Task 1 DTO；后台类型可以包含答案，但不导入用户应用。列表查询轮询仅用于 queued/generating 记录，离开/卸载时停止。面板 `ReadingPracticePanel` 不承担普通公告逻辑。

- [ ] 测试新建生成返回 job ID 后能刷新恢复状态；失败显示重试；已发布页面不显示修改内容按钮；发布确认取消无请求，连点只发一次。
- [ ] 用例代码以实际 API 边界断言：

```ts
await user.click(screen.getByRole('button', { name: '发布练习' }));
expect(publishRequests).toHaveLength(0);
await user.click(screen.getByRole('button', { name: '确认发布' }));
await waitFor(() => expect(publishRequests).toHaveLength(1));
```

`publishRequests` 由该测试的网络 fake 在真实请求到达时记录，不能 mock 掉整个面板。

- [ ] 新建表单默认 config 为规范值；接收人复用 RecipientSelect；校验目标题型数组非空、整数题量/词数、难度步长。生成 requestUid 在一次操作生命周期内固定。
- [ ] 预览展示全部题目与解析；发布/撤回/删除提示对象名称及后果。再生成创建新任务，不覆盖发布内容。
- [ ] ScheduleEditor 增加“内容形式”选择；普通通知显示原字段，阅读练习显示完整配置与草稿/自动发布模式，隐藏字段不提交到错误模式。
- [ ] 在前端执行 `pnpm --filter @font/admin test --run`、`pnpm --filter @font/admin build`；通过后精确提交 `feat: manage shared reading exercises in admin`。

## Task 7: 用户阅读、答题与结果组件

**Files:** 新建 `react-font/apps/english-world/src/readingPractice/api.ts`、`types.ts`、`ReadingPracticeList.tsx`、`ReadingPracticeReader.tsx`、`ReadingPracticeResult.tsx`、`usePracticeDraft.ts`、`readingPractice.css`、`ReadingPractice.test.tsx`。

**Interfaces:** `ReadingPracticeList({basePath})`、`ReadingPracticeReader({practiceId,basePath,userId})`、`ReadingPracticeResult({practiceId,basePath})`；请求使用用户 PublicPractice 与 PracticeResult；basePath 由桌面/移动端入口给出。

- [ ] 测试服务端公开 fixture 完全没有答案字段时仍能阅读和作答；提交成功才渲染正确答案、解释与引用。
- [ ] 测试漏题定位、不完整答案不提交；暂时离线/请求失败保留选择和 requestUid，重试读回原提交结果。
- [ ] 草稿 key 为 `reading-practice:v1:{userId}:{practiceId}`，内容仅含用户选择、requestUid 和保存时间；恢复时逐题验证 ID、索引、schemaVersion，未知/损坏草稿丢弃并提示，不恢复其他用户数据。
- [ ] 服务端 submitted=true 时直接加载 result，不允许旧本机草稿覆盖；提交结果成功后移除该草稿。
- [ ] 阅读组件将正文段落当文本渲染；题目用原生 radio/fieldset 或等价键盘可操作结构，禁止 AI HTML 直接插入。
- [ ] 显示双方答案与所有题的解析，引用定位到正确段落；Not Given 显示缺失信息说明。结果在刷新后通过 result API 恢复。
- [ ] 运行 `pnpm --filter @font/english-world exec vitest run src/readingPractice` 与 TypeScript build；通过提交 `feat: complete shared reading practice learner flow`。

## Task 8: 桌面、移动端、通知入口及兼容性

**Files:** 修改 `react-font/apps/english-world/src/router/router.tsx`、`page/englishWorld/navigation.ts`、`page/englishWorld/component/EnglishHeader.tsx`、`page/englishWorldMobile/app/mobileRouteConfig.tsx`、`page/englishWorldMobile/features/home/MobileHomePage.tsx`、`notifications/NotificationBell.tsx`、`notifications/NotificationContext.tsx`、`server/notification/notification.type.ts`；新建 `cypress/e2e/shared-reading-practice.cy.ts`；同步现有路由/能力清单测试。

**Interfaces:** 桌面 basePath `/englishWorld/reading-practices`，移动端 `/mobile/reading-practices`；列表、`/:id` 作答、`/:id/result` 结果。通知 action 映射这两个内部根路径，不接受任意 action.url。

- [ ] 从通知进入、直接 URL 打开、登录后回到目标、从独立列表进入均测试；未知 action 不渲染可点击外链。
- [ ] 320px、390px、桌面视口验证文章/题目切换、阅读段落不横向溢出、提交按钮可操作；长标题、长单词和 13 题也覆盖。
- [ ] 完成一次双用户流程：Alice 作答并提交，退出后 Bob 看到未提交且没有 Alice 草稿，Bob 成绩不改变 Alice 历史结果。
- [ ] 对已撤回但已提交的通知入口，用户能进入自己的结果；未提交者显示已撤回并禁止作答。
- [ ] 已存在移动通知入口先定位实际路由/组件并接入同一 action mapper，不仅修改桌面 Bell。能力清单增加新入口并保留旧条目，不能只修改期望总数掩盖缺失。
- [ ] 运行相关通知、路由、个人阅读回归，再构建 English World；通过提交 `feat: connect reading assignments across web clients`。

## Task 9: 真实数据库全流程验收、发布包与交接

**Files:** 扩充 `nestjs/test/integration/reading-practice.integration-spec.ts`、`nestjs/test/integration/harness.ts`；完善 `react-font/apps/english-world/cypress/e2e/shared-reading-practice.cy.ts`；新建 `react-font/docs/testing/shared-reading-practice-acceptance.md`。

- [ ] 使用 `node scripts/test-local.mjs --serve` 启动隔离数据库和后端，AI HTTP fixture 输出固定内容；验证不是在浏览器 intercept 所有业务接口的假集成。
- [ ] 端到端操作：管理员生成 → 预览 → 发布给两个测试用户 → 两用户独立作答 → 查看答案解析 → 刷新恢复 → 撤回后新提交被拒绝；核对真实库 submission/assignment 数量。
- [ ] 运行三种计划模式（每天、每周、一次）以及人工运行与重启恢复。通过注入时间/显式 tick 驱动，不等待真实次日，也不修改生产时钟。
- [ ] 运行后端 `pnpm test -- --runInBand`、`pnpm build`；前端 Admin 全套、English World 相关完整套件、两个生产 build；报告任何已有失败和警告，不将部分通过写成全部通过。
- [ ] 独立代码审查重点核查公开 DTO、唯一约束、事务锁顺序、租约 CAS、撤回并发和结果持久化；修复重要问题后只重跑受影响验证。
- [ ] 生成验收报告：实际命令/结果、截图、前后端 SHA 与未提交差异、迁移执行记录、功能开关、回退步骤。
- [ ] 发布准备：以当前线上基线整合必要改动，包含前面批准的后台优化，排除无关本地改动；数据库先兼容迁移，后端先支持，前端后展示。备份镜像与数据库，不回滚删表。
- [ ] 未收到本功能上线授权时停在可运行、已验证发布包；若已获得上线授权则执行发布，验证线上静态资源和路由，并用不触达真实用户的方式完成冒烟，不发布测试练习给真实用户。

## Plan self-review

- 规范 1–3 的生成、审核、同卷独立作答、提交后解析与历史回看：Tasks 3/4/6/7/8。
- 规范 4–7 的归属隔离、白名单响应、数据库状态与接口：Tasks 1/2/3/4。
- 规范 6 的失败恢复、去重、投递和自动发布：Tasks 3/4/5。
- 规范 8 的桌面、移动和通知入口：Task 8。
- 规范 9 的十二项验收与规范 10 的部署回退：Task 9，并由前置任务提供测试。
- 五项 Review Focus 分别有事务/租约/受众/双用户测试归属；未发现需要再次改变已批准产品范围的缺口。
- 此计划尚未开始执行；状态应通过任务复选框和验收报告更新，不能以文档存在代替功能完成。
