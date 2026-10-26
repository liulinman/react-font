# 工具名称与参数参考

## 调用外形与权限

MCP 客户端完成初始化后，通过 `tools/list` 获取定义，通过 `tools/call` 传工具名和 `arguments`。Freewing 当前登记七个词库工具，定义源于后端 `src/interface/mcp-access/mcp.controller.ts`，输入 schema 位于同目录 `mcp-security.ts`。下表记录业务契约，不是所有 MCP 服务通用的工具清单。

| 工具 | 必要参数 | 所需权限 |
| --- | --- | --- |
| `query_words` | 无；可传 keyword、limit、offset | `words:read` |
| `get_word` | wordId | `words:read` |
| `create_word` | word、requestId | `words:create` |
| `preview_update_word` | wordId、changes | `words:update` |
| `confirm_update_word` | confirmationToken、confirmed、requestId | `words:update` |
| `preview_delete_word` | wordId | `words:delete` |
| `confirm_delete_word` | confirmationToken、confirmed、requestId | `words:delete` |

`wordId` 必须为正整数。`requestId` 长度 1 至 100，仅允许字母、数字、下划线、点、冒号和连字符。同一授权中的请求 ID 不能换内容重用。确认参数的 `confirmed` 必须为布尔值 `true`；确认凭证由预览返回，不是客户端自行生成。

## 词条字段

`word` 必须包含 `englishWord`，去两端空白后长度为 1 至 255，连续空白会合并。其余可选字符串中，`englishNote` 最长 10000，其余 `englishPhonetic`、`englishChinese`、`englishReference`、`englishImg` 最长 255。`englishType` 为 0 单词、1 短语、2 句子；`englishLevel` 为 0 不会、1 一般、2 熟练、3 精通。

`englishPartSpeech` 是最多九项的整数数组：1 动词、2 名词、3 形容词、4 副词、5 代词、6 介词、7 连词、8 感叹词、9 未分类。`word` 是严格对象，不能夹带任意数据库字段。`changes` 使用同一组可选字段，但不接受 `englishWord`，并且至少要包含一个经安全覆盖过滤后有效的字段。

## 查询与返回示例

以下是测试客户端的只读调用参数，运行前需已完成初始化和认证：

```json
{
  "name": "query_words",
  "arguments": { "keyword": "learn", "limit": 10, "offset": 0 }
}
```

`keyword` 最多 100 字符；`limit` 范围 1 至 50，默认 20；`offset` 范围 0 至 1000000，默认 0。查询返回 `{items,total,limit,offset}`，读取单条直接返回词条对象，新增和确认覆盖返回 `{word}`。预览返回前后值和凭证，确认删除返回 `{deleted:true,wordId}`。

这些业务对象被序列化在 MCP 文本内容中。调用端应先检查 `isError`，不能只检查是否存在 `content`。服务器错误结果通常仍有可读文本。结构校验错误可能由 SDK 在进入业务服务之前返回，不能假定所有错误都具有项目自定义业务码。详细调用过程见 [查询实现](/mcp/query-words) 与 [覆盖实例](/mcp/write-workflow)；所有示例均不代表真实执行结果。

## 参数验证的几个边界

数组中的词性编号范围由 schema 检查，但当前定义没有额外去重规则；调用方应按实际词性传值，不能假设服务会自动补齐分类。数值零是有效的类型和熟练度，不应在客户端用真假判断过滤。与之相反，空笔记和空词性数组在安全覆盖时会被忽略。检查接口时应分别覆盖零值、空值和缺省值，它们代表不同含义，不能只测一组普通字符串便推断所有更新路径正确。
