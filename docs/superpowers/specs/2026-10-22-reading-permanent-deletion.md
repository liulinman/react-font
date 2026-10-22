---
title: 阅读练习管理员彻底删除
created: 2026-10-22
type: feature
status: done
baseline_commit: a6c03965bcb12f26b66598cf3bc51ed74eabad87
---

<frozen-after-approval reason="human-owned intent">

## Intent

当前管理端只有 queued/draft/failed 显示删除，服务端 deleteDraft 同样拒绝 published/withdrawn，因此截图中的已撤回练习没有删除入口。现有删除只清理生成运行记录，将原稿事件置空并删除练习本体，不能直接用于发布后完整清理。

管理员应能永久删除一份练习及全部专属关联数据。删除入口覆盖已发布、已撤回、待审核、排队、失败状态；生成中也可删除，已运行任务的迟到结果不得重新创建内容。操作前展示删除范围并确认，成功后管理端和学生端均无法访问被删练习。

## Boundaries & Constraints

Always：默认删除当前版本；确认框提供“同时删除本练习的所有版本”，并明确列出版本标题、数量、接收人、答卷和原稿影响。所有范围都清理所属答卷/成绩、分配/开始记录、通知及阅读回执、纠错/反馈/审核/聊天/历史事件、运行记录及专属原稿文件。共用原稿仅在不再被任何保留版本或其他练习引用时清理。学生账号、词库、笔记、独立学习数据不属于练习删除范围。

Ask First：这次开发和验证不删除截图中的真实练习。上线后的实际永久删除由管理员在产品确认框中执行。若发现其他模块存有无法确认归属的引用，先明确处理方式。

Never：不把学生个人移除当作全局删除；不使用无关联条件的批量删除；不隐式删除其他版本；不移除仍使用的定时任务模板；不把数据库成功但文件清理失败显示为全部清理完成。

## I/O & Edge-Case Matrix

| 场景 | 输入/状态 | 预期行为 | 异常处理 |
|---|---|---|---|
| 撤回且有成绩 | 当前版本删除 | 此版本专属记录全部移除 | 数据库事务失败完整回滚 |
| 已发布且仍有学生作答 | 确认永久删除 | 后续开始、提交、成绩访问返回不存在 | 并发操作串行化，不能残留新记录 |
| 版本族 | 选择当前/全部版本 | 只删除确认范围 | 保留版本的族标识重新挂接，仍能修订 |
| 共用原稿 | 删一版本 | 保留共用文件和有效引用 | 锁原稿与绑定流程协同 |
| 专属PDF | 删除最后引用 | PDF、衍生页面和原稿元数据清理 | 持久化清理任务，可重试磁盘失败 |
| 生成中 | 删除 | 任务失去写回目标 | 迟到AI结果不重建练习 |
| 删除取消/失败 | 确认框取消/503 | 列表和数据不变，可重试 | 明确失败提示，不关闭确认框 |
| 未授权请求 | 学生或匿名调用 | 拒绝访问 | 401/403，无写入 |

</frozen-after-approval>

## Code Map

- `nestjs/src/interface/reading-practice/reading-practice.service.ts`：当前 deleteDraft；find 在事务中锁练习行。
- `nestjs/src/interface/reading-practice/admin-reading-practice.controller.ts`：管理员 DELETE 路由与鉴权。
- `nestjs/src/interface/reading-practice/reading-source.service.ts`：原稿PDF与页面文件，deleting 持久化清理和绑定互斥机制。
- `nestjs/src/interface/reading-practice/reading-workflow.service.ts`：familyId/parentId 修订关系、原稿引用。
- `nestjs/src/interface/reading-practice/reading-practice-worker.service.ts`：生成租约与条件写回。
- `nestjs/src/interface/reading-practice/reading-practice-publishing.service.ts`：notification.metadataJson.readingPracticeId，分配及通知投递事务。
- `react-font/apps/admin/src/ReadingPracticePanel.tsx`：删除入口、确认框及列表刷新。
- `react-font/apps/admin/src/api/readingPractice.ts`：管理员请求封装。

## Tasks & Acceptance

- [x] 后端新增只读删除预览，返回当前版本/整个版本族的实时影响，执行时重新核验范围，防止预览后新增版本被静默删除。
- [x] 后端实现带范围和确认参数的删除，在事务中锁定版本、原稿及关联数据，显式清理所有专属关系。保留版本族关系重建；处理排队与生成租约。
- [x] 原稿复用持久化删除标记，事务成功后尝试清理，失败可重试并向管理端显示处理中；处理父PDF与衍生图片引用闭包。
- [x] 管理端所有状态提供危险操作入口，确认框先展示实时影响、当前/全部版本选择、不可恢复提示，明确反馈失败/完成/附件清理中。
- [x] 真实隔离MySQL/HTTP验证发布后关联清理、共享原稿、版本族、并发、回滚及权限；管理端浏览器验证取消/确认/失败重试/末页校正。
- [x] 正式PRD写入 `docs/prd/reading/features/permanent-deletion/prd.md`，更新模块入口和索引。增量构建及独立审查，保留线上已有功能和本地原dirty。

Acceptance：给定有接收人和答卷的已撤回练习，管理员完成删除确认后，管理端/学生列表无此练习，旧链接与成绩不可访问，专属数据库关联不存在；其他练习及其共享文件可正常访问。给定只删除族根版本，剩余版本仍可创建修订。给定取消或事务故障，关联数据不发生部分删除。

## Design Notes

删除范围用显式版本ID集合和版本族信息描述，而非标题匹配。通知按练习ID元数据与记录关联共同核实归属。源文件清理不能与SQL共同原子提交，须先持久化清理声明，随后重试删除，避免元数据丢失后磁盘孤儿无法追踪。删除历史事件本身不继续保留题目、答案和成绩正文；清理任务只保留必要文件标识与状态。

## Verification

使用隔离测试库和测试附件，禁止对生产真实练习执行删除来验证。运行后端定向测试/真实SQL集成、管理端定向测试/浏览器与构建；上线前备份数据库、目标源码及回退镜像，发布后只读验证及受保护表摘要核对。


## Review outcome

三份独立审查：修复无关附件变更误触发预览冲突、旧数据的保留练习直接通知关联漏保护；增加确定性排序与数据库死锁重试、失败原因显示。真实SQL先红后绿验证。当前短事务全体练习/原稿锁作为小规模部署的一致性选择，记录扩容优化事项。

## Delivery

2026-10-22 10:53:12 CST 已上线，无真实练习删除。发布源65后端单元、18真实SQL/HTTP、15管理单元、2桌面/手机浏览器及两构建通过。线上20删除预览、27表完整性、原学生静态一致和公网资源验证通过。交付路径：工作区 docs/reading-permanent-deletion/。

## Suggested Review Order

- 管理员入口与确认
  [admin-reading-practice.controller.ts:72](../../../../nestjs/src/interface/reading-practice/admin-reading-practice.controller.ts#L72)

- 关联范围、共享保护与事务清理
  [reading-practice-deletion.service.ts:37](../../../../nestjs/src/interface/reading-practice/reading-practice-deletion.service.ts#L37)

- 删除影响与人工确认
  [ReadingPracticeDeletionModal.tsx:1](../../../apps/admin/src/ReadingPracticeDeletionModal.tsx#L1)

- 真实SQL与并发边界
  [reading-permanent-deletion.integration-spec.ts:1](../../../../nestjs/test/integration/reading-permanent-deletion.integration-spec.ts#L1)
