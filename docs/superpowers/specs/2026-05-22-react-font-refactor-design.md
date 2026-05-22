# React Font 重构设计

日期：2026-05-22

## 范围

本文档描述 `react-font` monorepo 第一阶段重构设计。目标是在不改变用户可见行为的前提下，让项目更容易维护和继续迭代。

包含内容：

- 修复当前 lint 失败项，恢复可用的质量基线。
- 明确 API 目标地址配置，让本地开发环境更稳定。
- 重构 `english-world` 的单词管理功能，避免页面组件继续同时负责请求编排、筛选参数转换、增删改流程和统计数据转换。
- 保持桌面端和移动端现有 UI 行为兼容。

不包含内容：

- 大规模视觉改版。
- 后端 API 变更。
- 数据库变更。
- 全面包体优化，除非清晰边界自然带来一部分优化。
- 大改 `web-utils` 页面；只处理通过 lint 所需的最小行为等价修改。

## 当前问题

项目可以构建，但维护成本偏高。

- `apps/english-world/src/page/englishWorld/EnglishWorld.tsx` 同时混合了路由状态、筛选、分页、CRUD 请求、弹窗状态和表格渲染。
- `apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.tsx` 超过 1,200 行，并且重复了桌面端的单词业务流程。
- AI 和练习 tab 把流式解析和 UI 渲染写在同一个组件里。
- API 目标地址选择不够明确。开发环境使用 `/api`，再由 Vite 代理到后端。`localhost` 在多个本地服务同时监听时可能解析到错误服务，因此代理目标应使用 `127.0.0.1`。
- `pnpm lint` 当前在 `web-utils` 中失败。
- README 仍是 Vite 模板文档，没有描述当前 monorepo。

## 架构

第一阶段在保留现有应用结构的基础上，为 `english-world` 引入 feature 级边界。

建议目录：

```text
apps/english-world/src/page/englishWorld/
  EnglishWorld.tsx
  component/
  hooks/
    useWordList.ts
    useWordMutations.ts
    useWordStats.ts
  utils/
    wordFilters.ts
    wordLabels.ts
```

现有 `server/*` 模块继续作为请求描述模块存在，不承担 UI 状态职责。hooks 位于请求描述和页面组件之间，负责页面需要的业务编排。

`packages/api` 继续作为共享请求层。API base URL 行为应明确：

- 开发环境默认：`/api`
- Vite 代理目标默认：`http://127.0.0.1:3000`
- 生产或远程地址覆盖：`VITE_API_BASE_URL`

## 组件与模块

### 单词列表 Hook

`useWordList` 负责：

- `wordList`
- `loading`
- `page`
- `pageSize`
- `total`
- 当前筛选条件
- `fetchWordData`
- 查询、重置、分页变更等辅助函数

组件把 UI 表单值传给筛选参数转换工具，而不是在组件里手动拼接和删除临时对象字段。

### 单词变更 Hook

`useWordMutations` 负责：

- 新增
- 编辑
- 删除
- 是否已存在检查
- 变更成功后的列表刷新

hook 暴露命令式函数。桌面端可以使用 Ant Design 的 `message` 和 `Modal`，移动端可以使用 `Toast` 和 `Dialog`。UI 反馈留在调用方或很薄的适配层里，避免 hook 同时依赖桌面端和移动端组件库。

### 单词统计 Hook

`useWordStats` 负责：

- 当前选择的掌握程度
- 汇总统计
- 每日统计
- 词性统计
- loading 状态
- API 记录到图表可用数组的转换

图表 option 对象应尽量靠近图表组件本身，只有共享计算逻辑才抽出去。

### 筛选与标签工具

`wordFilters.ts` 负责：

- 日期范围转换为 `startTime` 和 `endTime`
- 移除空值
- 桌面端和移动端筛选参数归一化

`wordLabels.ts` 负责：

- 类型标签
- 掌握程度标签
- 词性标签和颜色

这些工具应保持为纯函数。如果测试配置能顺利使用，就为它们补聚焦测试；如果测试配置阻塞进度，先保证实现便于后续补测试。

## 数据流

1. 页面渲染 UI 控件并读取表单状态。
2. 表单状态由 `wordFilters.ts` 归一化。
3. `useWordList` 通过 `@font/api` 调用 `wordFilter`。
4. 变更操作使用 `wordAdd`、`wordUpdate`、`wordDel` 和 `wordExist`。
5. 变更成功后，hook 使用当前筛选条件刷新当前列表。
6. 组件渲染 hook 返回的状态。

本阶段不改变后端 payload 结构。

## 错误处理

共享 Axios 拦截器继续负责全局请求错误提示。feature hooks 应做到：

- 在 `finally` 中恢复 loading 状态。
- 向调用方返回有用的成功或失败结果。
- 避免全局错误提示和局部错误提示重复刷屏。
- 保留当前用户可见的成功提示。

本地开发代理问题通过把 Vite proxy 目标从 `localhost` 改成 `127.0.0.1` 修复。

## 测试与验证

本阶段必须验证：

- `pnpm --filter @font/english-world build`
- `pnpm --filter @font/web-utils build`
- `pnpm lint`

当前已知问题：

- `pnpm lint` 在本阶段开始前会因为 `web-utils` 的既有问题失败。只有修复这些错误，或用户明确把它们排除在范围外，本阶段才算完成。

手动冒烟检查：

- 登录可以通过本地 Vite 代理正常工作。
- 桌面端单词列表可以加载、筛选、分页、新增、编辑、删除。
- 移动端单词列表可以加载、搜索、筛选、新增、编辑、删除、加载更多。
- 统计视图仍能渲染数据。
- AI 工具 tab 仍能渲染。

## 实施顺序

1. 修复 Vite 代理目标和 API base URL 配置。
2. 在不改变行为的前提下修复当前 `web-utils` lint 失败项。
3. 新增 `wordFilters` 和 `wordLabels` 工具。
4. 从桌面端行为中抽出 `useWordList`。
5. 抽出单词变更辅助逻辑，并把桌面页面接入这些逻辑。
6. 在移动端页面复用共享工具，同时保持移动端 UI 不变。
7. 运行 build 和 lint 验证。

## 风险

- 桌面端和移动端流程相似但不完全相同。只有实际行为一致的逻辑才应共享。
- `@font/api` 中 React Query mutation 类型是自定义封装，修改时应保持保守。
- 项目自动化测试较少，所以重构后仍需要手动冒烟检查。
