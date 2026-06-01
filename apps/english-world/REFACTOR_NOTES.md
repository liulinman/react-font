# English World 重构说明

## 本次重点

- 桌面端单词列表改成工作台结构：筛选区、表格区、分页区职责更清楚。
- 产品主入口改为“今日复习”，降低学员从登录到开始复习的决策成本。
- 单词类型、词性、掌握程度统一从 `wordLabels` 输出，避免多个文件各写一套颜色和文案。
- 复习页增加短任务入口、进度反馈和结果建议，让一次复习有明确开始和结束。
- 增加英式发音播放：优先使用 Free Dictionary API 的 UK/GB 音频，缺失时使用浏览器 `en-GB` 语音兜底。
- 登录页增加稳定的 `data-cy` 选择器，避免 E2E 测试依赖易变的 DOM 结构。
- 接入 Cypress E2E，覆盖登录后进入单词列表、截图巡检两个流程。
- 补齐 ESLint 依赖，让 `pnpm lint` 真正可运行。

## 关键文件

- `src/page/englishWorld/EnglishWorld.tsx`：列表页编排、筛选区、分页受控。
- `src/page/englishWorld/recite/RecitePage.tsx`：今日复习任务流。
- `src/page/englishWorld/recite/reviewExperience.ts`：复习进度和结果反馈视图模型。
- `src/page/englishWorld/utils/pronunciation.ts`：英式发音音频选择与播放兜底。
- `src/page/englishWorld/component/BritishPronunciationButton.tsx`：英式发音播放按钮。
- `src/page/englishWorld/useColumns.tsx`：表格列渲染，复用统一标签配置。
- `src/page/englishWorld/utils/wordLabels.ts`：标签文案与颜色单一来源。
- `cypress/e2e/login.cy.ts`：登录到单词列表的主流程 E2E。
- `cypress/e2e/screenshot-demo.cy.ts`：可视化截图巡检示例。

## 常用验证命令

```bash
pnpm --filter @font/english-world exec vitest run
pnpm --filter @font/english-world build
pnpm lint
pnpm e2e:english-world
```

`pnpm lint` 当前仍会提示 5 个 Fast Refresh warning，属于既有结构问题，不影响本次构建和测试结果。
