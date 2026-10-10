# 知识笔记交付说明

## 使用入口

- 桌面侧栏：知识笔记，路由 `/englishWorld/knowledge-notes`。
- 手机：工具 → 知识笔记，路由 `/mobile/tools/knowledge-notes`。
- 新建：填写标题与正文即可保存，分类默认“其他”；辅助区可填例句、来源、关联单词。
- 单词笔记：点击“展开编辑”进入大面积编辑区；返回表单后统一保存词条。
- 旧笔记：从词库展开内容、卡片或手机单词详情“复制为知识笔记”；原词条保留。
- 单词操作区/手机详情可打开其关联知识笔记，包括没有单词笔记的词条。

## 部署顺序

1. 用户已授权推送与部署。后端发布基线为 `context-lab-learning-loop-mvp`，前端为 `yifeng/docker-compose`。
2. 先发布后端：CI 必需迁移列表已包含 `migrations/create-knowledge-note.sql`，在后端重启前执行；首次建表含用户删除级联。再发布前端。
3. 用两个测试账号验证创建、刷新、搜索、编辑、复制、权限隔离；确认词汇统计不变。

迁移仅创建 `knowledge_note` 与 `knowledge_note_word`，不迁移既有词条数据。新安装已写入 `nestjs/init.sql`。回滚应用时保留新表，避免删除用户新笔记。

## 验证方法与边界

- 后端：`./node_modules/.bin/jest --runInBand`；`./node_modules/.bin/nest build`。
- 前端：`./node_modules/.bin/vitest run --maxWorkers=2`；`./node_modules/.bin/tsc -b`；`./node_modules/.bin/vite build`。
- 浏览器：启动 Vite 后运行 `./node_modules/.bin/cypress run --config baseUrl=http://127.0.0.1:5179 --spec cypress/e2e/knowledge-notes.cy.ts --reporter spec`。
- 数据库：新建隔离 MySQL 8.4 容器，导入 `init.sql`，在后端运行 `KNOWLEDGE_TEST_DB_PORT=<隔离端口> node test/knowledge-note.mysql.cjs`。测试端口必须属于一次性数据库，不可指向线上。
- 浏览器测试使用受控 API 响应验证页面流程；数据库测试直接执行真实 SQL；另有 HTTP 测试验证合法最大中文请求体。没有将模拟 API 浏览器测试冒充线上端到端验收。
- 手机验证使用 390×844 浏览器视口，未进行实体 iPhone 键盘验证。
- 使用隔离发布工作树，保留线上后端已有学习功能；未携带原工作区的 iOS、移动学习改造。手机工具入口接入线上已有工具页。

## 独立审查修复

1. 版本随初始草稿冻结，后台刷新不能绕过版本冲突。
2. 背景网络失败保持编辑器与未保存内容，不重置创建请求 ID。
3. 应用内返回和浏览器关闭保护未保存笔记。
4. JSON 请求上限 512KB，覆盖最大合法中文正文及例句。

截图位于前端 `apps/english-world/cypress/screenshots/knowledge-notes.cy.ts/`。

## 实现阶段的验证结果（混合开发工作区）

- 后端全量：41 个测试文件、280 项测试通过；Nest 构建通过。
- 浏览器：4 个流程通过，覆盖桌面独立笔记 CRUD、复制与导航保护、桌面长笔记编辑、手机长笔记编辑及 320px 深色视口。
- MySQL：在独立 8.4 实例通过真实数据读写、并发去重与级联验证；迁移重复执行成功。
- TypeScript 与 Vite 生产构建通过，新增知识笔记模块 ESLint 检查通过。
- 前端全量：92 个测试文件、571 项测试全部通过（`vitest run --maxWorkers=2`，364 秒）。

构建仍有项目现有的大体积 chunk 提示；测试输出含 Ant Design/jsdom 警告，这些提示不等同于测试失败。

## 发布版本验证与 CI 调整

- 后端：基于最新发布分支，69 个文件 / 610 项测试通过，Nest 构建通过。
- 隔离 MySQL 8.4：真实读写、并发去重、权限隔离、版本冲突、关联删除、账号删除级联通过；迁移重复执行通过。
- 浏览器：隔离前端发布工作树 4 个流程通过。
- 前端 CI 在 verify 中构建并上传前台及后台 dist；deploy 下载同一次 run 的产物，用 Dockerfile.production 构建静态 Nginx 镜像，校验两份 index SHA。服务器无需重新下载 sharp 构建依赖。
- GitHub Actions 是最终生产部署结果来源，只有 CI deploy 成功且线上探测通过才能报告上线完成。

- 前端发布快照：86 个文件 / 519 项测试通过；管理后台 4 个文件 / 15 项测试通过；两个应用生产构建通过。数量与开发工作区不同是因为排除了未交付的 iOS/移动学习改造。
- 后端已由 Actions run 38040049116 部署成功，提交 `0359ac3`；公网新 API 未登录访问返回预期 401。
