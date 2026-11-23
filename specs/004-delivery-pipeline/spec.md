# 管理端只读交付产线

Feature: settings/prd-browser；Change: 2026-10-28-delivery-pipeline
来源：docs/prd/settings/features/prd-browser/prd.md FR-06—09、AC-06—10；docs/design/settings/prd-browser/design.md。用户已确认范围与布局。

## 场景
- US1：管理员按模块/功能查看 PRD → Spec 正文 → Case → 结果；缺失分别显示。
- US2：选择历史运行，阅读当次逐条状态、失败原因、分析、截图和 Cloud，首次失败不覆盖。
- US3：比较冻结摘要与现有来源；需求变化标过期，缺摘要标无法核对。保留受测前后端commit及dirty。mock/draft/未执行不得提升通过。
- US4：私有归档只导出受控数据，所有资源使用已有AdminAuthGuard与no-store。非法路径、符号链接、非白名单文件拒绝。
- US5：加载、错误、重试、无匹配功能、登录失效可恢复；原全文搜索阅读器保留。

## 数据契约
构建时读取正式PRD索引、delivery索引、仅spec类型artifact、现有Case及逐条result。生成后端专属pipeline.generated.json，随私有站点构建复制为pipeline.json；仅引用的PNG截图进入私有证据目录。所有字段取明确白名单，不复制原始日志/HTML报告。归档不是实时执行器，不增加写API。

## 边界
Spec正文仅取已登记spec.md，不展示计划或任务。历史运行缺档显示缺失，不猜测通过。当前版本校验以实际摘要为准；缺Spec绑定明确说明，不能宣称完整双来源验收。仅本地实现，不自动提交/推送/部署。
