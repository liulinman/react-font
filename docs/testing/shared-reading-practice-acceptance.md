# 共享 AI 阅读练习验收与发布记录

日期：2026-10-12，负责人：Codex。用户授权：“开始吧做完发布”。

## 已交付

- 后台阅读练习管理：主题、雅思难度、词数、题量、单选/判断题、全部/指定正常用户；生成状态、失败重试、完整预览、发布确认、再生成、撤回。
- 定时任务区分普通通知与阅读练习；每天、每周、一次；草稿审核或校验后自动发布。人工运行请求去重，不移动下一计划时间。
- 同一试卷独立作答。服务端评分、一次正式提交、幂等重试、结果永久回看；提交前响应采用白名单，不携带答案/解析/依据。
- 桌面阅读/答题双栏；手机阅读/答题切换，结果页原文/解析切换；本机草稿按用户与试卷隔离。独立列表和通知均可进入。
- 生成任务持久化、最多三次尝试、每次最多一次结构修复、租约超时恢复及 token fencing。发布接收名单快照与通知持久化投递。
- 删除用户通过新表外键级联清理关联练习数据；单条投递故障不会阻止同批其他接收人。

## 实际验证

- 本地后端 `pnpm exec jest --runInBand`：43 文件，301 测试通过。
- **实际发布基线**后端同命令（隔离测试环境变量）：71 文件，631 测试通过；`pnpm build` 通过。发布基线保留了本地旧分支没有的线上用户删除和学习会话模块。
- 本地 MySQL/Nest HTTP 集成 `node scripts/test-local.mjs --serve`：2 文件，16 测试通过。只有外部 AI HTTP 被替换，业务接口、权限、事务、评分与数据库真实运行。覆盖双用户、非接收人、并发提交、撤回、受众变化、生成去重、租约 fencing、调度去重、自动发布、通知补投及删除用户。
- 数据库迁移在缺少新增表/列时执行两次，已有数据时再执行两次，数据保留。
- 实际发布基线 Admin：5 文件，17 测试通过。相关用户端：6 文件，24 测试通过。两个生产 build 通过。
- 浏览器 `shared-reading-practice.cy.ts`：真实 API 全流程通过（生成、预览、发布、桌面用户 100 分、320px 手机另一用户 0 分、手机通知跳转、刷新恢复、撤回后保留结果）。没有替换业务 API。
- 本地用户端全量 93 文件/574 测试首次 571 通过；两项 EnglishWorld 测试因 30 秒超时，单独重跑均通过。剩余 `opens mobile login on a native cold start` 已用本次修改前的 router 代码独立复现，属于原生应用既有测试问题。本次仅 Web 发布，发布源码不包含本地原生改动。未将此全量运行写为全部通过。
- 构建仍有现有 chunk-size、Browserslist/Tailwind 警告；测试中仍有现有 Ant Design/jsdom 提示。

## 独立审查与决定

审查员 review_reading 完成一次只读独立审查，未发现 Critical。

1. Important：删除用户后的 pending assignment 可能阻塞投递。新增回归先失败（孤儿计数为 1），增加新表用户外键级联与逐项投递容错后集成通过。
2. 审查标注 Minor 的“所选题型未全部出现”按对实际使用的影响升级为 Important：用户已明确选择两种题型，必须兑现。新增反例先失败，再收紧校验后通过。
3. 浏览器暴露提交后停留在旧滚动位置的问题；修正结果区定位并为手机结果提供原文/解析切换，浏览器完整流程通过。

实现决定：
- 保留当前功能分支和原有未提交改动，而不是从旧 HEAD 重建；代价是发布需要额外核对线上基线。
- 运行记录的生成租约/重试状态由关联试卷统一管理，避免双份可变状态；运行列表需要关联查询。
- 后端服务任务合并使用真实数据库接口用例验证，替代若干单独的模型 mock 测试；代价是集成测试启动较慢。
- 幂等配置先规范化再比较，消除 MySQL JSON 键顺序变化的误判；未知配置字段不进入签名。
- 发布使用线上源码快照三方合并，仅纳入本次及此前已确认的后台优化；没有发布本地未完成的原生/其他移动改动。代价是发布包需单独验证，已完成。
- 提交仅收录能明确隔离的本次路径；与既有改动混合的文件保留工作区，发布包的 source-sha256.json 保存实际完整源码指纹。

## 发布与回退

