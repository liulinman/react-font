# English World 产品地图

## 仓库边界

- 用户端前端：`apps/english-world`
- 独立通知后台：`apps/admin`，默认不纳入用户端审计，只有用户明确要求时检查
- 后端：先执行 `git rev-parse --path-format=absolute --git-common-dir`，取结果的父目录作为前端主仓库，再从其 `../nestjs` 定位；当前机器是 `/Users/liulin/Desktop/font/english/nestjs`
- 现有设计规格：`docs/superpowers/specs`
- 市场与产品研究：`docs/superpowers/research`

## 默认关键路径

未指定范围时，依次审计：

1. 登录并进入今日学习
2. 从今日计划开始复习并完成错误修复
3. 搜索、筛选、编辑与批量导入词汇
4. 生成 Context Lab 练习、等待、作答、查看结果并恢复历史
5. 进入 IELTS 核心复习并生成练习
6. 查看 Memory Map 与 Word Journey
7. 接收、阅读和处理通知
8. 在移动端完成等价核心任务

## 模块索引

| 模块 | 用户入口 | 主要前端实现 | 重点测试 | 后端依赖 |
|---|---|---|---|---|
| 登录与鉴权 | `/login` | `src/page/login/Login.tsx`、`src/contexts/AuthContext.tsx` | `src/page/login/LoginStarfieldCanvas.test.tsx`、`cypress/e2e/login.cy.ts` | `src/interface/user`、`src/common/guards/auth.guard.ts` |
| 今日学习/驾驶舱 | `/englishWorld` | `src/page/englishWorld/cockpit/LearningCockpitPage.tsx`、`LearningSnapshot.tsx` | `LearningCockpitPage.test.tsx`、`LearningSnapshot.test.tsx` | `src/interface/daily-coach`、`src/interface/learning-loop-event` |
| 词库与搜索 | `/englishWorld/words` | `EnglishWorld.tsx`、`component/WordAgentTab.tsx`、`utils/wordFilters.ts` | `EnglishWorld.test.tsx`、`WordAgentTab.test.tsx`、`wordFilters.test.ts` | `src/interface/english`、`src/interface/word-agent` |
| 批量导入 | `/englishWorld/bulk-import` | `bulkImport/BulkImportPage.tsx`、预览与冲突弹窗 | `BulkImportPage.test.tsx`、`BulkImportSourceField.test.tsx` | `src/interface/english`、`src/interface/upload` |
| 复习/背诵 | `/englishWorld/recite` | `recite/RecitePage.tsx`、`planReview.ts`、`reviewExperience.ts` | `RecitePage.test.tsx`、`planReview.test.ts`、`reviewExperience.test.ts` | `src/interface/recite`、`src/database/recite-session.ts`、`src/database/recite-history.ts` |
| Context Lab | `/englishWorld/context-lab` | `contextLab/ContextLabPage.tsx`、任务与题型辅助模块 | `ContextLabPage.test.tsx`、`contextLabTask.test.ts`、`contextLabQuestionType.test.ts` | `src/interface/context-lab`、`src/interface/exercise-agent`、三张 article exercise 表 |
| IELTS 核心复习 | `/englishWorld/ielts-core` | `ieltsCore/IeltsCoreReviewPage.tsx` | `IeltsCoreReviewPage.test.tsx` | `src/interface/english/ielts-core-vocabulary.service.ts`、`src/interface/exercise-agent` |
| Memory Map/Word Journey | `/englishWorld/memory-map` | `memoryMap/MemoryMapPage.tsx`、`WordJourneyPanel.tsx` | `MemoryMapPage.test.tsx`、`MemoryMapSummary.test.tsx` | `src/interface/memory-map`、`src/database/learning-loop-event.ts` |
| 通知与账户 | 全局右上角铃铛、`/englishWorld/settings` | `notifications/NotificationContext.tsx`、`NotificationBell.tsx`、`component/SystemSettingsPage.tsx` | 两个 Notification 测试、`SystemSettingsPage.test.tsx` | `src/interface/notification`、notification 三张表 |
| 移动端 | `/englishWorldMobile` | `src/page/englishWorldMobile/EnglishWorldMobile.tsx`、`MobileContextLabPage.tsx`、`MobileMorePage.tsx` | `EnglishWorldMobile.test.tsx`、`mobileContextLab.test.ts`、`mobileViewModel.test.ts` | 与桌面端共享业务 API |
| 独立通知后台 | 独立 `apps/admin` | `AdminApp.tsx`、`UserActionConfirmModal.tsx` | `AdminApp.test.tsx`、确认弹窗与 API 测试 | `src/interface/notification/admin.controller.ts`、`admin-auth.guard.ts` |

## 规格优先读取规则

- Context Lab：先读文件名包含 `context-lab`、`exercise`、`weak-word` 的规格。
- 复习：先读文件名包含 `recite`、`focus-studio`、`learning-loop` 的规格。
- 词库/导入：先读文件名包含 `word-card`、`word-library`、`bulk-import`、`source-file` 的规格。
- 移动端：先读 `2026-07-28-english-world-mobile-usability-design.md` 与 `2026-07-01-mobile-context-lab-sync-design.md`。
- 全局布局：先读 `desktop-workspace-density`、`collapsible-sidebar`、`ui-simplification` 规格。
- 不把过期规格当成当前行为；用现有源码、测试和真实浏览器结果交叉确认。
