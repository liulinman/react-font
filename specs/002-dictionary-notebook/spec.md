# Feature Specification: 桌面词库与知识笔记
**Created**: 2026-10-27
**Status**: Ready for implementation
**Input**: 用户确认词典原型，使用已有VitePress实现笔记阅读，正式实现两个模块。

## User Scenarios & Testing
### User Story 1 - 词典查阅 (P1)
搜索/筛选后选择词条，在右侧看完整字段、笔记和来源，直接编辑、发音和学习。测试覆盖AC-01/02/03，详情不折叠，图片失败保留字段。
### User Story 2 - 文档阅读 (P1)
从笔记列表打开完整笔记，用标题目录定位，专注阅读和文件夹切换保留列表范围；编辑保存返回原文。测试覆盖AC-04/05。
### Edge Cases
筛选后所选词不存在自动选当前页首词；编辑草稿留在既有受保护表单。正文无标题、重复标题、长代码/表格、空结果、断网、403/404与版本冲突均保留明确恢复路径。手机号端不应用桌面壳。

## Requirements
FR-001..008 对应正式PRD FR-01..08，语义不变。全部验收逐项映射AC-01..06。保留现有API边界，不把原型假服务带入生产。

## Key Entities
WordList、KnowledgeNote、Folder；无新数据表，无迁移。账号隔离与原文存储不变。

## Success Criteria
SC-001：默认词库无表格，完整字段可读；列表与卡片及批量工具均可达。
SC-002：笔记列表与正文同屏，真实标题目录可用；正常字号、受控行宽。
SC-003：现有功能相关回归不退化，构建和安全渲染检查通过；测试缺口明确保留。

## Assumptions
仅桌面新布局；不授权发布。已有VitePress是Vue静态文档应用，React动态笔记复用其官方vp-doc样式并保留现有安全解析，不对用户数据做静态生成。

## Traceability
PRD: docs/prd/vocabulary/features/dictionary-workspace/prd.md；UI: docs/design/vocabulary/dictionary-workspace/revisions/r02。AC-01→词典组件；AC-02→既有handler联通；AC-03→编辑图片组件；AC-04→桌面笔记工作区与目录；AC-05→既有笔记服务/编辑器；AC-06→主题/桌面/手机与Markdown安全回归。
