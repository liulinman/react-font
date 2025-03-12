import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },

  server: {
    host: "0.0.0.0", // 使 Vite 服务器监听所有 IP 地址
    port: 5173, // 可以指定端口，如果不指定，默认是 5173
    // open: true         // 是否在启动时自动打开浏览器
  },
});
