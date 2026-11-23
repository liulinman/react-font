# English World 产品需求唯一入口

前端、后端与 AI 测试共同使用本目录中的 PRD。模块索引为 [index.json](index.json)，阅读入口如下。整理日期：2026-10-28。

## 模块索引

| ID | 模块 | 当前需求状态 |
|---|---|---|
| `auth` | [登录与权限](auth/prd.md) | 已有局部正式 PRD，模块整体基线待补齐 |
| `vocabulary` | [词库与导入](vocabulary/prd.md) | 已有局部 PRD，待确认模块整体完整性 |
| `review` | [学习与复习](review/prd.md) | 已有局部 PRD，待确认模块整体完整性 |
| `context` | [语境练习](context/prd.md) | 已有局部 PRD，待确认模块整体完整性 |
| `reading` | [阅读练习](reading/prd.md) | 已有局部 PRD，待确认模块整体完整性 |
| `intensive-reading` | [精读](intensive-reading/prd.md) | 电脑端方案已确认，待实施验收 |
| `notes` | [知识笔记](notes/prd.md) | 已有局部 PRD，待确认模块整体完整性 |
| `word-books` | [复习册](word-books/prd.md) | 已有局部 PRD，待确认模块整体完整性 |
| `notifications` | [通知与公告](notifications/prd.md) | 已有局部 PRD，待确认模块整体完整性 |
| `settings` | [设置与站点](settings/prd.md) | 已有局部正式 PRD，模块整体基线待补齐 |
| `classroom` | [教师端与课堂](classroom/prd.md) | 首期草案，待确认 |

## 最新跨模块需求

- [教师端课堂与阅读作业](classroom/features/teacher-classroom/prd.md)：独立教师 Web 应用、邀请入班和课堂阅读作业，草案待确认。

- [雅思听力题型与模拟练习](review/features/ielts-listening/prd.md)：四部分场景、六类题型、填空与地图、考试规则及现有资源盘点；已授权审核后研发，尚未上线。

- [管理端产品需求模块](settings/features/prd-browser/prd.md)：管理端独立入口，管理员登录后用 VitePress 浏览正式 PRD，首期桌面只读。

- [AI 词条校验、场景听力与语音服务管理](review/features/ai-listening/prd.md)：DeepSeek 校验与场景生成、豆包发音、管理端双服务配置；主模块 review，关联 vocabulary/context/settings。

## 目录约定

- `<module>/prd.md`：该模块当前入口、适用需求来源和覆盖缺口。
- `<module>/features/<feature>/prd.md`：正式需求正文；同目录保留决策与交互补充。
- `index.json`：稳定模块 ID、功能与主要/关联模块的映射，供后续自动化使用。
- `migration.json`：旧地址、新地址和迁移前摘要，方便追踪。

## 需求与版本规则

1. 新建、修改需求只在本目录维护；版本历史交给 Git。旧地址仅为迁移跳转，不再保留另一份正文。
2. 每个模块可包含多个独立功能的有效 PRD。模块入口必须列全，不能把最新日期的一份局部需求当作整个产品基线。
3. 保留原 FR/AC 编号；引用时增加命名空间，例如 `reading/add-recipients/AC-01`，防止不同 PRD 的 AC-01 混淆。没有原编号的要求后续需先建立来源映射，不能在迁移中擅改原文。
4. 不同功能相互补充；同一条款只有明确记录批准的修订才能覆盖。遇到冲突先记录待决，不擅自选最新文本。
5. `final` 是源文档的需求状态，不等于已实现、已部署或测试通过。模块需求不完整时全量报告必须显示缺口。
6. 当前研发范围为电脑端学生端与管理端，移动端条款仅作历史范围保留；跨模块需求可关联多个模块，Case 以稳定 ID 去重。
7. 设计、架构、实施计划和交付记录仍留在各自目录，通过链接引用本目录；评审稿与源码快照是历史证据，不作为当前需求。

## 测试关联

测试用例继续在 [docs/testing](../testing/README.md) 管理，Case 应引用这里的 PRD 路径及需求编号。后续 AI 测试流程从本索引选择模块，读取其正式需求和决策补充；不能仅扫描已有测试脚本推算需求覆盖。

本次为需求文档治理，不改变实现、测试或上线状态；验收能力以实际执行器和本次运行证据为准。

## 统一格式与历史范围

> 当前研发范围：电脑端学生端与管理端，按本功能实际角色适用。移动端仅作历史范围保留，不纳入当前设计、研发与验收；混合条款中的电脑端、业务及数据保护要求继续有效。历史“后续适配移动端”等计划不再默认启动。

正文按背景目标、角色与端、范围、流程、功能、规则状态、权限异常、非功能、验收、来源决策组织；按实际内容合并章节，不虚构缺失规则。原 FR/AC 编号与后续覆盖修订保留，需求状态不等于研发/验收/部署状态。

整理核对与缺口见 [维护记录](maintenance/2026-10-28-prd-unification.md)，该记录不是另一份产品需求。
