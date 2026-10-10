import { defineConfig, mergeConfig, type ConfigEnv, type UserConfigExport } from 'vite';
import baseConfig from './vite.config';

async function resolveBase(config: UserConfigExport, env: ConfigEnv) {
  return typeof config === 'function' ? await config(env) : await config;
}

export default defineConfig(async (env) => mergeConfig(await resolveBase(baseConfig, env), {
  // Ignore local .env files: the test browser must only call its isolated backend.
  envDir: false,
  define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api') },
  server: {
    host: '127.0.0.1', port: 13318, strictPort: true,
    proxy: { '/api': { target: 'http://127.0.0.1:13317', changeOrigin: true,
      rewrite: (path: string) => path.replace(/^\/api/, '') } },
  },
}));
