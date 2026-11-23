# 语境练习 PRD 入口

## 正式功能目录（与索引同步）

> 当前研发范围：电脑端学生端与管理端，按本功能实际角色适用。移动端仅作历史范围保留，不纳入当前设计、研发与验收；混合条款中的电脑端、业务及数据保护要求继续有效。历史“后续适配移动端”等计划不再默认启动。

### 主要功能

尚无主归属功能正文；下列关联需求不能替代完整模块基线。

### 跨模块关联

- [薄弱词语境修复闭环](../review/features/weak-word-repair/prd.md)（`review/weak-word-repair`，只维护一份正文）
- [可解释词汇掌握轨迹](../review/features/word-journey/prd.md)（`review/word-journey`，只维护一份正文）
- [统一阅读工作区与体验整改](../reading/features/unified-workspace/prd.md)（`reading/unified-workspace`，只维护一份正文）
- [收到练习使用雅思工作区](../reading/features/received-ielts-workspace/prd.md)（`reading/received-ielts-workspace`，只维护一份正文）
- [AI 词条校验、场景听力与语音服务管理](../review/features/ai-listening/prd.md)（`review/ai-listening`，只维护一份正文）


模块 ID：`context`。范围：Context Lab 生成、作答、历史和 IELTS 语境题型。

## 当前需求来源

尚未找到本模块独立的正式 PRD；不得根据页面或已有测试推定完整需求。

## 跨模块需求

- [薄弱词语境修复闭环](../review/features/weak-word-repair/prd.md)，主要归属 `review`；选择本模块时也需检查相关验收项。
- [可解释词汇掌握轨迹](../review/features/word-journey/prd.md)，主要归属 `review`；选择本模块时也需检查相关验收项。

## 设计参考

下列设计作为补充线索，不代表已经形成完整 PRD：

- [2026-06-22-context-lab-learning-loop-mvp-design.md](../../superpowers/specs/2026-06-22-context-lab-learning-loop-mvp-design.md)
- [2026-07-30-context-lab-mixed-ielts-question-types-design.md](../../superpowers/specs/2026-07-30-context-lab-mixed-ielts-question-types-design.md)

## 本次用户确认的补充

- [统一阅读工作区与体验整改](../reading/features/unified-workspace/prd.md)（`reading/unified-workspace`，2026-10-20 用户确认）。


- [AI 词条校验、场景听力与语音服务管理](../review/features/ai-listening/prd.md)（`review/ai-listening`，2026-10-22 用户确认；含管理员双服务管理、桌面与移动学习）。

## 覆盖边界与维护

当前状态：已有局部 PRD，模块整体需求尚未确认完整。
模块范围清单只是分类，不新增验收要求，不代表功能已完成或测试已通过。执行测试时必须盘点各来源的全部适用条款、验收标准和决策补充，缺失需求单独报告。
不同功能 PRD 相互补充；只有明确的修订声明才能覆盖旧条款，不能单纯以日期新旧替代。
当前研发仅电脑端学生端与管理端；移动端原需求仅属历史范围，不纳入当前验收；跨模块用例引用同一需求来源并在执行时去重。
新需求在本入口补充或加入 `features/<feature>/prd.md` 并登记上级 `index.json`；不得在交付或历史目录继续维护另一份正文。

[返回全部模块](../README.md)
