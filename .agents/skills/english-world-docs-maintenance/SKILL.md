---
name: english-world-docs-maintenance
description: Use when English World features, APIs, AI/MCP behavior, configuration, UI flows or deployment change, or when maintaining its 技术与实践 VitePress documentation. Applies to 功能变更同步文档、教程更新、源码实例更新 and 文档站维护; not unrelated products or a substitute for PRD acceptance.
---

# English World 文档维护

让公开教程与这次功能变更一起交付，保持“知识原理＋项目实现＋具体实例”，优先更新已有文章，不另建重复的产品文档站。

## 先确定实际影响

1. 定位包含 `react-font/` 和 `nestjs/` 的工作区，读取适用 AGENTS.md；从本次任务、两仓库的 diff/提交范围和当前源码确认变化。不要默认只有未提交文件，也不要修改别人的未提交内容。
2. 正式需求以 `react-font/docs/prd/README.md` 为入口，文档站要求见 `docs/prd/settings/features/technical-docs/prd.md`（相对 react-font）。需求、当前代码、实际执行证据分别核对；实现偏差不冒充已确认需求。
3. 用 [影响映射与验证入口](references/project-map.md) 找到受影响文章，再用工具名、字段名、旧默认值及旧入口搜索公开源，检查交叉引用。映射只是定位线索，不能代替全文检查。

## 同步维护

- 改动实际受影响的概念解释、业务约束、参数/默认值/错误码、操作路径、实例输入输出和验证办法；不机械替换所有相同数字。合法的显式参数示例可保留。
- 新功能优先补入现有章节；确需新文章时一起更新 `site-map.json`、相关链接及首页。检查器当前固定25篇是首版约束，新增/删除文章应先对齐需求，再调整计数断言，不能删检查或填空页凑数。
- 文章以读者任务组织，用真实的仓库相对源码路径解释实现；实例明确是教学构造、源码推演还是实际执行。只因改了代码，不得称测试通过或已经上线。
- 涉及源码引用时阅读同步脚本及 `snippets/sources.json`。**脚本读取工作树却写入 HEAD；源文件未提交时，不得生成并声称片段来自该 HEAD。** 按既有授权提交对应源码后同步；未获提交授权或暂不能提交时，先更新文章并明确记录片段同步待办，不能伪造来源版本。核对提取边界、内容摘要和两份片段差异；同步器失败先定位，不能静默跳过。
- 公开源仅为 `apps/docs/content/`、`public/` 与审定源码片段。真实密钥、账号数据、私有原件、环境文件、日志和内部 PRD 不得导入。认证示例用明确占位符；精选片段保留来源和必要上下文，不能复制整份配置。
- 有读者可感知的能力变化时更新 `content/reference/changelog.md`；内部记录和公开更新记录分开，未发布写明状态。

## 验证与交付

从 react-font 执行 `pnpm docs:check`、`pnpm docs:build`，阅读当次输出；脚本路径与局限见参考。文字修正至少构建并预览受影响页；导航、搜索、代码片段或样式变化需真实浏览器验证相应行为，手机改动看390px，中文搜索实际输入中文。

用户要求按 PRD 或全量验收时，另按项目 PRD 测试规则执行；文档构建和局部浏览器通过不等于完整验收。已有测试只是基线，功能变化时维护具体断言。

发布跟随本次用户授权范围：已授权发布则连同功能产物发布并读线上结果；仅维护文档不自动登录服务器、提交推送或部署。发布时读取 [发布注意事项](references/project-map.md#发布注意事项)，禁止沿用历史镜像ID硬覆盖当前生产。

交付说明受影响文章及理由、验证结果、发布与否和未解决项。无文档影响时给出可核对的简短理由，不制造无意义改动；仍有片段、构建或必要验证待办时，不得宣称文档同步完成。
