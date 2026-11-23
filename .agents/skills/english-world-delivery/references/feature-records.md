# 为管理端“功能全流程”保留结构化资料

实际业务交付使用本约定；仅编辑skill时不创建功能记录。本规范是后续管理端读取接口的数据契约方向，目前不代表后端接口、数据库导入或页面已经实现。

## 关系与唯一来源

- **Feature（功能）**：稳定 `featureId=<module>/<feature>`，模块与功能分类复用 `docs/prd/index.json`，不另建不一致的产品分类。
- **Change（一次变更/交付）**：独立 `changeId`，归属一个主feature，可关联其他feature；同一功能可以多次变更。保存原始需求、当前阶段、上游依据和全部产物入口。
- **Artifact（阶段产物版本）**：PRD、Spec、设计说明、原型、原型图、实施计划、代码审查、UI验收和报告等。每个版本有稳定artifactId、类型、位置、实际版本/摘要及上游引用。
- **Approval（确认）**：明确关联被确认artifactId及版本/摘要、确认来源、时间和范围；没有真实确认时为空或待确认，不从final字段、文件存在或测试全绿推断用户批准。
- **TestRun（一次测试运行）**：独立runId，与change和当次PRD/Spec/设计/代码版本绑定。保留首次失败、修复和重跑关系，Cloud URL和归档链接属于该次运行。
- **TraceLink（逐条追踪）**：PRD子条款→设计状态→Spec场景→Case→suite/test→本次结果。由现有 `traceability.json` 或支持的执行器格式承载，交付索引只引用不重复维护全表。

关系：Feature 1:N Change；Change 1:N Artifact版本/Approval/TestRun；TestRun引用冻结Artifact版本与逐条追踪数据。后续管理端据此呈现时间线、版本、阶段状态、证据与缺口。

## 文件与机器入口

| 数据职责 | 默认文件 | 内容边界 |
|---|---|---|
| 正式产品分类与PRD入口 | `docs/prd/index.json` | 继续作为现有业务索引，不塞测试日志或设计二进制 |
| 全局交付目录 | `docs/delivery/index.json` | schemaVersion、featureId、changeId、delivery.json相对路径；跨功能查找入口 |
| 单次交付的结构化主记录 | `docs/delivery/<change-folder>/delivery.json` | 需求入口、阶段、artifact引用、确认及run引用 |
| 单次交付的可读入口 | 同目录 `delivery.md` | 对delivery.json和实际证据的可读导航；状态变化时同步，冲突先核对实际证据，不静默选一份 |
| 原始需求 | 同目录 `request.md` | 人类输入与范围，不复制正式PRD |
| 逐条需求/规格/Case映射 | Spec目录的 `traceability.json` 或真实支持的等价格式 | 引用已有Case ID与绑定，避免平行Case库 |
| 单次执行 | 实际run目录的 `run-manifest.json` 或执行器等价清单 | 冻结版本、结果、分析、截图、Cloud及归档状态 |

`change-folder`优先复用本轮已有目录；新建时为 `<日期>-<feature>-<本轮唯一后缀>`，不覆盖同日同功能的旧交付。现有目录不用为了命名规范搬迁，直接登记其实际位置。

机器入口承载引用，不复制PRD正文或Cypress完整结果。`delivery.json`是流程元数据主记录，`traceability.json`是逐条追踪来源，run清单与原始执行结果是该次测试来源；summary只能从实际来源归纳，不能替换证据。更新按先写产物/验证→原子更新索引的顺序，避免索引先宣布尚不存在的文件。

## 主记录的最少字段

字段是本skill约定，不是现有执行器已支持的声明。实际生成时用真实值；暂缺记录null及pending/blocked原因，不填假时间、假hash或假URL。

- `schemaVersion`：记录格式版本，便于未来管理端兼容升级。
- `featureId`、`relatedFeatureIds`、`changeId`、`title`、`createdAt`、`updatedAt`。
- `requestRef`、`scope`、`authorization`：输入、端/角色和本轮允许阶段，不存私人聊天全文或凭据。
- `stages[]`：稳定stageId、`pending/running/passed/failed/blocked/skipped`、实际开始/结束时间、原因、artifactIds与runIds；UI不适用必须有理由，不能消失。
- `artifacts[]`：`artifactId`、`type`、`revision`、`locator`、`sha256`或经核实的外部versionId、`derivedFrom[]`、`createdAt`、`state`。源码SHA与文件内容摘要分开标，未提交版本不可冒称HEAD。
- `approvals[]`：artifactId、被确认版本/摘要、时间、确认来源引用、批准范围及未决点；不存token、Cookie等秘密。
- `runRefs[]`：runId、manifest位置、重跑关联；状态、覆盖、Cloud/归档摘要必须核对run本体，不能另造相矛盾结果。
- `traceabilityRef`、`codeVersions`（前后端分别记录）、`blockers`、`nextActions`。

阶段建议固定为 `prd`、`ui-design`、`spec`、`implementation`、`verification`、`analysis`、`cloud`、`archive`、`release`；需要时用substage细化，不随每轮文案改stageId。未授权发布为skipped并说明未授权，不伪装“整条已上线”。

Artifact类型使用明确枚举名称，如 `prd/spec/ui-design/prototype/prototype-screenshot/plan/tasks/code-review/ui-review/test-report/ai-analysis`；原型截图和实现验收截图不能混用。实际截图、日志和视频由run证据索引引用，页面应能显示哪次设计、哪次实现/测试。

## 路径与版本

`locator`必须明确类型：

- 仓库文件：`kind=repo-file`、`repository=react-font|nestjs`、仓库相对 `path`、有效commit或dirty内容摘要。
- 运行文件：`kind=run-file`、runId、相对该run目录的path、内容摘要；跨机归档时通过run的archive locator解析。
- 外部设计/Cloud/归档：`kind=external`、实际URL与可核实versionId/状态，不把临时本机localhost当持久外链。

默认以相对路径持久化，避免将某人的 `/Users/...` 绝对路径作为管理端唯一定位方式。给当前用户文件链接时可以解析为当前机器绝对路径；远端页面通过受保护接口或有权限的归档链接读取，不能直接把客户端本地文件路径当服务器文件。

批准后的设计版本和测试冻结输入应可回读：用已提交Git版本、固定设计工具版本或未提交时的独立快照。版本改变生成新revision/记录并关联前版，不覆写唯一的批准稿；回滚和失败证据保留。没有提交授权不自行commit，明确当前持久化范围。

## 可读取性与保护

每次阶段完成及交付前，核对索引、关联ID、文件存在与摘要、实际Cloud URL、权限及归档状态；缺失/过期/无法访问明确标注。出现来源变化使旧Spec或Case过期时保留其历史证据和影响记录，不把历史本来通过的run改成失败，也不把它沿用为新版本已验。

PRD、Spec、原型及内部测试资料默认私有。后续管理端需要后端管理员鉴权、路径白名单和脱敏；不能直接公开仓库根、原始日志、带凭据的浏览器存储或产物目录。Cloud只用于获准的合成数据测试记录，不能因为建立索引就把内部需求上传。

这些JSON是文件型交付资料；后续可经后端导入数据库或作为只读数据源。schema校验、自动采集、管理端全流程页面属于后续实现任务，不能仅因skill要求写文件就称平台已接通。
