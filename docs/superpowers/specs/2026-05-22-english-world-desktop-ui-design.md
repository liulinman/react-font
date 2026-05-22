# English World 桌面端 UI 改版设计

日期：2026-05-22

## 目标

把 `EnglishWorld` 桌面端从默认 Ant Design 表格页改成更紧凑、清爽、适合长期使用的后台工具型界面。保持现有业务逻辑、接口、路由和移动端页面不变。

## 设计方向

- 顶部导航降低高度和阴影，减少大按钮感。
- 页面背景保留浅灰工作台，但主内容间距更克制。
- 筛选区改成紧凑工具栏，避免当前大面积空白。
- 表格区域改成清爽白底工作区，新增按钮放到标题栏右侧。
- 表格 header 使用浅灰底，行高降低，滚动条不再显得突兀。
- 单词列突出可点击性，音标、词性、类型、掌握程度使用统一的低饱和标签。
- 操作列改成图标按钮加轻量文字，降低红蓝文字噪音。

## 范围

修改：

- `apps/english-world/src/page/englishWorld/EnglishWorld.tsx`
- `apps/english-world/src/page/englishWorld/EnglishWorld.css`
- `apps/english-world/src/page/englishWorld/component/EnglishHeader.tsx`
- `apps/english-world/src/page/englishWorld/useColumns.tsx`

不修改：

- 后端接口
- 数据结构
- 移动端页面
- AI 工具、统计页、默写页的业务逻辑

## 验证

- `pnpm --filter @font/english-world test -- --run`
- `pnpm --filter @font/english-world build`
- `pnpm lint`
