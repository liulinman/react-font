# 阅读练习 PRD 入口

## 正式功能目录（与索引同步）

> 当前研发范围：电脑端学生端与管理端，按本功能实际角色适用。移动端仅作历史范围保留，不纳入当前设计、研发与验收；混合条款中的电脑端、业务及数据保护要求继续有效。历史“后续适配移动端”等计划不再默认启动。

### 主要功能

- [已发布阅读练习追加接收人](features/add-recipients/prd.md)（`reading/add-recipients`）
- [阅读练习完成情况与成绩分析](features/analytics/prd.md)（`reading/analytics`）
- [统一阅读工作区与体验整改](features/unified-workspace/prd.md)（`reading/unified-workspace`）
- [学生练习列表移除与恢复](features/personal-removal/prd.md)（`reading/personal-removal`）
- [阅读练习句子填空](features/sentence-completion/prd.md)（`reading/sentence-completion`）
- [AI 检查并修复与问题定位](features/ai-review-repair/prd.md)（`reading/ai-review-repair`）
- [收到练习使用雅思工作区](features/received-ielts-workspace/prd.md)（`reading/received-ielts-workspace`）
- [管理员永久删除阅读练习](features/permanent-deletion/prd.md)（`reading/permanent-deletion`）
- [Web材料自动处理与集中审核](features/automatic-review/prd.md)（`reading/automatic-review`）
- [Web新建练习界面](features/creation-ui/prd.md)（`reading/creation-ui`）

### 跨模块关联

- [教师端课堂与阅读作业](../classroom/features/teacher-classroom/prd.md)（`classroom/teacher-classroom`，草案）


模块 ID：`reading`。范围：管理员导入、编辑、审核、发布、接收人、学生作答、解析和成绩分析。

## 当前需求来源

- [已发布阅读练习追加接收人](features/add-recipients/prd.md)（需求命名空间：`reading/add-recipients`）。
- [阅读练习完成情况与成绩分析](features/analytics/prd.md)（需求命名空间：`reading/analytics`）。

- [学生练习列表移除与恢复](features/personal-removal/prd.md)（`reading/personal-removal`，2026-10-20 用户确认）。

- [阅读练习句子填空](features/sentence-completion/prd.md)（`reading/sentence-completion`，2026-10-21 用户截图确认）。

- [AI 检查并修复与问题定位](features/ai-review-repair/prd.md)（`reading/ai-review-repair`，2026-10-21 用户批准）。

- [收到练习使用雅思工作区](features/received-ielts-workspace/prd.md)（`reading/received-ielts-workspace`，2026-10-21 用户截图要求替换）。

- [管理员永久删除](features/permanent-deletion/prd.md)（`reading/permanent-deletion`，2026-10-22 用户批准）。

- [Web材料自动处理与集中审核](features/automatic-review/prd.md)（`reading/automatic-review`，2026-10-22 用户确认仅Web端）。

- [Web新建练习界面](features/creation-ui/prd.md)（`reading/creation-ui`，2026-10-22 用户批准）。

## 设计参考

下列设计作为补充线索，不代表已经形成完整 PRD：

- [2026-10-12-shared-ai-reading-practice-design.md](../../superpowers/specs/2026-10-12-shared-ai-reading-practice-design.md)

## 本次用户确认的补充

- [统一阅读工作区与体验整改](features/unified-workspace/prd.md)（`reading/unified-workspace`，2026-10-20 用户确认）。
- 2026-11-11 用户确认电脑端「阅读练习」改用侧栏并列子菜单，见同功能 AC-11、AC-12。

## 覆盖边界与维护

当前状态：已有局部 PRD，模块整体需求尚未确认完整。
模块范围清单只是分类，不新增验收要求，不代表功能已完成或测试已通过。执行测试时必须盘点各来源的全部适用条款、验收标准和决策补充，缺失需求单独报告。
不同功能 PRD 相互补充；只有明确的修订声明才能覆盖旧条款，不能单纯以日期新旧替代。
当前研发仅电脑端学生端与管理端；移动端原需求仅属历史范围，不纳入当前验收；跨模块用例引用同一需求来源并在执行时去重。
新需求在本入口补充或加入 `features/<feature>/prd.md` 并登记上级 `index.json`；不得在交付或历史目录继续维护另一份正文。

[返回全部模块](../README.md)

## 2026-11-03 审核阻断恢复补充

[Web材料自动处理与集中审核](features/automatic-review/prd.md)新增FR09–12/AC09–11：同源判断题契约、原稿文字核实、重检去重和明确处理出口。
