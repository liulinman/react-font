# 阅读入口与工作台体验 Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement task-by-task.

**Goal:** 统一阅读入口、去除暖黄主题、改善词库筛选并保留管理端刷新位置。

**Architecture:** 复用现有阅读分发和语境生成服务及机考工作区，使用 URL 模式区分考试和自主练习。保留既有深链接、数据、答卷；本次不重写后端或宣称生成材料是正式雅思试卷。

**Tech Stack:** React 18、React Router、Ant Design、Vitest、Vite。

**Spec:** 用户本会话确认：阅读统一为雅思考试与自主练习；同时优化搜索、主题和刷新行为。

## Global Constraints
- 当前前后端存在大量未提交工作，原地增量修改，不覆盖、不自动提交、不发布。
- 模块需求入口为 docs/prd/README.md；此次需求来源是用户确认，现有 PRD 只有局部覆盖。
- 已有雅思工作区是单篇限时训练；清楚注明单篇模拟，不能冒充三篇完整正式试卷。

## Review Focus
- 管理端刷新与浏览器前进后退恢复页面，未知 URL 回到安全默认。
- 阅读模式在 URL 保留，旧语境链接参数不丢失，微语境闭环继续可用。
- 自主练习保留发布练习、生成练习、记录和错题入口。
- 词库回车只提交一次，中文英文输入去首尾空格，0 值筛选保留。
- 窄屏和深色模式仍可用，不修改答题或评分契约。

### Task 1: 管理端位置
Files: apps/admin/src/AdminApp.tsx; apps/admin/src/__tests__/AdminApp.test.tsx
- [x] 增加刷新恢复、前进后退测试并观察失败。
- [x] 使用 URL section 查询参数初始化和同步菜单，保留其他参数。
- [x] 运行管理端测试。

### Task 2: 搜索与主题
Files: apps/english-world/src/page/englishWorld/EnglishWorld.tsx; utils/wordFilters.ts; theme/workbench.css
- [x] 增加回车提交、空格规范化测试并观察失败。
- [x] 默认仅英文中文搜索，更多筛选可展开；表单统一提交和加载反馈。
- [x] 使用浅灰页面、纯白内容、蓝色强调，移除米黄纸张和棕色装饰。
- [x] 运行相关组件和过滤器测试。

### Task 3: 统一阅读
Files: readingPractice/ReadingPracticePage.tsx; ReadingPracticeList.tsx; ReadingWorkspace.tsx; contextLab/ContextLabPage.tsx; component/EnglishHeader.tsx; router/router.tsx
- [x] 增加模式切换、刷新恢复、旧入口兼容测试并观察失败。
- [x] 建立两个模式的统一阅读工作区；自主练习含收到的练习与自己出题，考试复用限时工作区。
- [x] 隐藏侧栏重复语境入口，保留旧路由兼容微语境及文章来源参数。
- [x] 考试只展示考试操作，自主练习保留解析和学习功能。
- [x] 运行阅读、导航、语境相关测试与两端构建；检查本次增量 diff。

## 执行记录

- 已原地完成上述增量，保留原有未提交工作；没有提交、推送或部署。
- 独立审查发现并修复：考试 taskId 误触发来源文章预览；折叠筛选后读取不到保留值。审查者复查通过。
- 定向组件回归：7 文件 42 项；语境来源/微语境/考试恢复 15 项；搜索 3 项；管理端刷新恢复 1 项，共 61 项通过。这里只统计实际执行的测试，未声称完整套件或 PRD Cloud 验收。
- Cypress：统一入口/搜索/考试恢复/390px移动端/管理端刷新等4项通过；已有机考长流程1项通过（迁移入口测试已更新）。接口为 fixture，不证明真实 API 或 AI 内容质量。
- 学生端和管理端 `tsc -b && vite build` 通过；定向 ESLint 无错误，语境文件保留两个现有 warning；`git diff --check` 通过。
- 额外修正：移动端加载统一阅读的生成界面时，组件自行加载所需布局样式，避免依赖桌面 Layout 的样式副作用。
- 生产环境未变更。当前考试能力仍为单篇模拟，保留明确说明。

## 2026-10-20 14:27:06 CST 上线

用户回复“可以”后继续部署。基于即时取回的最新生产源码，仅叠加本次11个前端文件；10个旧文件与上次发布基线逐字节一致，新增1文件。重新构建学生/管理两端，发布源定向34+3+1项和5项浏览器流程通过。生产快照旧机考测试仍按旧笔记交互断言，失败日志保留；确认机考实现与线上完全相同后，使用先前更新的12项机考测试及6项阅读测试复验通过，未修改机考实现。

- 发布目录：`/opt/english-world/releases/reading-workspace-20261020`。
- 回退标签：`english-world-frontend:before-reading-workspace-20261020`；目录内 `rollback.sh` 恢复镜像及11文件的新增/覆盖状态。
- 新前端镜像：`sha256:67d7a6cbccb2b2ca827ac67d04059d3c0aeca7dfe909375b77071a2f2ab86543`。
- 后端保持：`sha256:9fa09cc862fa19815e46149d550e2a5470d2466e54f3b7129f15442a07641144`，两容器 running/restarts0。
- 148个容器资源及16个公网路径/资源逐字节校验通过，11文件生产源同步校验通过。
- 真实只读接口：管理员、2已有用户、5篇可读练习、复习册、匿名拒绝通过；发布前后结果一致，无学生内容、答卷、通知写入，无后端或数据库迁移。
- 发布及验证证据：工作区 `docs/reading-workspace-release/evidence/`。临时验收服务已停止；本地原dirty保留，未提交未推送。
