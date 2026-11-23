# 学习与复习 PRD 入口

## 正式功能目录（与索引同步）

> 当前研发范围：电脑端学生端与管理端，按本功能实际角色适用。移动端仅作历史范围保留，不纳入当前设计、研发与验收；混合条款中的电脑端、业务及数据保护要求继续有效。历史“后续适配移动端”等计划不再默认启动。

### 主要功能

- [薄弱词语境修复闭环](features/weak-word-repair/prd.md)（`review/weak-word-repair`）
- [可解释词汇掌握轨迹](features/word-journey/prd.md)（`review/word-journey`）
- [AI 词条校验、场景听力与语音服务管理](features/ai-listening/prd.md)（`review/ai-listening`）

### 跨模块关联

- [笔记统一阅读展示](../notes/features/readable-notes/prd.md)（`notes/readable-notes`，只维护一份正文）
- [电脑端学习导航精简与名称统一](../settings/features/desktop-learning-nav/prd.md)（`settings/desktop-learning-nav`，只维护一份正文）


模块 ID：`review`。范围：今日复习、学习会话、提交恢复、薄弱词和记忆地图。

## 当前需求来源

- [薄弱词语境修复闭环](features/weak-word-repair/prd.md)（需求命名空间：`review/weak-word-repair`）。
- [可解释词汇掌握轨迹](features/word-journey/prd.md)（需求命名空间：`review/word-journey`）。

## 设计参考

下列设计作为补充线索，不代表已经形成完整 PRD：

- [2026-06-26-recite-short-review-loop-design.md](../../superpowers/specs/2026-06-26-recite-short-review-loop-design.md)


- [AI 词条校验、场景听力与语音服务管理](features/ai-listening/prd.md)（`review/ai-listening`，2026-10-22 用户确认；含管理员双服务管理、桌面与移动学习）。

## 覆盖边界与维护

当前状态：已有局部 PRD，模块整体需求尚未确认完整。
模块范围清单只是分类，不新增验收要求，不代表功能已完成或测试已通过。执行测试时必须盘点各来源的全部适用条款、验收标准和决策补充，缺失需求单独报告。
不同功能 PRD 相互补充；只有明确的修订声明才能覆盖旧条款，不能单纯以日期新旧替代。
当前研发仅电脑端学生端与管理端；移动端原需求仅属历史范围，不纳入当前验收；跨模块用例引用同一需求来源并在执行时去重。
新需求在本入口补充或加入 `features/<feature>/prd.md` 并登记上级 `index.json`；不得在交付或历史目录继续维护另一份正文。

- [雅思听力题型与模拟练习](features/ielts-listening/prd.md)（`review/ielts-listening`，电脑端、AI原创、六题型与单部分/全套模拟；已授权研发，尚未上线）

[返回全部模块](../README.md)

- 2026-11-04雅思听力新增FR17–20/AC15–18：按Part变化题组、地图事实多样性及本人近期避重，用户批准研发；实现、验收与上线分别取证。
