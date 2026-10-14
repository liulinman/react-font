# 知识笔记实施计划

> 执行：本会话原生执行，使用 executing-plans 与 test-driven-development；用户已确认方案并要求实施，无需重复请求实施许可。

**Goal:** 完成独立知识笔记和长单词笔记编辑，保留既有移动端改动。
**Architecture:** NestJS 认证接口与 MySQL 独立知识表/关联表；React 共用响应式笔记页面，分别挂载桌面与移动路由；现有单词笔记字段不迁移。
**Tech Stack:** NestJS、Sequelize、MySQL、React、React Router、TanStack Query。
**Spec:** ../prds/prd-english-world-2026-10-10/prd.md 与 interaction.md。

## Global Constraints
- 标题 120、正文 30000、例句 10000、来源 1000 字符，关联单词最多 20；所有字段前后端按 JS UTF-16 长度校验。
- 不改词汇统计/复习算法；不自动迁移旧笔记；创建接口必须按用户幂等。
- 保存失败保留输入，版本冲突禁止覆盖；纯文本显示；390px 手机可用。
- 当前工作区有用户未提交改动，保留并仅编辑本需求相关位置，不自动提交混合改动。

## Review Focus
- 越权关联或猜测笔记 ID，必须拒绝且不泄露正文。
- 模糊网络失败后重试创建，只产生一条记录。
- 从编辑页面点击主导航/浏览器返回，需保护未保存内容。
- 删除词条后仅解除关联，知识正文继续存在。
- 长段落/长单词/手机键盘不得遮挡编辑与保存。

## Task 1: 认证数据接口
- [x] 编写验证、隔离、创建重试和版本冲突测试，先运行失败。
- [x] 新增 knowledge-note 模块、DTO/校验、service、controller；挂载 AppModule。
- [x] 使用参数化查询；GET /knowledge-notes 返回 {list,total,page,pageSize}，GET /:id 返回完整记录和 words；POST 创建携带 requestId；PUT /:id 携带 version；DELETE /:id；GET /words 查询本人单词。
- [x] SQL 建 knowledge_note 和 knowledge_note_word，外键 ON DELETE CASCADE 仅清除关联行，新增初始化与迁移说明。
- [x] 运行 Jest 定向测试及 Nest build。

## Task 2: 桌面与移动知识页面
- [x] 写页面测试：独立创建、保存失败保留、复制预填、筛选检索、放弃修改保护。
- [x] 新增 knowledgeNotes/api.ts、KnowledgeNotesPage.tsx、KnowledgeNoteEditor.tsx、knowledgeNotes.css，分别处理请求、列表/详情、编辑、响应式样式。
- [x] /englishWorld/knowledge-notes 与 /mobile/tools/knowledge-notes 支持 /new、/:id、/:id/edit；新增主导航及工具入口。
- [x] 编辑时仅服务器成功后返回详情；复制通过 copyWord 查询服务端原词条，原文不进入 URL。
- [x] 运行 Vitest 定向用例及 tsc/build。

## Task 3: 长笔记及词条联动
- [x] 写表单测试：展开编辑保留其他字段与笔记，返回不保存，提交完整新内容。
- [x] EditAddModal 增加专注模式，同一个 Form 实例保存，正文自动增长；新增关闭保护。
- [x] 移动表单使用自动增高输入及专注编辑，保留现有离线草稿行为。
- [x] WordExpandedNote、卡片和移动详情增加复制及关联知识入口。
- [x] 验证长文阅读、桌面与手机的创建/修改/删除/复制全链路。

## Task 4: 验证与交付
- [x] 前后端完整测试及构建；记录已有失败，不把未通过说成通过。
- [x] 独立代码审查，修复重要问题；补充数据库迁移与使用说明。
- [x] 仅在完成证据支持时报告完成；部署不是此次本地实现的一部分。

## 完成记录（2026-10-10）

- 前端 92 文件 / 571 测试通过；后端 41 文件 / 280 测试通过。
- 4 个 Cypress 浏览器流程通过，TypeScript、前后端生产构建、新知识模块 ESLint 与 git diff --check 通过。
- MySQL 8.4 隔离集成验证及迁移重复执行通过。测试容器与临时 Vite 服务已停止。
- 独立审查四项重要问题均修复并经回归测试验证，无遗留重要问题。详细证据和未覆盖的实体设备范围见交付说明。
- 执行决定：因工作区含既有混合改动，本轮不自动提交；应用未部署。代价是下一步需要按文件/补丁归属整理发布。
