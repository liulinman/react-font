# 实例：实现 query_words

## 要解决的查询问题

用户希望“找包含 learn 的词，先给五条”。合理实现需要把自然语言转成有限查询，同时保证账号隔离、稳定顺序与分页信息。Freewing 的 `query_words` 只搜索词头 `englishWord`，不搜索中文、笔记或所有账号；它也没有 `page`、`pageSize` 参数。

参数定义来自后端 `src/interface/mcp-access/mcp.controller.ts`，以下片段由文档同步流程纳入构建，业务源码仍是维护入口。

<<< ../../snippets/mcp-query-definition.ts

`keyword` 可省略，会去除两端空白，最多 100 字符。`limit` 是 1 至 50 的整数，默认 20；`offset` 是 0 至 1000000 的整数，默认 0。第二批五条应传 `offset: 5`，不能把它误解为第 5 页。超过边界的输入由 schema 拒绝，而不是自动截断成合法数值。

## 从授权到数据库

实际处理逻辑来自后端 `src/interface/mcp-access/mcp.service.ts` 的 `queryWords`：

<<< ../../snippets/mcp-query-handler.ts

服务器把授权账号加入 `where.userId`，客户端没有传任意用户 ID 的入口。关键词用于词头包含匹配；反斜杠、百分号和下划线经过转义，以免普通输入变成 LIKE 通配符。查询按 `id DESC` 返回，同时计算匹配总数。事务与授权检查由外层 `execute` 负责，因此复制这一小段不能得到完整安全服务。

## 一组输入与输出

前提是已经用只读测试授权完成 MCP 初始化。客户端调用 `tools/call` 时使用下面的 `params`：

```json
{
  "name": "query_words",
  "arguments": { "keyword": "learn", "limit": 5, "offset": 0 }
}
```

业务对象示意如下，词条字段为教学缩略，真实返回以服务为准；这不是已执行查询的记录。

```json
{
  "items": [{ "id": 101, "englishWord": "learn" }],
  "total": 1,
  "limit": 5,
  "offset": 0
}
```

MCP 外层把该对象序列化到 `content[0].text`。先解析外层结果，再解析文本中的 JSON，避免把字符串当成可直接遍历的数组。空结果仍应保留分页字段，例如 `items: []` 与 `total: 0`，不能用异常表示正常的无匹配状态。

## 如何检查实现

在隔离测试词库准备一个匹配词、一个不匹配词，并分别用两个账号读取，确认结果不串账号。检查第一页和下一页的 offset、默认分页、`limit: 51`、负 offset，以及含 `%` 的关键词。没有 `words:read` 时应得到 `forbidden`，过期或撤销授权应被拒绝。并发新增会改变按 ID 排序的结果，offset 分页并不提供固定快照，连续翻页时不能宣称绝对无重复或遗漏。

协议负责工具调用外形，字段范围、关键词规则和账号约束是本项目契约。完整参数可查 [工具参考](/reference/tools)。
