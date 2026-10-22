---
title: 豆包语音管理与场景听词学习
type: feature
created: 2026-10-22
status: in-review
baseline_commit: 90c0efc
backend_baseline_commit: 56d57d3
context:
  - docs/prd/README.md
  - AGENTS.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

当前发音听感差，用户录入错误还会污染题目和答案。接入已试听的豆包语音，为管理员提供专门配置入口，形成“先看词复习，再听完整场景填空”的学习流程。独立中文到英文默写不进入这条新流程。

管理页复用现有 admin 平台认证，新增“语音服务”，避免为管理一个供应商另建账号系统。用户提供的 Key 仅进入服务端秘密配置，正文、源码、浏览器存储、日志和测试夹具均不得出现真实值。

## Boundaries & Constraints

**Always:** 密钥加密持久化；加密主密钥独立存放于服务端环境。管理员能够保存、更换、移除密钥，选择音色并试听、验证连接、启停服务；读取接口只返回是否配置及掩码。普通学习用户只能访问自己的学习内容，不能读取供应商配置。音色 ID 和模型必须与官方 API 及账号实际授权匹配，连接测试以真实供应商成功响应为准。默认候选 Zendaya/Michael 2.0，可在管理页更换；没有得到用户音质确认前不称为最终选定。

**Ask First:** 开通正式后付费服务、购买资源包、部署生产、推送代码或替换其他已有学习模式。

**Never:** 将供应商 Key 下发前端；以 UUID 外形推断密钥有效；通过浏览器内部接口冒充官方 API；将生成失败、无音频或词条可疑计为学习错误；删除已有阅读、笔记等功能。

## I/O & Edge-Case Matrix

| 场景 | 输入/状态 | 预期行为 | 失败处理 |
|---|---|---|---|
| 管理配置 | 管理员输入 Key 和音色 | 保存后清空输入，仅显示掩码 | 缺少加密主密钥拒绝保存并说明部署要求 |
| 鉴权 | 未登录或普通用户访问管理 API | 拒绝读取和写入 | 不泄漏配置及密钥 |
| 连接试听 | 已配置供应商 | 生成固定短句并可播放 | 区分认证、权限、额度、限流、超时；不回显上游敏感正文 |
| 单词发音 | 已校验词条、词义、口音 | 桌面和移动端播放相同服务音频 | 可恢复失败，不将失败当成功 |
| 缓存 | 文本、声音、模型和读音版本相同 | 复用音频，合并并发生成 | 更换文本、音色或读音版本后不能命中旧缓存 |
| 词条疑误 | 拼写、释义不匹配或无法确定 | 展示建议，原记录保留，暂停用于计分题 | 不因 AI 建议静默覆盖词条 |
| 场景填空 | 点击播放 | 页面有 gap，音频包含完整答案，提交前不显示答案 | 无音频时允许重试/跳过，不记错 |
| 判题 | 输入词形、大小写、首尾空格 | 根据当前句子的目标词形判断 | 记录首次结果与提示使用，解释不能改变规则判定 |

</frozen-after-approval>

## Code Map

- `apps/admin/src/AdminApp.tsx`：现有管理端，新增语音配置分区。
- `apps/admin/src/SpeechSettings.tsx`：新增设置、连接测试和试听面板。
- `apps/admin/src/api/speech.ts`：新增管理请求定义。
- `apps/english-world/src/page/englishWorld/utils/pronunciation.ts`：统一单词发音入口。
- `apps/english-world/src/page/englishWorld/learning/`：已有学习会话、听力活动及契约，优先复用。
- `apps/english-world/src/page/englishWorldMobile/`：移动端发音和学习入口。
- `../nestjs/src/interface/speech/`：新增配置存储、供应商适配、缓存和鉴权接口。
- `../nestjs/src/interface/notification/admin-auth.guard.ts`：复用管理员权限。
- `../nestjs/src/app.module.ts`：注册新模块。
- `../nestjs/migrations/`：新增服务端配置、音频及学习记录的迁移，不依赖启动自动改表。

## Tasks & Acceptance

**Execution:**
- [ ] 正式需求：在 `docs/prd/settings/`、`docs/prd/review/` 维护本功能需求并更新入口索引。
- [ ] 服务端 speech 模块：完成秘密存储、受保护的管理接口、豆包官方 API 适配、可恢复错误、去重缓存和配额保护。
- [ ] 管理端 SpeechSettings：完成 Key 管理、音色设置、服务开关、真实连接测试及播放器。
- [ ] pronunciation 入口：桌面和移动单词发音复用服务，明确单词多音/上下文边界。
- [ ] learning 及后端对应模块：接入词条校验、先看词再场景听力填空、提交反馈、同义词按需辨析和持久化复查记录。
- [ ] 测试：覆盖权限、秘密不泄漏、缓存隔离、上游失败、答案隐藏、真实目标词映射和跨端流程。

**Acceptance Criteria:**
- Given 管理员已保存配置，when 刷新设置页，then 能看到启用状态与掩码，不能取回明文。
- Given 词条通过校验，when 完成看词复习，then 下一步进入新场景听力填空，无独立默写步骤。
- Given 音频生成成功，when 播放，then 音频使用完整句子/对话，页面保留空缺且首次提交前不泄漏答案。
- Given 词条或音频存在问题，when 继续学习，then 可恢复或跳过且不污染掌握统计。

## Spec Change Log

## Design Notes

声音好听和发音准确分别验证。依词义和词性生成多音词音频；仅有拼写时不擅自断定唯一读音。AI 负责受约束校验和场景生成，规则负责目标词判定。既有其他学习模式保留，新流程单独接入并逐步验证。

## Verification

- 前端 admin 与 english-world 的类型构建、相关 Vitest 测试。
- 后端类型检查、speech 和学习服务的鉴权/供应商/持久化测试。
- 浏览器验证管理员保存与刷新、真实试听、桌面及移动词语播放、场景 gap 填空与失败恢复。
- 用户 Key 只在安全的本地配置流程中使用，真实联调结果与 mock 测试结果分开报告。

## 2026-10-22 用户补充和执行授权

用户确认DeepSeek校验和场景生成、两家API管理，并明确授权“写PRD，审核，研发，测试，发布”。正式需求以 docs/prd/review/features/ai-listening/prd.md 为准；旧稿仅输入，发布不再重复请求许可。
