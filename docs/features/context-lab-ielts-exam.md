# 语境实验室：雅思机考模式

2026-10-14

## 使用

在语境实验室的已完成练习卡片点击「雅思机考」，或在普通做题窗口点击「雅思机考模式」。确认考试说明后开始。

- 单篇默认 20 分钟，可选 10 / 30 / 60 分钟。60 分钟选项仍是单篇延长练习。
- 左文右题分别滚动，底部题号跳转，展示已答、未答、当前题和待检查标记。
- 阅读区比例、字号、高对比可调整。小屏改为上下两个滚动区。
- 选中文章或题干文字添加高亮与笔记；按字符位置保存，不会把同一句的所有出现都高亮。
- 答案、标记、笔记、截止时间和交卷结果按账号与练习保存到本机。题目或文章变化时舍弃旧草稿。
- 刷新或离开页面不重置截止时间。页面打开时，到时锁定并尝试交卷；页面关闭时无法发送请求，再进入时处理到期交卷。
- 手动交卷显示未答及待检查数量，允许带空题交卷。提交时仅传真实作答，服务端把缺失答案判错。
- 提交失败保留冻结的答案并支持重试；成功后显示逐题解析，可确认后再考一次。
- 学习模式仍保留翻译、词汇导入等辅助功能；考试模式中不展示这些入口。

## 对齐边界

这是既有单篇选择题练习的机考交互模式，不是官方考试软件，也不是完整三篇、40 题的试卷。当前后端仍只有 selectedIndex 作答契约；判断题、文本填空、简答、匹配题与整套试卷需要后续扩展出题及判分契约，不能只靠更换前端标签实现。

本机保存不是跨设备同步。当前提交接口没有幂等键：若服务器已经接收但响应丢失，人工重试可能形成另一条练习记录；本次不改变该既有接口。计时为练习用途的客户端计时。

参考：[IELTS 官方样题说明](https://ielts.org/take-a-test/preparation-resources/sample-test-questions/academic-test)；[British Council 机考熟悉测试](https://takeielts.britishcouncil.org/prepare/ielts-free-practice-mock-tests/ielts-familiarisation-test)。官方指出样题与正式考试的计时、高亮、笔记行为存在差异，因此这里对齐操作能力，不宣称像素级复刻。

## 实现与验证

- ContextLabPage.tsx：两个入口。
- ContextLabExam.tsx：登录账号、提交 API、Portal 与页面滚动锁。
- IeltsExamWorkspace.tsx / ieltsExam.css：考试界面、导航、批注、倒计时与交卷。
- ieltsExamState.ts：草稿校验、题目身份、时间计算。
- IeltsExamWorkspace.test.tsx / ieltsExamState.test.ts：恢复、账号隔离、带空题交卷、超时与重试、批注、再考与异常草稿。
- cypress/e2e/context-lab-ielts-exam.cy.ts：真实入口、双栏滚动、导航、刷新恢复、请求载荷、完成锁定和截图。

## 验证记录

- 新增考试界面与草稿测试：9/9 通过。
- Cypress：入口、双栏滚动、跳题、保存恢复、带空题提交、完成锁定通过；1440、1280、390 宽度无横向溢出。
- ESLint（新增 TS/TSX）、TypeScript 构建和生产构建通过。
- 原有语境实验室回归：82 通过、2 失败。失败为 `translates the article once and toggles the Chinese paragraphs` 和 `opens the legacy practice modal and lets the learner expand it fullscreen`；使用 Git HEAD 的原始页面另建临时测试副本，两个用例同样失败（找不到开始练习按钮），已删除临时副本。
- 全量测试中 LearningSetupDrawer 的选词恢复用例、BulkImportPage 的两个导入用例曾失败；两文件串行复测 15/15 通过。

全量运行在确认上述失败并完成针对性复测后中止，未得到全量通过结论；完整日志位于本机 `/tmp/english-all-tests.log`。
