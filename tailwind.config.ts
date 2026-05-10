import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // 可以在这里扩展主题，比如自定义颜色、间距等
      colors: {
        // 示例：自定义颜色
        // primary: "#1890ff",
      },
    },
  },
  plugins: [],
  // 重要：与 antd 兼容，避免样式冲突
  corePlugins: {
    preflight: false, // 禁用 Tailwind 的默认样式重置，避免与 antd 冲突
  },
};

export default config;
