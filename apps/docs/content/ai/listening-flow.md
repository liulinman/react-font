# AI 听力：让生成、练习与反馈各守边界

## 要解决什么问题
把单词交给模型，并不等于得到可靠练习。词义可能不准，生成句可能提前泄题，音频可能没有真正播放。因此 English World 将一次学习拆为选词、校验、生成、听写和反馈，而不是一个“调用 AI”按钮。理解这条链路，才能定位失败发生在哪一层。

## 必要知识：状态与公开投影
状态机用有限状态表达允许的动作。前端 `apps/english-world/src/aiListening/types.ts` 定义会话的 review、listening、completed、failed；题目有 ready、submitted、skipped。会话状态与题目状态不同：一轮正在练习，不代表每题都未提交。

更关键的是“公开投影”：数据库保存的内部对象不能原样发给浏览器。后端仓库 `src/interface/ai-services/ai-security.ts` 的 publicSession 只在提交或揭晓后返回反馈中的答案、全文与解析。中文场景会传到前端，但页面默认收起；这与服务端不提前返回答案是两种不同保护，不能互相替代。

## 项目怎样串起来
后端 `src/interface/ai-services/ai-services.service.ts` 按当前用户查询 1 至 10 个词，校验后只取 valid 项出题。生成后还检查题目数量、词条关联、重复全文以及词形关系，再交给独立模型校验。前端 `apps/english-world/src/aiListening/AiListeningPage.tsx` 展示每一步，并按题目 ID 保存输入和提示展开状态。

播放的是含答案的完整英语句子或对话，不是把答案消音。训练目标是从声音识别目标词；完整文本与解析在反馈阶段查看。中文提示默认隐藏，让学习者可以先依赖声音。

## 一次具体练习
教学示例：选择 effective（有效的），生成 “The new plan is effective.”，页面填空可为 “The new plan is ______.”。先听完整音频，再输入 effective；提交后才获得答案与全文反馈。这是说明流程的构造示例，未调用模型，也不是本轮真实验收结果。

## 怎样验证与定位
用自有测试词检查：未提交响应不含 feedback 答案，中文提示初始收起，音频确实含目标词，提交后全文可展开。如果生成失败，先看校验状态与会话 error；若播放失败，检查音频响应和浏览器播放事件。不要把缓存命中、模拟响应或按钮出现当成整条学习链通过。继续阅读 [词条到题目](/ai/word-to-question)。
