# English World 阅读查词

桌面 Chrome 扩展。选中一个英文单词，右键选择「English World · 查本句含义」。点击「加入词库」或「保存本句」，在 English World 的词条详情查看「原文出处」。

## 本地安装

1. 准备包含本功能的 English World 前端和 NestJS 后端。在开发库应用 `nestjs/migrations/create-browser-reading-source.sql`，配置 `REDIS_URL` 并启用现有的 DeepSeek 服务。
2. 在 Chrome 打开 `chrome://extensions`，开启开发者模式，选择「加载已解压的扩展程序」，选中当前目录 `react-font/apps/browser-reading-extension`。
3. 点击扩展图标，填写 English World **网页**地址。例如本地前端使用 `http://localhost:5173`。点击「连接账号」，按页面提示登录及授权。
4. 在普通网页正文选词并查询。到词库打开该词，确认原句、释义和来源链接。关闭浏览器后，重新使用扩展时需再连接账号；也可以在扩展设置里主动断开连接。

扩展只在主动查询时读取选区。它把单词、原句和当前页来源发给已连接的 English World 服务。链接经后端校验后只在确认保存时写入词库。来源链接和网页标题不发给 AI。

## 验证样例

分别查询 `I went to the bank to deposit money.` 和 `We walked along the river bank.` 中的 `bank`。第一次收藏创建词条及出处。第二次应展示「河岸」并允许保存本句。刷新词库详情后，两条引用各有原文链接。重复保存同一来源和同一句中的同一词，不增加新的引用。
