import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/teacher/',
  plugins: [react()],
  server: {
    port: 5187,
    proxy: { '/api': { target: 'http://127.0.0.1:3000', rewrite: path => path.replace(/^\/api/, '') } },
  },
});
