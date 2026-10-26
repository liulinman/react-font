import { brand } from "../../branding/freewing/brand.mjs";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import * as path from "path";

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    VitePWA({
      disable: mode === 'ios',
      registerType: "prompt",
      includeAssets: ["icons/freewing-apple-touch-icon-180x180.png", "brand/freewing-symbol.png", "brand/freewing-favicon.png"],
      manifest: {
        name: brand.name,
        short_name: brand.name,
        start_url: "/mobile",
        scope: "/",
        display: "standalone",
        background_color: "#F2F2F7",
        theme_color: "#F2F2F7",
        icons: [
          {
            src: "/icons/freewing-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icons/freewing-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/icons/freewing-512x512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: [
          "index.html",
          "assets/app-shell-*.js",
          "assets/index-*.css",
          "assets/workbox-window*.js",
        ],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/admin(?:\/|$)/, /^\/docs(?:\/|$)/],
        runtimeCaching: [],
      },
    }),
  ],
  build: {
    outDir: mode === 'ios' ? 'dist-ios' : 'dist',
    manifest: true,
    rollupOptions: {
      output: {
        entryFileNames: "assets/app-shell-[hash].js",
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    css: true,
    environment: "jsdom",
    testTimeout: 30000,
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
}));
