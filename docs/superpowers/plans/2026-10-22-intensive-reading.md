# 电脑端精读 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有English World中交付独立的电脑端材料精读、三色标注、笔记回顾与可靠保存。

**Architecture:** NestJS新增独立intensive-reading模块和私有持久存储。React新增桌面材料库、导入校对和三栏阅读工作台。仅复用底层识别与标注算法，不依赖管理员发布和考试答卷。

**Tech Stack:** 现有React/TypeScript、NestJS/Sequelize/MySQL、PDF渲染及供应商配置、Vitest/Jest/Cypress。

**Spec:** `docs/superpowers/specs/2026-10-22-intensive-reading-design.md`；需求 `docs/prd/intensive-reading/prd.md`。

## 执行记录

2026-10-22 已研发并增量部署。交付与回滚：工作区 `docs/intensive-reading/README.md`；Cloud run20浏览器11/11、SQL/HTTP16/16、后端27、前端24项通过。PRD完整浏览器覆盖6/22，其余16复合条款保留待完善Case，不将局部通过认定全覆盖。详细任务账本 `docs/intensive-reading/progress.md`。

## Global Constraints

- 仅电脑 Web，不新增手机入口或手机适配。
- 保留原文，不翻译、简写、改写或虚构缺失文字。
- 单文件20MiB、PDF20页、单次20文件且合计100MiB、图片2500万像素。
- 标题200字、正文100000字符、单条笔记10000字符。
- 当前两仓库有大量其他工作未提交；只改本任务增量，不重置、全量提交或直接以本地覆盖生产。
- 2026-10-22 用户后续明确授权研发、测试、部署；仍不修改真实用户业务数据或清理其他任务。

## Review Focus

1. 重复句子、emoji与中文混排下选区偏移必须准确。
2. 识别超时、上传中断和供应商失败可恢复，不生成伪正文。
3. 修改正文和多窗口同时编辑不使批注错位或丢失。
4. 文件、任务与段落ID跨用户访问全部拒绝。
5. 狭窄桌面容器下三栏和工具条不出屏，保存失败有明确反馈。

## Task 1：材料与版本存储、用户权限

**Files:** 新增后端 `migrations/create-intensive-reading.sql`、`src/interface/intensive-reading/intensive-reading.{module,controller,service,types}.ts`、`intensive-reading.validation.ts`与`intensive-reading.service.spec.ts`；增量修改 `src/app.module.ts`。前端新增 `src/intensiveReading/types.ts`、`api.ts`。

**Interfaces:** `/intensive-reading/materials` GET分页搜索/POST创建粘贴草稿；`/:id` GET；`/:id/versions` POST确认正文（expectedVersion）；`/:id/annotations` POST、`/:id/annotations/:annotationId` PUT/DELETE；`/:id/progress` PUT。返回材料含id、version、activeBodyVersionId、status、title、paragraphs[{id,text}]、annotations、progress。标注字段id/bodyVersionId/paragraphId/start/end/quote/color/category/note/resolved/version；偏移按JS UTF-16代码单元计。写操作带requestId幂等键，409不更新本地版本。

- [ ] 写失败测试：他人ID404、空正文400、越界/引用不匹配400；emoji选区quote一致；版本冲突409；同requestId重复写只有一个结果。
- [ ] 运行 `npm test -- --runInBand intensive-reading.service.spec.ts` 确认新测试失败。
- [ ] 通过原生SQL迁移建立独立材料、版本、标注、源文件、任务表及用户/材料索引；所有查询按用户限定。正文确认和标注继承事务执行；变更段落标注待确认，旧版本只读可查。
- [ ] 实现 `createTextMaterial(userId,input)`、`confirmBody(userId,id,input)`、`saveAnnotation(userId,id,input)`、`saveProgress(userId,id,input)`，严格验证PRD容量；纯文本返回；并发检查与幂等结果事务提交。
- [ ] 定向测试通过后运行真实MySQL/HTTP隔离测试，覆盖版本继承、重复句定位、归属及事务回滚。记录结果；不将mock测试称作端到端验收。

## Task 2：真实文件导入与可恢复识别

补充任务1接口：POST /materials接受sourceType=text|file；file允许空正文并返回uploading材料，供本任务上传使用。对应测试覆盖文件型草稿创建和确认正文前不可精读。

**Files:** 新增后端 `src/interface/intensive-reading/intensive-reading-source.service.ts`、`intensive-reading-import.service.ts`、`intensive-reading-worker.service.ts`及对应spec；按需抽取阅读服务的无权限底层渲染函数，不改变原接口语义。

**Interfaces:** `POST /intensive-reading/materials/:id/sources`上传；`GET /:id/sources/:sourceId`鉴权原件；`POST /:id/import`提交有序sourceIds及requestId；`GET /:id/import`状态/部分结果；`POST /:id/import/retry`重试。识别输出 `{title,paragraphs:[{id,text}],uncertainties:[{paragraphId,message}]}`，不包含题目。

