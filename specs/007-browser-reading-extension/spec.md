# Chrome 阅读扩展

依据：[PRD](../../docs/prd/vocabulary/features/browser-reading-extension/prd.md)及[确认交互](../../docs/design/vocabulary/browser-reading-extension/design.md)。

- S1 / AC-01：扩展按实际选区提取完整句和目标位置，已有词也请求语境释义。预览返回当前收藏状态。
- S2 / AC-02：保存确认接受服务端绑定预览，事务内建立词条和引用，唯一键保护并发或重试。
- S3 / AC-03：桌面词条读取本人引用，原文链接经清理后保留文章定位。
- S4 / AC-04：一次性授权码绑定 PKCE 及固定回调，扩展凭据限本功能。撤销和过期请求失败，迟到结果不改当前 UI。
