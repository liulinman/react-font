# 精读词库卡片
featureId: intensive-reading/word-card
来源：docs/prd/intensive-reading/features/word-card/prd.md；docs/design/intensive-reading/word-card/design.md。用户明确要求按前述方向实现。Spec Kit项目脚本已实际创建并检查；无新增依赖。

- S1 / AC01：给定个人词库已有Urban及笔记，点击正文Urban展示保存字段；urban匹配，urb不匹配。点击高亮也保留原编辑行为。选区不误触。
- S2 / AC02：拖动标题、切换词及正文滚动后坐标保持；缩小窗口后边界收敛；长内容内部滚动。
- S3 / AC03：查询A未返回时点击B，A迟到不覆盖B；关闭忽略迟到响应；加载失败有重试。Enter打开，方向键移动，Escape关闭并恢复焦点。
- S4 / AC04：POST /english/lookupCollectedWord只读，AuthGuard及userId限定完整拼写查询，仅返回展示字段或null；无数据库迁移、供应商调用或业务写入。

技术决定：独立只读端点，避免分页模糊检索截断漏匹配。React state管理当前位置，effect清理丢弃旧响应；不持久缓存跨账号资料。词形变化不自动归并。
