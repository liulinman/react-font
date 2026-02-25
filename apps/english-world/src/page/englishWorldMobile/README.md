# EnglishWorld Mobile 移动端页面

这是使用 Ant Design Mobile 实现的移动端单词管理页面，功能与 PC 端的 EnglishWorld 页面相同。

## 安装依赖

在项目根目录运行：

```bash
pnpm add antd-mobile antd-mobile-icons
```

## 功能特性

- ✅ 单词列表展示（卡片式布局）
- ✅ 搜索功能（实时搜索）
- ✅ 筛选功能（类型、掌握程度、中文）
- ✅ 添加单词
- ✅ 编辑单词
- ✅ 删除单词（带确认对话框）
- ✅ 下拉刷新
- ✅ 无限滚动加载更多
- ✅ 移动端优化的 UI/UX

## 路由

访问路径：`/englishWorldMobile`

## 技术实现

- **UI 框架**：Ant Design Mobile 5.x
- **图标**：antd-mobile-icons
- **数据请求**：复用 `@/server/word/word` 中的接口
- **状态管理**：React Hooks + TanStack Query

## 组件说明

- `NavBar`：顶部导航栏
- `SearchBar`：搜索栏
- `PullToRefresh`：下拉刷新
- `InfiniteScroll`：无限滚动
- `Card`：单词卡片
- `Popup`：筛选和编辑弹窗
- `Picker`：选择器组件
- `Form`：表单组件
- `Dialog`：确认对话框
- `Toast`：提示消息

## 样式

样式文件：`EnglishWorldMobile.css`

主要特点：
- 移动端适配的卡片布局
- 响应式设计
- 优化的间距和字体大小
- 圆角和阴影效果

