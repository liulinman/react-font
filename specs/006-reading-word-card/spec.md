# 精读词库卡片
featureId: intensive-reading/word-card
来源：docs/prd/intensive-reading/features/word-card/prd.md；docs/design/intensive-reading/word-card/design.md。用户明确要求按前述方向实现。Spec Kit项目脚本已实际创建并检查；无新增依赖。

- S1 / AC01：给定个人词库已有Urban及笔记，点击正文Urban展示保存字段；urban匹配，urb不匹配。点击高亮也保留原编辑行为。选区不误触。
- S2 / AC02：拖动标题、切换词及正文滚动后坐标保持；缩小窗口后边界收敛；长内容内部滚动。
- S3 / AC03：查询A未返回时点击B，A迟到不覆盖B；关闭忽略迟到响应；加载失败有重试。Enter打开，方向键移动，Escape关闭并恢复焦点。
- S4 / AC04：POST /english/lookupCollectedWord只读，AuthGuard及userId限定完整拼写查询，仅返回展示字段或null；无数据库迁移、供应商调用或业务写入。

技术决定：独立只读端点，避免分页模糊检索截断漏匹配。React state管理当前位置，effect清理丢弃旧响应；不持久缓存跨账号资料。词形变化不自动归并。

## r02 先AI原型再查询（用户明确修订S1）
- S5/FR06/AC05：新POST /english/lookupReadingWord接收englishWord和至多1000字符context。仅英文单词先调用AI，校验sourceWord/lemma/wordFormType/confident，再经原lookupCollectedWord按用户查询。输出sourceWord、lemma、resolution及word/null；原接口不变。
- S6/FR07/AC06：不确定输出uncertain且不查词；无效输出/供应商失败返回可重试错误，不吞成null。缓存仅用户+词+语境的成功原型，10分钟、最多256项；同key在途去重。缓存命中仍实时查本人词条。
- S7/S3：前端查询身份包含词和上下文，旧响应不得覆盖新语境；显示原词与原型，保持拖动及焦点行为。
实现：独立ReadingWordLookupService和ReadingWordController，EnglishModule导入现有AiServicesModule；不修改线上词库既有保护逻辑。上下文由精读所点位置前后各350字符截取。复用DeepSeek预算和并发管理，关闭思考模式；绝不设置新密钥或放宽配额。

原句中以<target>标识实际点击/选中的那一次出现，同段落重复saw不会共用另一处词形；标记只进入查询数据，不进入正文DOM。最终浏览器及真实AI证据见本轮delivery。

## r03 发音遗漏修复
S8/FR08/AC07：复用BritishPronunciationButton，word和wordId取saved词条，正文词sprawls不得作为实际播放身份。只改卡片TSX/CSS；沿用现有speech/word、加载、失败显式retryUid与管理员语音配置。断言原型ID、失败重试和音频响应，保持窗口打开。

## r04 本句释义与收词
S9/FR09/AC08：新增explainReadingWord，先复用lookup识别原型及实时查本人词库；仍缺词且语境明确才请求现有AI语境简义/用法。验证sourceWord/lemma/confident与长度/词性，AI数据仅预览，保存服务端10分钟用户绑定预览；个人词条不缓存。原句窗口及target标记由现有调用方传入，不改正文。
S10/FR10/AC09：collectReadingWord只接受previewToken，取服务端已验证草稿并复用EnglishService.importMissingEnglishWords(overwriteExisting=false)，再实时读本人词条；返回word/created。令牌用户隔离，单令牌在途去重，数据库既有唯一约束兜底；重试/已有词不覆盖任何既有字段或学习资料，无迁移。
S11/FR11/AC10：无语境/不确定/无效返回不得签发预览，过期/其他用户令牌统一不可用。前端子组件按word+context key重置，生成/添加迟到响应需校验当前查询。生成/添加错误分别重试；显式确认才写入。
