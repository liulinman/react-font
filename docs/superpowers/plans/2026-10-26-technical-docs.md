# English World 技术文档中心 Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development for independent content tasks and one whole-branch review. Parent implements the coupled build/deploy integration.

**Goal:** 发布25篇知识+技术+实例文档及可搜索文档站。
**Architecture:** VitePress独立workspace apps/docs，专用content目录公开白名单；主应用仅增加链接和桌面更新提示。静态产物随镜像/CI发布至/docs/，既有HTTPS配置增量合并。
**Tech Stack:** VitePress1.6.4、Vue3稳定版本、pnpm、现有Nginx与Docker。
**Spec:** ../../prd/settings/features/technical-docs/prd.md

## Global Constraints
仅审定公开内容；不含真实凭据/用户数据；不覆盖内部PRD。25篇独立文章、390px可用、深链刷新/404正确；不更改后端镜像、HTTPS挂载和数据库。用户已确认目录并授权实现及既有自动发布流程，不再重复请求审批。

## Review Focus
- 中文搜索需实际检索，不把英文索引可用当中文可用。
- 旧ServiceWorker拦截新/docs路径，更新提示必须桌面可见且不自动刷新。
- 深层路径及资源404不能返回SPA200，构建所有链接校验。
- 教程不能泄露本机目录/生产凭据或把演示当已验收。
- CI没有兄弟后端仓库时仍可使用审定源码快照构建。

### Task1 内容与源码片段
- [ ] 三组内容任务分别创建8、7、10篇文章；核对实际代码。
- [ ] apps/docs/snippets保存两份审定片段+来源摘要，scripts/sync-docs-code.mjs显式同步。
- [ ] 逐篇核对知识、代码、示例、验证与相对链接，不发布空占位。

### Task2 文档站与构建
- [ ] apps/docs/package.json/content/index.md/.vitepress/config.mts/theme创建独立站，配置base/docs/、中文搜索、导航与主题。
- [ ] scripts/check-docs.mjs检查25页、链接、敏感模式；先观察缺页失败，再内容齐备通过。
- [ ] package根命令、Dockerfiles及CI构建产物同步，脚本检查发布前存在docs/index.html。

### Task3 主站与路由
- [ ] EnglishHeader与MobileMorePage增加真实/docs/链接，补现有组件断言。
- [ ] PWA deny/docs、桌面使用可选Provider模式更新提示，保持原严格hook和手机行为；补更新测试。
- [ ] Nginx /docs静态优先级、深链.html与404；增量配置脚本保持原TLS不动，验证重复运行及未知配置拒绝。

### Task4 验证与发布
- [ ] 文档检查/构建、定向组件测试、真实构建站1280/390搜索和深链截图。
- [ ] 新上下文独立审查内容与集成，修复真实缺陷。
- [ ] 使用即时生产镜像增量部署前端+docs，保留backend/admin/TLS；核对线上正文、搜索、深链、404及摘要。
- [ ] 记录回滚、提交和vault交接；不宣称全PRD测试完成。
