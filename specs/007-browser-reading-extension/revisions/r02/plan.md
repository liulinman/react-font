# 实施计划

> 按superpowers:executing-plans在当前会话执行。

目标：补齐一次网页查词所需资料并安全保存本人词库。无新增依赖，保留已有ID/授权和兼容接口，发布仅本次增量。

- [ ] T1 后端契约：先写失败测试；修改nestjs/src/interface/english/reading-word-lookup.service.ts、browser-reading.service.ts、browser-reading.controller.ts；新增migrations/browser-reading-020.sql与harness接入。确认整句译文；笔记与出处同事务，重试/并发不重复，旧笔记不覆盖。测试包括缺失译文、超长/空笔记、越权、旧调用。
- [ ] T2 词卡与出处：测试先行；修改apps/browser-reading-extension/content.js、manifest.json以及BrowserWordSources.tsx。可选新增speech.js管理英语朗读生命周期。UI保持原卡片；失败保留输入、关闭迟到响应无效，显式来源链接。
- [ ] T3 验收与教程：维护Cypress真实接口用例和Case；记录Cloud/首次失败/修复重跑。同步公开教程、0.2.0下载包；构建与真实浏览器验证旧Worker下载、编辑笔记/刷新/来源。
- [ ] T4 发布：核对即时镜像和源码归档，隔离补丁构建，备份DB后执行仅加字段迁移；保留应用回滚点及业务数据；上线真实AI/合成账号验收并清理，归档限制。无commit/push授权。
