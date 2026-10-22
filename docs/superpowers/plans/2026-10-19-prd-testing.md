# PRD testing implementation plan

**Goal:** 从统一 PRD 选择模块或全量，由 Codex 更新 Case、执行隔离浏览器测试、归档报告与证据并分析失败，支持 Cypress Cloud 记录。

**Spec:** ../specs/2026-10-19-prd-driven-testing-design.md

**Architecture:** PRD 索引是模块来源；项目技能负责 AI 阶段；Node 执行器负责不可伪造的执行结果与报告。Cloud 作为可选执行记录层，显式要求上传时缺配置即报告阻塞。

**Constraints:** 不推送或部署；不修改已有业务改动；不写入凭据；mock 通过不能替代真实联调；缺覆盖和空结果不能算通过。

**Execution ruling:** 在当前开发目录执行，以测试用户正在修改的实际版本；记录 dirty 状态与差异摘要，不切换或重置已有业务代码。不自动提交。Cloud 登录由用户完成。

## Tasks

- [x] 1. 用 Node 内建测试先锁定模块别名/多选/全量去重、需求提取、过期 Case、缺覆盖、mock 结果和零测试行为。
- [x] 2. 实现需求盘点、Case 映射、选择计划、结构化执行结果与 HTML/Markdown 报告。
- [x] 3. 复用隔离 Nest/MySQL 启动逻辑，编排前端、管理端与 Cypress，归档失败和中断；配置 Cloud project ID 环境变量和 Record Key。
- [x] 4. 从现有 PRD 形成初始 Case 清单，注册已有脚本；增加真实知识笔记验证来证明完整执行路径。
- [x] 5. 添加项目技能、使用说明、手动模块/全量 Actions 工作流和 Cloud 配置说明。
- [x] 6. 跑执行器测试、知识笔记真实浏览器验证、全量计划检查；独立审查新增实现并修复问题。

## Review focus

- PRD 缺失/已变更、复合验收项部分覆盖：显示未完成，不假通过。
- 进程启动失败、测试为空/跳过、Cloud 上传失败：保留报告与非零退出码。
- 跨模块关联、重复 spec、错配 Case：去重且要求精确测试名称映射。
- 用户中断/端口占用：不停止已有外部服务，释放本次持有资源。
- AI 分析尚未产生：明确待分析，不用关键词推断冒充已定位根因。

## 验证记录

- Runner 15 项测试通过；两应用 TypeScript 构建通过。
- 知识笔记闭环：8 条浏览器测试、8 条后端基础检查通过；Cloud run 4：https://cloud.cypress.io/projects/hajrxe/runs/4。
- 本地证据：test-results/prd/2026-10-19T10-17-37-305Z-9d576545/，AI 分析已完成，1 项 PRD 有真实通过证据，106 项仍待验证。
- 7 份 PRD 形成 188 个候选，现有 32 个源码 spec 已登记；没有声称全部需求已自动化。
- Ruling：串行 Cloud group 会受 completion delay 影响；改为单次 API 批次 + before:spec guarded reset。
- 独立审查修复：原始 SQL 表清理、mixed 证据、ready 正向校验、spec 运行错误保留。
- 远端 Actions 未运行，未提交推送；还需在远端配置 Secret。
