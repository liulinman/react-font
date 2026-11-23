# 实例：词条与知识笔记的安全写入

## 为什么新增不能顺便覆盖

用户说“保存这个词”，可能是新增，也可能是改动已有解释。Freewing 将这两种意图区分为不同工具。`create_word` 对规范化后的同词返回 `duplicate_word`，不会悄悄改写旧内容；覆盖则先生成预览，用户明确确认后再执行。相关实现位于后端 `src/interface/mcp-access/mcp.service.ts` 的 `createWord`、`preview`、`confirm` 与 `idempotent`。

以下是已初始化测试客户端中的工具参数演示，只在独立测试账号中经授权使用，不要直接对正式词库执行。

```json
{
  "name": "create_word",
  "arguments": {
    "word": { "englishWord": "  Learn  ", "englishChinese": "学习" },
    "requestId": "demo-create-001"
  }
}
```

服务会合并词头连续空白、去除首尾空白并转为小写，保存结果中的词头为 `learn`。新增覆盖次数为 0。重复判定以账号为边界，代码锁定所属账号以串行化不同授权发起的新增检查；这项业务规则不由 MCP 协议提供。

## 先看清变化再确认

假设查询得到自己的测试词条 ID 101，预览调用为：

```json
{
  "name": "preview_update_word",
  "arguments": {
    "wordId": 101,
    "changes": { "englishChinese": "学习；学会", "englishNote": " " }
  }
}
```

返回包含 `before`、`after`、`changedFields`、`warning`、`expiresAt` 和一次确认凭证。`englishNote` 的空白不会清空已有笔记；后端共享的 `src/interface/english/safe-overwrite.ts` 只保留非空字符串、合法枚举和非空词性数组。因此这个流程不支持通过空字符串清除字段，也不允许改词头或 ID。

用户确认具体差异后，客户端再调用 `confirm_update_word`，传入本次返回的 `confirmationToken`、`confirmed: true` 和新的 `requestId`。确认凭证为 43 位 URL 安全字符串，不能把本文占位文字当作有效凭证。预览有效期为十分钟；期间词条变化会触发 `word_changed`，需要重新预览，不能拿旧差异继续确认。

## 重试与验证边界

新增和确认操作的 `requestId` 用于幂等重试。同一授权下，相同请求 ID 与相同内容返回已有结果；用同一个 ID 改内容会得到 `request_conflict`。这与随机给每次网络重试换 ID 不同，后者可能制造新操作。确认凭证消费后保存结果，避免同一预览重复增加覆盖次数。

验证时先记录测试词条，再执行预览并确认数据库内容未变；确认后重新读取，检查指定字段变化、空值字段保留、覆盖次数只增加一次。检查无变化、凭证过期、权限不足和并发修改路径。删除也分预览与确认，但确认删除不可恢复，本文不提供自动执行删除的示例。工具成功提示不能替代数据复核；本文描述的是源码契约，没有声称完成了生产写入或全部 PRD 验收。


## 将聊天内容保存为知识笔记

笔记工具已于2026年10月28日发布，与网站知识笔记共用同一份数据。笔记与词条分开授权：`notes:read` 可查笔记和目录，`notes:create` 可新建笔记，`notes:update` 可预览并确认修改，`notes:folders:create` 可预览并确认建立笔记文件夹。旧词库授权不会自动得到这些权限；按需新建授权后使用。只读查询仍是默认选项。

语义判断和持久化是两件事。客户端 AI 先调用 `list_note_folders`，根据主题选合适的已有目录；服务端校验目录属于本人。已有目录直接归类，不必再次询问。没有合适目录时，调用 `preview_create_note_folder`，向用户展示名称及父级并询问；用户拒绝时保留草稿，不能调用确认工具。只有用户明确同意，才调用 `confirm_create_note_folder`，随后新建笔记。目录建立成功但笔记失败时，须分别报告状态，重试保存到刚才的目录。

以下为合成教学参数，文件夹 ID 必须换成本人查询所得，`requestId` 是为本次新建生成并在重试时复用的 UUID：

```json
{
  "name": "create_note",
  "arguments": {
    "requestId": "f7427f94-21e1-45ca-b730-c294cc58d43b",
    "folderId": 12,
    "note": {
      "title": "定语从句：指代关系",
      "body": "# 定语从句\nthat 指代前面的名词。\n保留原文和换行。",
      "category": "语法",
      "examples": "The book that I read was useful.",
      "source": "课堂整理"
    }
  }
}
```

`query_notes` 使用 `q`、`category`、`page`、`folderId`、`wordId` 过滤，每页 20 条；目录过滤包含子目录，`folderId: "unfiled"` 只查询未归档。`get_note` 用 `noteId` 读取完整原文与版本。新建笔记必须指定已有的有效文件夹，不会自动降级为未归档。

## 修改笔记必须展示差异

调用 `preview_update_note`，传 `noteId` 和 `changes`。服务端返回完整 `before`、`after`、`changedFields` 和十分钟有效的确认凭证。客户端须展示正文及目录、关联单词等所有变化；用户明确确认后，才可用该凭证调用 `confirm_update_note`。用户提出新的修改方案时要重新预览，不能把原确认用于新内容。

笔记修改中，未给出的字段保留；明确传 `examples: ""`、`source: ""` 或 `wordIds: []` 可以清空可选字段。标题、正文不能为空，这与词条覆盖“忽略空值”的规则不同。标题上限 120 字符、正文 30000、例句 10000、来源 1000，关联本人单词最多 20 个。

后端 `src/interface/mcp-access/mcp-notes.ts` 复用知识笔记服务。预览不写业务数据；确认、业务写入、幂等结果与审计在同一事务内。笔记版本变化返回 `note_changed`，过期返回 `expired_preview`，跨账号、跨授权或跨动作凭证返回 `invalid_preview`；都需重新读取并预览。保存后用 MCP 或网站回读，确认同一笔记 ID、正文与目录。工具返回 `confirmed: true` 只能证明调用参数，不能独立证明第三方客户端已经向人展示并征得同意；这一层还需实际客户端验证。本次不提供删除笔记工具。
