# 播放与密钥展示：异步界面如何守住有效期

## 两个看似无关的问题
快速切换音频时，旧请求可能突然开始播放；连续复制多个字段时，旧剪贴板结果可能把新提示覆盖。二者都来自“结果晚到”。密钥还有更短的展示生命周期：关闭弹窗后，界面不应继续保留可见明文。

## 播放需要事件，而非猜测
`apps/english-world/src/aiListening/audio.ts` 把状态分成 loading、playing、idle。点击播放先进入 loading，真正收到 playing 才显示正在播放并触发一次 onPlaying；waiting 可以重新进入 loading。下载完成和 play() 被调用都不能证明声音开始，计次必须基于实际事件。

stopListeningAudio 递增 generation，取消下载、暂停播放器、移除 src、释放对象 URL，并通知 idle。每次异步步骤与事件回调都比较代次，旧音频不能复活。页面另用 audioRun 与 epoch 检查当前题目和会话，形成资源层与业务层的保护。慢速设置 playbackRate=0.8，并保持音高；它复用音频数据，不代表新合成。

## 一次性密钥如何展示
`apps/english-world/src/page/englishWorld/component/McpAccessCard.tsx` 在创建成功后把返回 token 暂存在 secret state，用独立弹窗展示。列表保存的是授权元数据，不提供再次查询明文的操作。closeSecret 清空 secret，同时递增 copyAttempt 并清理复制反馈，使关闭前未结束的剪贴板回调不能再更新状态。

这是一种减少界面保留的设计，不等于撤销授权，也不承诺系统剪贴板或浏览器内存被安全擦除。遗失密钥的业务路径是撤销旧授权、重新创建；模板只放占位符，不把真实明文嵌入配置示例。

## 具体时间线与验证
教学时间线：播放 A 进入 loading；点击 B 先停止 A，使代次增加；A 下载迟到时版本不符，直接退出；B 收到 playing 才显示波形。复制密钥后立即关闭弹窗，即使剪贴板 Promise 随后完成，也不应出现旧“已复制”反馈。以上是源码推演，未声称设备实测。

可通过延迟 Promise、模拟 playing/waiting/ended 和剪贴板拒绝验证边界。音频还会检查可解码及非静音，但非静音并不能证明内容语义正确。排错要分开检查服务端音频、浏览器事件与设备输出；不要为调试把真实密钥打印到控制台或截图。相关测试位于 `audio.test.ts` 与 `McpAccessCard.test.tsx`。