- [ ] 失败测试：伪扩展名、损坏PDF、超页/像素/合计上限、他人sourceId、部分上传失败不可开始、429及超时保留原件和已识别页。
- [ ] 运行任务1定向测试和新增spec，确认失败后实现私有文件落盘与用户归属事务，失败清理未入库文件。
- [ ] 持久任务worker使用数据库租约、过期恢复和有限重试；同一requestId返回原任务。逐页保存成功结果，空输出不能ready；真实供应商只执行原文提取。
- [ ] 重启worker及重复提交的隔离测试通过；实际PDF/照片各执行一次真实识别并与原件逐段核对，额度或凭据失败明确记录阻塞。

## Task 3：材料库与并排校对

**Files:** 新增前端 `src/intensiveReading/IntensiveReadingPage.tsx`、`MaterialLibrary.tsx`、`ImportReview.tsx`、`intensiveReading.css`及组件测试；修改 `src/router/router.tsx`、`src/page/englishWorld/navigation.ts`与`layout/EnglishWorldLayout.tsx`。

**Interfaces:** `/englishWorld/intensive-reading`材料库、`/:id`阅读、`/:id/review`校对，导航key intensiveReading。使用任务1/2接口，不调用admin接口。

- [ ] 写组件失败测试：空态、搜索、真实保存异常、上传未完成禁开始、校对确认前无阅读入口、直接刷新恢复状态。
- [ ] 运行 `pnpm --filter @font/english-world test -- --run src/intensiveReading` 确认失败；实现列表、PDF/图片私有预览、粘贴原文对照、文件排序、标题正文编辑及待核对提示。
- [ ] 上传/识别/校对状态独立显示；失败保留输入并可重试。原件预览object URL按生命周期回收；来源文本只按纯文本渲染。
- [ ] 同命令通过，并运行路由/导航已有回归，确认手机导航未变。

## Task 4：精读标注、回顾与可靠保存

标注数据补充isQuestion及anchorStatus=active|needs_confirmation；语言筛选按color=blue，待解决按isQuestion且非resolved，改色不清除疑问。PUT标注支持以expectedVersion、bodyVersionId、paragraphId、start、end、quote执行重新绑定；服务端验证后改active。未绑定前显示旧引用/笔记，不绘制新正文高亮。补充“修订→待确认→选择新句→重新绑定→刷新保留”的组件和HTTP测试。

**Files:** 新增 `src/intensiveReading/ReadingWorkbench.tsx`、`AnnotationText.tsx`、`AnnotationPanel.tsx`、`annotationAnchors.ts`、`useReadingPersistence.ts`及对应测试。

**Interfaces:** `captureSelection(root,paragraph):{paragraphId,start,end,quote}|null`；`renderSegments(text,annotations)`返回不改变原文的区间；`useReadingPersistence(materialId)`管理期望版本、待保存输入、串行写队列、失败重试与进度。正文版本切换使用服务端版本ID。

- [ ] 写失败测试：重复句精确定位、UTF-16偏移、跨段与重叠拒绝、删除单个标注不影响其他标注、分类和颜色分别保存。
- [ ] 实现可收起目录、字号调整、三色工具条及视口边缘定位、双向定位、纯文本笔记、疑问解决/重新打开与准确筛选。
- [ ] 保存输入防抖后串行提交，旧响应不覆盖新输入；409保留草稿并提示加载新版/复制本地内容；网络失败可重试；有未保存编辑离开提示。段落ID及相对进度恢复，不用像素绝对位置作为唯一依据。
- [ ] 添加两个窗口冲突、连续输入乱序响应、断网恢复与正文版本修订组件/接口测试；上述定向测试及学生端构建通过。

## Task 5：按PRD验收与交付

**Files:** `docs/testing/cases/intensive-reading/`、`docs/testing/suites.json`、`apps/english-world/cypress/e2e/intensive-reading.cy.ts`；工作区 `docs/intensive-reading/`保存证据。

- [ ] 读取本项目PRD测试技能，登记AC-01至AC-08具体Case/断言、实际实现入口和运行环境，注册独立模块，缺失或失败如实记录。
- [ ] 执行 `pnpm test:prd --module intensive-reading --cloud`，覆盖真实粘贴/图片/PDF、标注CRUD、刷新续读、两用户鉴权、并发冲突、修订锚点、失败重试及三种桌面尺寸。
- [ ] 保存当前运行截图/日志/Cloud链接并逐AC分析；真实视觉供应商未执行不得通过AC-01。检查旧阅读练习与知识笔记关键回归、前后端构建。
- [ ] 复核只包含本任务增量，报告实现、验证结果与未解决事项；交付本地可运行版本。未获发布指令不部署。

## 自审

FR-01至05覆盖任务1至3；FR-06至09覆盖任务4；FR-10至14由任务1、2、4共同覆盖；AC-01至08由任务5登记执行。待实现，不宣称测试通过。预计按任务顺序在当前会话实施，比同时改动数据协议与交互更易核对。
