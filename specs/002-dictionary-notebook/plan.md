# Implementation Plan

Goal：把已批准桌面词典与VitePress式阅读应用到真实服务。
Architecture：新增WordDictionary组件承接现有EnglishWorld数据和handler，替换默认表格但保留卡片与批量；桌面知识页维持真实列表常驻并在右侧复用既有详情/编辑，路径与筛选不变。复用VitePress1.6.4官方vp-doc CSS（保留来源及许可）及React安全Markdown，标题ID和目录共用生成规则。

Tasks：
- [ ] 先写词典选择/全字段与目录/工作区行为测试，确认失败。
- [ ] 实现词典组件并接回所有既有handler，完善弹窗/图片选择。
- [ ] 笔记双区布局、文件夹和专注、真实Markdown目录、VitePress主题。
- [ ] 回归单测、类型构建；维护PRD Cases后隔离Cloud验收与视觉验证。
- [ ] 同步公开文档、归档审查和测试证据，保持未发布。
Constraints：无后端业务改动；保留dirty工作树既有改动；不提交/推送/部署。
