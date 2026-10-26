# 请求封装：把网络、协议与业务失败分开

## 问题：HTTP 200 也可能不能使用
浏览器 fetch 在服务器返回错误状态时通常仍会得到 Response；网络中断才进入异常路径。业务接口还可能在 HTTP 成功里携带失败 code。因此请求封装需要明确判断契约，不能用“没有抛异常”代替成功。

## 必要知识：三种数据通道
English World 中 JSON 接口、音频二进制和授权管理具有不同错误策略。`apps/english-world/src/aiListening/api.ts` 的 listeningFetch 无 body 时 GET，有 body 时 POST，并携带登录凭据。它尝试解析 JSON，同时要求 response.ok 与业务 code=200，成功只返回 data。transport 将普通网络异常改为可理解提示，但保留 AbortError，允许调用者把取消当作正常生命周期事件。

同文件 audioFetch 直接读取 Blob，并检查非空和 Content-Type 含 audio/。这是必要的协议校验：错误 HTML 页面即使状态异常配置成 200，也不应该交给播放器当音频。随后 audio.ts 还会解码与检查静音，逐层收紧有效性。

## 为什么授权管理更谨慎
`apps/english-world/src/page/englishWorld/component/McpAccessCard.tsx` 的 mcpAccessFetch 不直接显示服务端错误正文，避免上游消息意外携带凭据。401 显示登录失效，其余显示固定提示。它同时兼容包装的 code/data 和无 code 的直接对象；这属于该接口的项目兼容策略，不能复制后宣称所有 API 都应如此。

## 一个可推演的输入输出
以下为教学响应：

```json
{"code":200,"data":{"id":"demo-session","status":"review"}}
```

listeningFetch 的调用者得到 data 内对象。若 HTTP 200 但 code=500，会进入错误；若收到空音频 Blob，audioFetch 会报“音频无效”；若用户切页取消，请求抛 AbortError，页面可不显示红色失败提示。这些是按源码推演的结果，未发送线上请求。

## 验证与排错方法
测试时分别构造网络拒绝、非 JSON、HTTP 401、业务失败及正常包装，避免只测顺利路径。音频应覆盖错误媒体类型与零字节。排查时先记录状态码和响应类型，再看业务码，不把真实令牌或响应中的私有内容贴入公共日志。已有 `api.test.ts` 可作为回归位置，执行后才可报告通过；本篇仅介绍实现与验证方法。
