# 本地开发：先分清应用与测试环境

## 为什么只启动网页还不够

Freewing 的页面依赖后端业务接口。前端开发服务器能够显示登录页，不代表 MySQL、上传或 AI 服务已经就绪。后端启动会调用数据库认证，连接失败时记录错误并抛出异常，不能把一个没有数据库的服务当成正常启动。Redis 在当前 AI 查词路径中是可选缓存：没有配置或不可用时会降级为不缓存，它不是 MySQL 的替代品。涉及 AI 生成或上传时还需要对应提供方的配置，普通页面预览不应为了消除错误而随意启用收费调用。

## 准备与启动

前端根 `package.json` 声明 Node `^20.19.0 || >=22.12.0` 和 pnpm 10.8.1。后端也声明 pnpm 10.8.1。先准备独立的本地 MySQL 数据库和具备相应权限的开发账号，再按 `nestjs/.env.example` 的变量名配置本地文件；示例模板是字段说明，不能原样当作完整安全部署配置。本文不提供未经仓库验证的数据库容器创建命令，也不假定首次启动能自动生成全部业务表。

```sh
# 在 react-font 仓库执行
pnpm install --frozen-lockfile
pnpm --filter @font/english-world dev
```

```sh
# 在 nestjs 仓库执行，先完成独立开发数据库配置
pnpm install --frozen-lockfile
pnpm start:dev
```

确认前端实际显示的监听地址，并检查开发代理目标与后端 `PORT` 一致。后端默认端口为 3000；MySQL 默认端口与 HTTP 端口毫无关系。需要管理端时另行启动相应工作区，不能把学生页面的路由错误当成管理端已经运行。

## 环境加载的真实规则

`nestjs/src/load-env.ts` 首先读取当前工作目录的 `.env`。当指定的关键变量列表中有缺失值时，还尝试读取上一层 `.env`；列表包括数据库连接、JWT 和部分外部服务字段。dotenv 默认不覆盖已有进程变量，因此启动位置、进程环境及两个文件都可能影响最终结果。它没有“自动判断安全开发环境”的能力，也不是默认读取生产环境的理由。启动前应核对当前目录和连接目标，避免父目录配置意外补足错误的数据库地址。不要在日志中打印密码来调试优先级。

## 自动化测试另走一套入口

`nestjs/test/integration/environment.ts` 明确不导入 load-env，而是设置专用测试环境，数据库固定为本机 `13316` 端口、专用测试库和账号，并通过 `assertTestDatabase` 防止越界重置。前端 `scripts/prd-testing/execute.mjs` 检查 `13317`、`13318`、`5176` 是否被占用，分别用于测试后端、学生应用与管理应用。测试数据库端口不是应用默认数据库端口，测试服务地址也不应写回日常配置。

```sh
# 在 react-font 执行；会启动隔离测试流程并记录 Cloud
pnpm test:prd --module vocabulary --cloud
```

运行前需要 Docker 与 Compose 可用，并核对仓库测试说明。后端 `scripts/test-local.mjs` 使用已存在的 `test/integration/compose.yml` 启动专用数据库，先获取运行锁，结束时清理自己拥有的测试服务与卷；其中的重置和清理会改变测试数据，不适用于日常应用数据库。先核对正式需求、维护具体断言，再执行并阅读当次报告。缺少数据库、端口被占用、断言被跳过都不算通过。若日常服务启动失败，优先查连接目标、权限、数据库是否存在及代理地址；不要用移除隔离保护或加载真实账号凭据的方法“修好”测试。

## 启动教师端

教师端在 `apps/teacher`，复用 Freewing 账号。先在本地数据库应用后端的 `migrations/create-classrooms.sql`，启动后端，再从前端工作区运行 `pnpm --filter @font/teacher dev`。管理员在「用户管理 → 更多 → 开通教师端」授权后，教师可从 `http://localhost:5187/teacher/` 登录。

本地邀请链接默认打开学生端的 5173 端口。两个前端请使用同一个主机名，便于共享账号会话。学生端地址不同时，可配置教师端的 `VITE_STUDENT_ORIGIN`。在测试课堂中用两个账号分别验证教师发题和学生作答。

## 维护管理端的产品需求模块

管理端导航的“产品需求”使用 VitePress 阅读体验，与公开文档中心分开。它支持按模块浏览、中文全文搜索、章节目录、代码高亮和深链接。管理端内嵌阅读器，也可独立打开阅读；学习端不提供 PRD 入口。

正式来源继续维护在前端仓库 `docs/prd/`。修改后，从 `react-font/` 执行：

```sh
pnpm prd:sync
pnpm prd:check
```

`scripts/sync-prd-catalog.mjs` 需要相邻的后端仓库，将原文、模块元数据和逐文件 SHA256 写入后端专用 `src/interface/product-requirements/catalog.generated.ts`。生成文件不可手动编辑。随后从 `nestjs/` 执行：

```sh
pnpm build
```

