# 语境练习 PRD 入口

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

## 覆盖边界与维护

当前状态：已有局部 PRD，模块整体需求尚未确认完整。
模块范围清单只是分类，不新增验收要求，不代表功能已完成或测试已通过。执行测试时必须盘点各来源的全部适用条款、验收标准和决策补充，缺失需求单独报告。
不同功能 PRD 相互补充；只有明确的修订声明才能覆盖旧条款，不能单纯以日期新旧替代。
桌面、移动端和管理端按 PRD 规定纳入该模块；跨模块用例引用同一需求来源并在执行时去重。
新需求在本入口补充或加入 `features/<feature>/prd.md` 并登记上级 `index.json`；不得在交付或历史目录继续维护另一份正文。

[返回全部模块](../README.md)
