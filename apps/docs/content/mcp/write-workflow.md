# 实例：新增与安全覆盖词条

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
