# 只读交付产线实施计划

Goal: 管理员能追溯真实产物。沿用PRD私有静态资源保护，构建时归档，不加数据库。

- [x] 1. 先写归档测试，验证分类、用例、历史、过期及路径保护；实现 scripts/delivery-pipeline/build.mjs，挂接 prd:sync/check。
- [x] 2. 先写交互测试；新增 DeliveryPipelinePanel，接入原 ProductRequirementsPanel，复用CSS与Ant Design。
- [x] 3. 验证受保护JSON/图片权限、管理端构建与浏览器关键路径；同步公开文档与交付证据。

现有大量未提交改动保持原位，仅修改本功能文件；不自动创建提交或发布。
