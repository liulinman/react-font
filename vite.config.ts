import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import * as path from "path"; // 正确导入 path 模块
import { version } from "./package.json"; // 导入版本号

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"), // 使用 path.resolve 来解决路径
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(version), // 注入版本号
  },

  server: {
    host: "0.0.0.0", // 使 Vite 服务器监听所有 IP 地址
    port: 5173, // 可以指定端口，如果不指定，默认是 5173
    // open: true         // 是否在启动时自动打开浏览器
    proxy: {
      // 代理 API 请求到后端服务器
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""), // 移除 /api 前缀
      },
    },
  },
});
