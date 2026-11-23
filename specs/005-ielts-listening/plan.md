# 雅思听力实施计划

使用 writing-plans 与项目Spec Kit计划流程，按本计划顺序执行；无自动提交。

目标：从AI原创完整材料到音频答题、判分复盘和再练闭环。技术：NestJS/Sequelize/MySQL + React/TypeScript；复用AiServicesService的deepseek/synthesize和现有限额、缓存、身份守卫。

宪法检查：业务来源单一；服务端评分与权限；新表兼容迁移；隔离测试；dirty代码摘要记录；不提交发布。无偏离。

1. 先写 material.spec.ts，验证六题型、地图、限词/计分、答案投影失败测试，再实现material.ts。
2. 新增迁移与IeltsListeningService/Controller/Module。材料文档、音频缓存ID和尝试JSON持久化；行锁与乐观版本控制。写服务/API测试核实生成失败、权限、提交幂等与再练。
3. 新增前端ieltsListening目录，API复用listeningFetch/audioFetch，独立路由和导航；分离题组/地图渲染，播放器和计时，保存/提交快照，结果与历史；先写关键行为测试。
4. 管理端新增原创材料JSON导入与发布/停用面板，沿用管理员身份。材料不可接受任意URL；音频由既有豆包合成。
5. 更新公开听力教程，维护PRD Case与Spec映射，运行对应规则/API/浏览器/Cloud验收、独立审查、缺陷修复；分别报告证据级别。

## 2026-10-29 真实联调修正

单选每题独立选项组，单部分最多10组；多选采用同一问题的两个无序题位。拒绝候选与原因私有持久化，下次准备携带纠错反馈，仍先增加并持久化管理员设置的生成尝试次数。显式更正取最终确认内容；评分键、限词与证据门禁不放宽。真实验收脚本为独立opt-in入口，使用持久保守用量账本，不能通过普通测试重置DB重新取得当日配额。


## 2026-11-04材料多样性

详见[本轮实施计划](../../docs/superpowers/plans/2026-11-04-ielts-listening-diversity.md)，任务T1地图、T2方案与题面、T3串联与查重、T4验证文档。审批来源：当前会话“可以，你自己开发”。
