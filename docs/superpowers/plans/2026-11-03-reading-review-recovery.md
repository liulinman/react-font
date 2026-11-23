# 阅读审核可恢复处理 Implementation Plan

**Goal:** 经老师核对原稿可解决误报，真实缺材料继续拦截。
**Architecture:** 后端集中分类和内容/来源绑定；管理端专用核对表单，既有检查/发布契约沿用。
**Tech Stack:** NestJS、Sequelize、React、Ant Design。
**Spec:** 工作区 docs/reading-review-recovery-20261103/spec-reading-review-recovery.md。

## Global Constraints
原稿与答案不擅改；不代发布真实练习；保留其他未提交工作；生产基于即时源增量。
## Review Focus
真实缺页混合OCR不得降级；旧来源提示不得因模型遗漏丢失；确认不得跨修改复用；并发检查不得复活旧确认；补充来源须实际可读。

### Task 1 后端恢复契约
- [x] 先测试误分类/真缺页/重复/失效/陈旧/不可读等失败场景。
- [x] 新增review issues helper，接入workflow确认与重检、getForAdmin归一化、controller及prompt。
- [x] 定向测试及编译，补真实SQL HTTP覆盖。
### Task 2 管理端处理路径
- [x] 先测试来源核对必填、绑定请求和成功刷新、缺材料仅补充。
- [x] 新增ReadingSourceIssueReview.tsx，工作台按类型呈现处理入口及底部原因。
- [x] 组件测试、生产构建、浏览器核对→最终发布确认→取消/发布流程。
### Task 3 交付
- [x] 同步正式条款/决策和公开文章，构建及预览。
- [x] 独立审查，修复并复验。
- [x] 即时生产备份、增量构建、部署、只读冒烟及用户页面可用性，记录证据和回滚。
