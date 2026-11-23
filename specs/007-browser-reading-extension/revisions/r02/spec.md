# Chrome阅读查词0.2.0

来源：docs/prd/vocabulary/features/browser-reading-extension/prd.md，docs/design/vocabulary/browser-reading-extension/revisions/r02/design.md。延续S1-S4授权与账号隔离；不更改既有单词身份或授权ID。

- S5（AC05）：Browser explain响应新增phonetic、explanation、sentenceTranslation；AI同一次语境释义仅翻译clickedSentence；浏览器路径严格校验translation非空、<=2000字符，其他精读请求保持旧契约。扩展展示音标与主动播放，取消时停止、失败可恢复。
- S6（AC06/07）：save接收可选note（<=4000字符），无note的0.1.0仍可保存；通过用户归属词条行锁串行化，确认引用尚未存在才追加笔记与插入引用，在同一事务中保存。既有笔记和学习状态不覆盖；查询和失败不写入。单词笔记存储容量不足显式拒绝。
- S7（AC03/08）：新增引用sentence_translation可空TEXT字段，旧引用为空兼容；列表返回sentenceTranslation。卡片与网站均显示来源标题/URL；协议/账号约束不变。
- S8（AC08）：扩展ID/key不变、版本0.2.0，ZIP位于/docs/downloads/兼容旧Worker；显式安装/重新加载，不承诺自动更新商店版。

验收：Jest验证AI字段/事务/idempotency/越权；Vitest与浏览器验证卡片与出处；Cypress隔离SQL+Cloud验证完整保存、刷新和保留旧笔记；真实AI及真实扩展操作分开留证，不将mock算作真实AI或语音音质。
