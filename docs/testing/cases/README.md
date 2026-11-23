# PRD 测试 Case 索引

JSON 是 Case 的维护来源。draft 是待 AI 细化的需求候选，ready 表示已细化并登记执行绑定；两者均不等于本次测试通过，通过结果只看运行报告。

| 模块 / 功能 | Case 文件 | 候选 | ready |
|---|---|---|---|
| review / 薄弱词语境修复闭环 | [weak-word-repair](review/weak-word-repair.json) | 18 | 0 |
| review / 可解释词汇掌握轨迹 | [word-journey](review/word-journey.json) | 12 | 0 |
| notes / 长笔记编辑与独立知识笔记 | [knowledge-notes](notes/knowledge-notes.json) | 26 | 1 |
| notes / 知识笔记文件夹管理 | [folders](notes/folders.json) | 16 | 0 |
| reading / 已发布阅读练习追加接收人 | [add-recipients](reading/add-recipients.json) | 18 | 0 |
| reading / 阅读练习完成情况与成绩分析 | [analytics](reading/analytics.json) | 33 | 0 |
| word-books / 单词与知识速读复习册 | [word-book](word-books/word-book.json) | 64 | 0 |
| vocabulary / Chrome 阅读查词与网页引用 | [browser-reading-extension](vocabulary/browser-reading-extension.json) | 4 | 0 |

每次运行的 HTML 报告包含 Case 步骤与需求对应关系；未登记脚本的候选明确标为未覆盖。
执行 `node scripts/prd-testing/prepare-cases.mjs` 可刷新本索引，不覆盖已有 Case。
