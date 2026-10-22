# 后台 AI PRD 测试

用户已选择后台 AI 模式：模块/全量 → AI 读取统一 PRD 生成 Case 和脚本 → 隔离执行/Cloud → AI 分析 → 中文报告。

实现：独立回环 HTTP 控制台与串行队列，不把写测试权限放进业务服务。非交互 Codex 在只读源码副本上设计测试，结构化返回完整允许文件；父进程校验并应用到副本，不覆盖原工作区。确定性执行器负责 Docker、Cypress 和 Cloud。第二次 Codex 调用只读本次证据，分析校验通过后更新报告。保留阶段状态、首次失败与缺口。

已完成：CLI、控制台、持久任务记录、隔离快照、路径/保留校验、调用与失败日志、报告收尾、self-hosted Actions 选项、项目文档/技能入口。离线验证包含路径越界、删除/证据伪升级、未提交源码快照、凭据排除、结构化 provider 和模型失败传播。

实际验证阻塞：2026-10-20 本机 codex-cli 0.161.0 的 ChatGPT 登录状态有效，但真实请求分别拒绝用户配置模型 gpt-6.1-sol、CLI 默认 gpt-5.5、兼容性探测 gpt-5.3-codex，报 model not supported when using Codex with a ChatGPT account。尚未完成后台 AI 真实端到端验证；此前 Cloud run4 属于手动 Codex 闭环，不能作后台 AI 成功证据。

下一步：修复 CLI 账号/可用模型或配置用户选择的 API provider；随后由控制台执行 notes，核对生成文件、真实执行、Cloud URL 与自动分析。全量 PRD 基线缺失仍需保留；GitHub 尚未推送和配置 self-hosted runner/Secrets。

2026-10-20 后续：用户选择 API Key 并授权接入 DeepSeek。已改用独立 env_key provider、requires_openai_auth=false、Responses HTTP（禁用 websocket）；本机专用环境文件 Git 忽略且权限 600，不记录凭据。DeepSeek 模型目录请求 200、真实 deepseek-flash 推理返回项目 9 模块且实际调用只读 shell 成功。20 项离线测试通过，继续运行 notes 端到端。

当前 notes 后台任务：test-results/ai/2026-10-20T09-28-54-864Z-0cf404be，DeepSeek 生成进行中。密钥文件仅本地加载，已验证权限600、Git忽略，实际AI日志/输出检查未发现密钥；最新21项离线测试通过。控制台4319进程仍运行，原服务进程尚未重启加载新增provider状态UI（活跃任务结束后再重启，避免中断）。

## 2026-10-20 卡住排查与恢复

确认旧 Codex/DeepSeek agent 在30分钟内执行516次读取，重复压缩/重新调查后未交付，超时退出。DeepSeek 改成父进程收集 PRD/Case/spec/相关源码的单次 Responses 推理，无 shell 工具循环，每阶段限4分钟，截断显式失败。生成 schema 限定 ai- spec 路径；生成失败亦保留报告。修正源码输出误脱敏（password: string 被替换）的缺陷，密钥仅按已知实际值脱敏。22项离线回归通过。

生成单次93秒完成，但有覆盖既有spec/登记无源码suite的错误，保留原产物，经当前Codex复核生成generate-repaired.json并以--generated-from恢复；PRD来源变更时拒绝恢复。

Run5：12通过/3失败，原始AI分析保留并经实际源码/截图复核修正，确定React受控textarea输入、账号错误反馈等待、复制夹具未准备三个测试问题。
Run6：14通过/1失败，剩余问题是30001字符后textarea高度7951px导致Cypress.clear中心点不可见；只修测试恢复输入操作，不改产品/PRD或放宽断言。
Run7：浏览器15/15、后端8/8，PRD13通过/99待验证，部分基线仍缺失；Cloud https://cloud.cypress.io/projects/hajrxe/runs/7。一个Test Replay上传因低速超时，视频已上传，报告保留限制。最终分析尚在任务内收尾，以job/result状态为准。
最终任务：test-results/ai/2026-10-20T10-09-18-225Z-fca5813a；控制台job fe847052-7f71-4780-9dea-f16a584f81e1。此前排队auth任务因修复重启中断，未声称auth完成。

最终完成：Run7 的 job=completed、result=incomplete、analysisStatus=completed。本地报告 http://127.0.0.1:4319/reports/fe847052-7f71-4780-9dea-f16a584f81e1/report.html 已验证HTTP200；4个spec均返回同一Cloud Run7链接。AI分析已由当前Codex复核统计口径，原始输出保留analysis-original.json/md。测试容器清理完成，控制台已重启加载Cloud直达链接及中文结果状态。
