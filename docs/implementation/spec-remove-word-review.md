---
title: 取消独立单词复习入口
type: chore
created: 2026-10-23
status: done
baseline_commit: 44512bb
context: []
---
<frozen-after-approval>
## Intent
用户确认直接取消截图中的独立单词复习功能入口，不改名，不增加替代菜单。场景听力保留。
## Boundaries & Constraints
不删除词库、历史学习数据或后台接口；不变更现有手机原生复习流程。桌面旧地址安全跳到场景听力，不自动生成收费内容。
</frozen-after-approval>
## Code Map
EnglishHeader.tsx 为侧栏；navigation.ts 为导航兼容；router.tsx 为旧地址兼容；Login.tsx 为默认登录目的地。
## Tasks & Acceptance
- [x] 删除单词复习菜单，保留其他菜单。
- [x] 桌面 recite/ielts-core 旧地址跳转场景听力；默认登录不再进入已取消页面。
- [x] 更新正式需求与回归验证、构建、发布证据。
Given 桌面侧栏，when 展开学习，then 不显示单词复习，场景听力仍可访问。
Given 旧桌面复习链接，when 访问，then 跳转场景听力并正常受登录保护。
Given 历史数据，when 更新前端，then 不调用删除接口、不迁移数据。
## Verification
定向导航、路由、登录测试及学生端生产构建；发布保留后台与后端镜像。

## Suggested Review Order
- 菜单删除： [EnglishHeader.tsx](../../apps/english-world/src/page/englishWorld/component/EnglishHeader.tsx#L35)
- 兼容旧地址： [router.tsx](../../apps/english-world/src/router/router.tsx#L142)
- 回归证据见工作区 docs/remove-word-review，23项通过，生产已核验。
