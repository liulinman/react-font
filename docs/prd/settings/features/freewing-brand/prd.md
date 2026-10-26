---
title: Freewing 品牌名称与Logo统一
status: final
created: 2026-10-26
updated: 2026-10-26
---
# Freewing 品牌统一

用户已确认天空蓝/浅杏背景、书翼和世界地标的Logo，以及英文品牌名Freewing，要求更换项目涉及的名称与Logo。沿用已授权研发、测试和发布流程。

- FR-01：展示名称统一Freewing，品牌标语为“Learn freely. Explore the world.”；保留已确认书翼/自由女神/埃菲尔铁塔/大本钟/悉尼歌剧院和蓝青橙配色。完整批准稿保存在branding/freewing/approved-logo.png；紧凑处用去文字透明符号并配合真实文本，不在小图内缩入标语。
- FR-02：登录/注册共用页面、手机登录、桌面侧栏与面包屑、手机更多、后台登录与导航、HTML标题与favicon、PWA名称与安装图标、文档站名称/标题/首页/Logo/图标/公开正文统一。原生Capacitor配置与现有iOS显示名称和图标源同步，但不宣称已编译或分发原生应用。
- FR-03：图标尺寸按现有生成流程产出，PWA maskable内容落在安全区。Logo等比例展示、可访问命名，浅暗背景及390px不溢出。文档首页展示批准的完整品牌稿，紧凑导航使用符号。
- FR-04：仅改展示品牌；保持/englishWorld与/api路径、包名/目录、CSS/类名、数据库、存储键、appId、MCP工具/服务机器标识english-world及授权令牌前缀不变。文档说明Freewing旧称English World，历史记录不批量改写；源码路径和代码协议示例保持真实。
- FR-05：源码品牌资产单一来源、可重复生成三个站点资源和PWA图标。没有真实凭据、私有材料或业务数据进入品牌资产。同步公开文档和正式需求索引。
- FR-06：前端/管理端/文档构建与受影响测试通过后增量发布三个静态站点，保留后端、Nginx/HTTPS和数据，记录即时镜像回滚。旧PWA手动更新，不清空存储或强制中断学习。

## 验收
- AC-01：Given桌面和390px手机，when访问登录页及已登录导航，then展示Freewing与新图标，无EW占位和品牌溢出，登录行为不变。
- AC-02：Given管理后台、文档站、浏览器和PWA manifest，when读取页面/资源，then名称和图标正确，深链/中文搜索/旧API及MCP接入兼容。
- AC-03：Given图标生成命令，when重新生成，then派生资产可追溯到批准稿/符号源，maskable安全区及非透明底正确；原生更改仅记录为源码更新。
- AC-04：Given发布完成，when核对线上资产和服务，then静态资源与构建一致、后端镜像和TLS配置不变，回滚可恢复原前端。
