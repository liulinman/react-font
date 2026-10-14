import { isNativeApp } from './runtime';

export function resolveMediaUrl(src: string): string {
  if (!src || !isNativeApp() || /^[a-z][a-z\d+.-]*:/i.test(src)) return src;
  const apiBase = import.meta.env.VITE_API_BASE_URL;
  if (!apiBase) return src;
  return new URL(src, new URL(apiBase).origin + '/').href;
}
