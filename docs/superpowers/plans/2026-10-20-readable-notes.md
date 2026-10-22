# 笔记统一阅读展示 Implementation Plan

> Use superpowers:executing-plans to implement task-by-task.

**Goal:** 统一笔记阅读排版，提供源文预览，完成验证后上线。
**Architecture:** 共用 NoteContent + noteSummary + NoteEditor 组件；React Markdown/remark语法树，保留原字符串。仅前端增量部署，基于即时生产源保留独有代码。
**Tech Stack:** React18、TypeScript、react-markdown、remark-gfm、remark-breaks、Vitest、Cypress。
**Spec:** docs/prd/notes/features/readable-notes/prd.md（用户已确认）。

## Global Constraints
保留现有dirty；不自动提交或推送；不改写原内容；不执行HTML/危险链接/自动外部图片；不修改后端和数据库。

## Review Focus
普通换行、嵌套/宽表/代码、潜在XSS、预览后保存原文、打印要点不丢失、账号隔离与草稿不退化。

### Task 1: 共用阅读组件
Files: src/components/notes/{NoteContent.tsx,noteSummary.ts,NoteEditor.tsx,noteContent.css,NoteContent.test.tsx}
- [x] 写结构/安全/纯文本摘要/原文保存不变测试，观察失败。
- [x] 引入成熟解析依赖，实现展示/摘要/预览，运行测试至通过。

### Task 2: 接入各入口
Files: knowledgeNotes/{KnowledgeNotesPage,KnowledgeNoteEditor}.tsx; component/{WordNoteDisplay,EditAddModal}.tsx; wordBook/BookContent.tsx; MobileWordDetailPage/MobileLearnPage/MobileWordFormPage.tsx
- [x] 接入统一渲染与摘要、知识/词条专注编辑预览，保留现有接口和未保存保护。
- [x] 运行笔记、词条、复习册与移动端现有定向测试；浏览器检查390px/桌面/深色/打印和预览原文保存。

### Task 3: 发布
- [x] 独立审查并修复；本地与即时生产源构建/测试通过。
- [x] 备份当前镜像和受影响源，仅更新前端静态资源及源码，自动失败回滚。
- [x] 容器/公网资源校验、真实只读API和源内容摘要前后一致；记录生产版本和证据。

## 验证与上线记录

2026-10-20 14:52:42 CST 已上线，用户已明确授权测试通过后部署。

- 本地原有7文件58项首轮57通过、1旧DOM类名断言失败；按真实渲染结构修正断言。独立审查另发现短格式笔记没有展开入口，新增短链接测试红→绿后修复；最终阅读相关43项和原词条编辑20项通过（共63项定向，不宣称全PRD覆盖）。
- 发布源基于即时生产源码，14个源码/依赖文件（10旧4新）增量；保留所有线上独有代码。发布源重新构建及43项测试、桌面/手机深色/宽表/预览原文保存/打印3项Cypress通过；fixture只证明对应交互，不冒充真实账号持久化验收。
- 学生端构建通过；ESLint零错误，知识笔记页保留1项既有依赖warning；独立审查修复后无阻断。无后端或schema修改，无原文迁移。
- 生产目录：`/opt/english-world/releases/readable-notes-20261020`；证据：工作区`docs/note-reading-release/evidence/`。
- 前端镜像：`sha256:bbf7d080ea55297770aeb43ed8dfba47677ce96bdfe18739ad0b5f58c8a3502e`，回退tag `english-world-frontend:before-readable-notes-20261020`；`rollback.sh`恢复10旧文件并删除4新文件。
- 148容器资源、31公网路径与资源SHA、14源/依赖文件同步校验通过；管理员资源SHA前后不变，后端仍9fa09cc...，两个容器running/restarts0。
- 真实只读：2账号20篇笔记可读、匿名拒绝；27篇知识笔记/855词条笔记字段/5复习册快照摘要前后一致，另原阅读/复习册smoke通过。无真实内容/答卷/通知写入。
- 临时5193/5194服务停止；本地原dirty保留，未提交未推送。
