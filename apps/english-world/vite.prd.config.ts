import { defineConfig, mergeConfig } from 'vite';
import integration from './vite.integration.config';

export default defineConfig(async env => {
  const base = typeof integration === 'function' ? await integration(env) : await integration;
  return mergeConfig(base, { server: { proxy: { '/admin': { target: 'http://127.0.0.1:5176', changeOrigin: true } } } });
});
