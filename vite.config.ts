/*
 * @Author: yifeng 2108546503@qq.com
 * @Date: 2025-02-27 16:39:53
 * @LastEditors: yifeng 2108546503@qq.com
 * @LastEditTime: 2025-04-17 17:50:04
 * @FilePath: \font\vite.config.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import * as path from "path"; // 正确导入 path 模块

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"), // 使用 path.resolve 来解决路径
    },
  },

  server: {
    host: "0.0.0.0", // 使 Vite 服务器监听所有 IP 地址
    port: 5173, // 可以指定端口，如果不指定，默认是 5173
    // open: true         // 是否在启动时自动打开浏览器
  },
});
