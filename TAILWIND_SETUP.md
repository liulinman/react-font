# Tailwind CSS 配置说明

## ✅ 已完成的配置

1. ✅ 安装了 Tailwind CSS 及其依赖
2. ✅ 创建了 `tailwind.config.ts` 配置文件
3. ✅ 创建了 `postcss.config.mjs` 配置文件
4. ✅ 在 `src/index.css` 中引入了 Tailwind 指令
5. ✅ 配置了与 antd 的兼容性（`preflight: false`）

## 🎨 使用方法

### 基本用法

在组件中直接使用 Tailwind 的类名：

```tsx
// 示例：使用 Tailwind 类名
<div className="p-4 bg-blue-500 text-white rounded-lg">
  <h1 className="text-2xl font-bold mb-4">标题</h1>
  <p className="text-gray-200">内容</p>
</div>
```

### 与 antd 组件结合使用

Tailwind CSS 和 antd 可以完美共存：

```tsx
import { Button } from "antd";

// 在 antd 组件上使用 Tailwind 类名
<Button className="mt-4 px-6 py-2">
  按钮
</Button>

// 或者混合使用
<div className="flex gap-4 p-4">
  <Button>按钮1</Button>
  <Button>按钮2</Button>
</div>
```

### 常用 Tailwind 类名示例

#### 布局

- `flex` - flexbox 布局
- `grid` - grid 布局
- `gap-4` - 间距
- `p-4` - 内边距
- `m-4` - 外边距

#### 颜色

- `bg-blue-500` - 背景色
- `text-white` - 文字颜色
- `border-gray-300` - 边框颜色

#### 尺寸

- `w-full` - 宽度 100%
- `h-screen` - 高度 100vh
- `max-w-4xl` - 最大宽度

#### 响应式

- `md:flex` - 中等屏幕及以上使用 flex
- `lg:grid` - 大屏幕使用 grid
- `sm:text-sm` - 小屏幕字体大小

## 📝 注意事项

1. **与 antd 兼容**：已设置 `preflight: false`，避免样式冲突
2. **保留原有样式**：原有的 CSS 样式文件仍然可以使用
3. **混合使用**：可以在同一个组件中同时使用 Tailwind 和 antd 的样式

## 🔧 自定义配置

可以在 `tailwind.config.ts` 中扩展主题：

```typescript
theme: {
  extend: {
    colors: {
      primary: "#1890ff", // 自定义主色
    },
    spacing: {
      '72': '18rem', // 自定义间距
    },
  },
}
```

## 📚 更多资源

- [Tailwind CSS 官方文档](https://tailwindcss.com/docs)
- [Tailwind CSS 类名参考](https://tailwindcss.com/docs/utility-first)