后端构建在编译服务后执行 `scripts/build-prd-site.mjs`，核对快照摘要、生成需求导航与中文全文搜索，输出到后端的 `private-prd-site/`；Docker 构建复制这份私有产物。需要打包交付产线的验收证据时，在前端先运行 `pnpm pipeline:sync`，将经筛选的快照生成到后端的 `private-pipeline/`。普通 Git 检出的构建只生成 PRD 页面。生产不依赖前端源码目录挂载。只更新前端不能更新线上 PRD。目录之外的文档、原件与图片不自动引入，阅读中显示未收录；隐藏决策文件会映射为可阅读的普通页面地址，源路径仍保留。

静态文件也能受权限保护：后端 `product-requirements.controller.ts` 对 `/api/admin/prd/` 的每个请求使用 `AdminAuthGuard`，包括HTML、脚本、样式、搜索索引和哈希映射。校验有效的 `admin_token` 后才返回文件，并设置 `private, no-store`。普通学习端 Cookie 或 MCP Bearer 不授予管理员访问权。请求只在私有产物目录解析，不返回任意磁盘文件，也不以平台首页代替不存在的资源。

私有站点不能复制到公开 Nginx 根目录、`admin` 静态目录或 `apps/docs`；当前通过已有 `/api/` 代理进入后端，不需要把权限判断放在前端菜单。教学验证方法：匿名和普通用户分别直接请求HTML、深层页和搜索资源，应得到401；管理员登录后可阅读与搜索；退出后新的资源请求应被拒绝。浏览器已经读取到的内容无法被服务器追回。上述是验证方法，不是本轮生产环境执行记录。

## 验证词库复习下载

在桌面学生词库点击「下载单词」，选择已勾选、当前筛选或全部。以测试词条 `asset` 为例，填写释义「资产；优点」，在笔记单独写一行「搭配：fixed assets」。下载预览和文件会呈现 `asset / 资产 / fixed assets`。没有短搭配或原文线索时，第三列留空。PDF 适合打印，Word 可继续编辑，Excel 首行可筛选。

`nestjs/src/interface/english/word-review-download.service.ts` 复用词库查询的账号和筛选条件，再从原有释义和出处生成短复习行。预览返回词数和前三行，下载前核对复习内容的摘要。若期间修改了词条，刷新预览后再下载。准备超过一页的合成词条，检查 PDF 每页表头和中文，并核对三种文件的行数。Docker 已配置 Noto CJK 字体；在本机运行后端生成 PDF 时，需要可用的 Noto CJK 或 macOS 简体中文字体。

## 调试 Chrome 阅读扩展

生产环境可下载 [阅读扩展 0.2.0](https://124.223.157.129/docs/downloads/english-world-reading-extension-0.2.0.zip)，解压后在 Chrome 扩展管理页加载，并连接 `https://124.223.157.129`。

先运行包含阅读扩展授权页和 API 的前后端。在新开发库先执行 `nestjs/migrations/create-browser-reading-source.sql`，再执行 `nestjs/migrations/browser-reading-020.sql`。从 0.1.0 升级时执行后一个迁移即可，历史出处保留。配置 `REDIS_URL` 和现有 DeepSeek 服务。扩展使用 Redis 保存短时授权和查词预览，因此这条路径需要 Redis 可用。

Chrome 中打开 `chrome://extensions` 并开启开发者模式，加载 `react-font/apps/browser-reading-extension`。点击扩展图标，在「连接学习账号」页填写「学习站点地址」（本地示例为 `http://localhost:5173`），点击「连接账号」并完成登录授权。看到「已连接」后，在普通网页选词，右键选择「English World · 查本句含义」。收藏结果在词条详情的「原文出处」里查看。如需切换站点，先点「断开连接」撤销当前授权，再填写新地址。

扩展管理页和工具栏使用 Freewing 书翼图标。在 `react-font/` 运行 `pnpm brand:generate --app browser-reading-extension`，可以从 `branding/freewing/symbol-source.png` 重新生成图标。已加载本地源码的扩展可在 `chrome://extensions` 点击重新加载查看效果。

教学样例是在两篇页面中分别查询银行和河岸语境的 bank。两次主动保存后，词库里仍是同一词条，每个出处分别展示原句、释义和链接。服务端对同一词条、链接、原句和词位置去重，网络重试不会添加重复引用。

也可以在 `Key Considerations` 这样的标题里选中 `Considerations`。词卡会展示「常见释义」和「原文片段」，保存后仍能从词库打开原页。这个场景需同时使用支持片段查询的扩展和后端。查词失败时，词卡会用中文提示，并提供「重试查询」。


### 阅读扩展 0.2.0 更新与资料

已加载0.1.0的用户，将新包解压覆盖原扩展目录，在 `chrome://extensions` 点击该扩展的重新加载，然后刷新正在阅读的网页；必要时重新连接账号。扩展ID保持一致，已保存的词条与出处留在服务器。此安装包为解压加载版，不会通过应用商店自动更新。

词卡依次显示音标、主动发音、本句词义、英文原句、整句中文译文、原文来源和单词笔记。保存前可修改笔记，新词预填用法说明；已有词的笔记追加保留，不覆盖原文。来源标题和实际地址均展示，保存后的词库出处包含句子译文。旧出处未保存译文时继续显示原句。发音使用浏览器/系统提供的英语语音，优先en-GB，音色不等同于网站的服务器语音；没有英语语音或播放失败会提示重试。
