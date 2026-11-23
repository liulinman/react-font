# 产物位置与流程追溯

实际项目交付开始时读取。以下路径相对实际 `react-font/`；已有功能采用其他正式目录时保留原址，在索引中登记，不为统一目录复制一份需求。

## 固定归属

| 产物 | 默认位置 | 必须记录的内容 |
|---|---|---|
| 正式PRD与决策补充 | `docs/prd/<module>/features/<feature>/prd.md` 及同目录补充 | 原FR/AC、来源路径、版本/摘要、批准依据 |
| UI交互说明 | `docs/design/<module>/<feature>/design.md` | 角色流程、页面状态、PRD引用、设计版本和确认记录 |
| 可点击原型 | 同一设计目录 `prototype/` 或获准设计工具的固定版本链接 | 可复现打开/运行方法、依赖与设计版本，不能只留下本机临时URL |
| 原型图/状态截图 | 同一设计目录 `revisions/<design-revision>/screenshots/` | 角色、页面、状态、视口；明确这是设计原型图，不是实现验收截图 |
| 已确认原型版本 | 同一设计目录 `revisions/<design-revision>/` 或固定Git/设计工具版本 | 批准的原型与设计依据；未提交且将被改动时保留快照，不能覆盖唯一批准版本 |
| Spec及实施计划 | `specs/<编号>-<feature>/spec.md`、`plan.md`、`tasks.md`、质量清单 | 关联PRD/设计路径、版本/摘要及场景ID |
| 逐条追踪关系 | 同一Spec目录 `traceability.json` | PRD子条款→设计状态→Spec场景→Case→suite/test |
| 自动化Case与套件目录 | `docs/testing/cases/<module>/<feature>.json`、`docs/testing/suites.json` | 稳定Case ID、具体断言及真实精确绑定；脚本沿现有源码目录 |
| 本次测试与实现截图 | `test-results/prd/<run-id>/` 或后台 `test-results/ai/<job-id>/` 内实际运行目录 | 冻结来源、执行结果、截图/日志、HTML报告、AI分析、受测版本；用实际输出索引，不伪造嵌套路径 |
| UI验收记录 | 本轮交付目录 `ui-review.md` | 批准设计与实现对照，链接本次真实浏览器截图及复验 |
| 本轮总入口 | `docs/delivery/<日期>-<feature>/delivery.md` | PRD、Spec、原型、原型图、代码版本、所有run、Cloud和归档的可点击链接 |
| 结构化本轮记录 | 同目录 `delivery.json` | feature/change、阶段、产物版本、确认与run引用，格式见功能流程数据规范 |
| 持久机器索引 | `docs/delivery/index.json` 或可兼容的已有等价机器索引 | featureId/changeId及真实delivery.json路径，便于管理端读取 |
| 可读全局索引 | `docs/delivery/index.md`（如项目需要） | 从机器索引整理的导航，不作为另一套流程状态来源 |

Cloud run URL也必须回写本轮delivery与运行清单；项目主页不能代替本次链接。完整运行包按本轮归档要求保留，远端上传与保留期限单独核实。不要把受Git忽略的临时路径或Cloud短期媒体当永久档案。

## 共用标识和相互链接

- 使用稳定 `featureId=<module>/<feature>`。一次需求修订/交付有自己的 `changeId`，一次执行有独立 `runId`；同一功能多次迭代不能只靠同名目录区分。
- PRD维持产品来源；设计说明引用PRD，Spec引用PRD与确认设计，Case/追踪文件引用Spec场景及原FR/AC，运行清单绑定实际输入，delivery将所有产物连在一起。
- 每份产物在元信息或明确的来源章节记录feature/change、上游路径与版本/摘要。链接能打开且内容对应才算已关联；自造hash不能证明来源。
- 业务代码仍在前后端各自仓库。记录两个SHA；未提交时保留dirty和实际补丁/文件摘要，不以HEAD冒称全部受测代码。
- 正式来源用Git追踪，提交受当前授权限制。尚未获准提交时保留版本/快照索引并标未提交，不能为了追溯自行commit/push。

## 每次交付的硬要求

实际产生的PRD、Spec、设计说明、原型图/原型、Case和运行结果必须有归属和索引；没有产物的阶段标 `pending/blocked/skipped`及原因，禁止创建空文件冒充完成。原型截图与实现测试截图分开保留，文件名说明页面、状态和视口，不能互相顶替。

每次实际测试维护 `run-manifest.json`（执行器已有等价清单则直接复用并补索引）：来源快照、设计版本、代码版本、追踪映射、结果、AI分析、Cloud URL和归档位置。执行器不支持自动生成时由本轮编排补侧车并核对，明确哪些检查是人工完成。

重跑新建run，已批准设计或被执行器冻结的输入不被“最新文件”覆盖。来源改变时记录哪些旧证据失效；首次失败、修复和重跑保持关联。未获长期存储授权时不承诺永久留存；用户要求长期归档时未验证上传则不得称该阶段完成。

交付前打开索引中的本地文件，核实远端可访问/有权限及本次run状态。只写路径但文件不存在，不算留存完成。所有内部材料遵守项目私有产物边界，不复制到公开docs/admin静态目录。

为后续管理端读取时，遵守 [功能流程数据规范](feature-records.md) 的实体关系、最少字段、仓库相对路径和权限要求。
