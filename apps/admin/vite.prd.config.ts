import { defineConfig, mergeConfig } from 'vite';
import base from './vite.config';

export default defineConfig(mergeConfig(base, {
  envDir: false,
  server: { host: '127.0.0.1', port: 5176, strictPort: true,
    proxy: { '/api': { target: 'http://127.0.0.1:13317', changeOrigin: true,
      rewrite: (path: string) => path.replace(/^\/api/, '') } },
  },
}));