线上入口：
- 后台：http://124.223.157.129/admin/
- 桌面：http://124.223.157.129/englishWorld/reading-practices
- 手机：http://124.223.157.129/mobile/reading-practices

发布目录：`/opt/english-world/releases/reading-20261012-1800`。
发布镜像：`english-world-backend:reading-20261012-1800`、`english-world-frontend:reading-20261012-1800`，同时标记 latest。
旧镜像备份：对应 `:before-reading-20261012-1800`。
数据库备份：发布目录 `database-before.sql.gz`（仅服务器保存，不含于代码仓库）。
源码备份：`baseline.tar.gz`；发布源码指纹：`source-sha256.json`；迁移记录：`migration.log`；镜像 ID：`images-before.txt`、`images-after.txt`。

发布顺序：备份 → 构建基于旧镜像的新镜像 → 兼容性迁移 → 后端 → 前端 → 静态路由/资源与匿名鉴权冒烟 → 同步已验证源码。
生产检查：后台与桌面/手机路由 HTTP 200，引用 JS/CSS HTTP 200；用户和管理员练习 API 未登录 HTTP 401。没有向生产 AI 或真实用户发送测试内容。

回退：在 `/opt/english-world/deploy` 将两份 `:before-reading-20261012-1800` 镜像重新标记 `:latest`，执行 `docker compose up -d --no-deps --no-build backend frontend`；必要时用 baseline.tar.gz 恢复源码。**保留新增数据表及用户提交，不删表回滚**。
设置后端 `READING_PRACTICE_ENABLED=false` 可暂停生成及自动发布；手工审核和历史结果仍保留。

最终版本记录：前端功能提交 `50a2ec5`，后端功能提交 `d454554`；混合既有改动的接入文件仍在工作区，实际发布内容以源码指纹文件为准。
后台镜像 ID：`sha256:4df5b369c7253469d16ea61c322edcd5e010dbcb242c17dc8cb508cb4b676c7f`。
前端镜像 ID：`sha256:67a4ac5d9164f9fc618f5e587a0408721a0449d3b8fb6093f8efb0ba4daeadf4`。
18:01 外网冒烟完成，路由、JS/CSS、401 鉴权均符合预期；MySQL 和 Redis 保持原容器运行。

### 2026-10-12: Independent desktop scrolling follow-up

- Article and questions/results now scroll independently inside a viewport-sized workspace. Compact heading and a reserved footer keep submission visible without covering content. Mobile tabs retain their existing flow.
- Browser regression `reading-scroll.cy.ts`: 3 passed, covering independent offsets, no outer overflow, 1200×680 / 1024×600 desktop, missing-question focus, result layout, and 390px mobile tabs. Original CSS failed the scrollability assertion. Layout tests use fixture API responses; no production data is changed.
- Production-baseline frontend TypeScript/Vite build passed. Frontend-only image `english-world-frontend:reading-scroll-20261012` deployed; rollback tag `english-world-frontend:before-reading-scroll-20261012`. Release artifacts: `/opt/english-world/releases/reading-scroll-20261012`. Backend/database unchanged.
- Production page/assets and delivered scroll CSS verified over HTTP after deployment.

### 2026-10-12: Teacher review required before release

- Reading practice now follows manual generation → draft review → explicit approval and immediate publication. The review drawer shows passage, questions, answers and explanations; publication requires the teacher's checkbox confirmation and final audience confirmation. There is no scheduled release setting or student-facing publication date.
- Publishing API requires `reviewed: true`. Worker never auto-publishes, even for legacy auto-publish drafts. Reading schedules cannot be created or manually executed, are excluded from scheduler execution/listing, and their legacy runner rejects execution.
- `nestjs/migrations/require-reading-review.sql` disables old reading schedules and clears auto-publish flags without deleting papers, schedules, assignments or results. Already published papers remain available.
- Validation: real local MySQL/API 16 tests passed, admin 17 tests passed, production-aligned backend 631 tests passed, all three builds passed. Cypress full teacher-review/publication/two-user desktop/mobile submission flow passed; only external AI HTTP was replaced by a fixture.
- Production scheduler has additional selected-recipient transaction validation absent from the local checkout; release source preserves it. Exact deployment source is under `/opt/english-world/releases/reading-review-20261012/source`, not a copy of the entire dirty local tree.
- Release images `english-world-{backend,frontend}:reading-review-20261012`; rollback tags `:before-reading-review-20261012`. Database backup and prior source retained in release directory. On application rollback, keep reading schedules disabled and flags cleared to avoid restoring unreviewed publication.
