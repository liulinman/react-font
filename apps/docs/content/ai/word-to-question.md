# 从词条到题目：把模型创作约束成可检查的数据

## 为什么不能直接复用例句
词库例句帮助理解词义，但原样拿来出题会让练习退化为记忆旧句。English World 要求生成新场景，并允许目标词使用原形、真实屈折变化或同词族的既有派生词。这个选择增加了练习价值，也使验证比“答案是否等于原词”复杂。

## 必要知识：词形关系与一致性
屈折变化改变语法形式，例如 walk 到 walked；派生可能改变词性，例如 effective 到 effectiveness。近义词替换则不是词形变化。数据模型要同时保存 base、answer、kind、partSpeech、relation，让学习者知道本题考到什么形式，而非仅看到一个红绿判定。

后端仓库 `src/interface/ai-services/ai-services.service.ts` 的 words 读取用户拥有的词并计算版本。来源标签“AI 批量导入”会被识别为来源信息，不当作英语例句。check 校验词条后，ready 只使用 valid 项，要求每词一道新题，并参考最近其他会话的全文避免直接重复。

## 真实实现的两道检查
`src/interface/ai-services/ai-security.ts` 中 validateQuestion 检查题面与答案等基本关系；ready 还校验关联 ID 不重复、数量一致。双人对话必须恰好 A/B 两轮，且两轮文本以空格拼接后严格等于 transcript。中文背景不能包含英语答案。最后独立模型 gate 验证语义与词族关系，对需要确认的词形逐项提供证明；失败会清空题目并保留错误。

## 具体输入与输出
下面是教学构造，不是在线生成结果：

```json
{"word":"effective","meaning":"有效的","partSpeech":"形容词"}
```

```json
{"answer":"effectiveness","transcript":"We discussed its effectiveness.","gap":"We discussed its ______.","wordForm":{"base":"effective","answer":"effectiveness","kind":"derivation","partSpeech":"名词","relation":"形容词派生为表示有效性的名词"}}
```

完整请求还包含词条 ID，完整输出还需场景、解释等字段。例子只展示关系，不能直接粘贴为完整接口测试。

## 怎样发现错误
用数量少的合成词条逐项核对：漏词或重复 ID 应拒绝；efficient 冒充 effective 的派生应拒绝；对话全文不一致应拒绝。通过源码检查只能证明规则存在，真实内容质量仍需实际样本验证。不要因一句英语读起来自然而跳过目标义与词形审核。流程全貌见 [AI 听力](/ai/listening-flow)。
