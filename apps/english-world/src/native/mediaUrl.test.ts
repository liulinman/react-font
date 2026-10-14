import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveMediaUrl } from './mediaUrl';

const native = vi.hoisted(() => ({ enabled: true }));
vi.mock('./runtime', () => ({ isNativeApp: () => native.enabled }));

afterEach(() => { vi.unstubAllEnvs(); native.enabled = true; });

describe('native media URLs', () => {
  it('resolves server-relative images against the API server instead of the local app', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://124.223.157.129/api');
    expect(resolveMediaUrl('/api/upload/42')).toBe('http://124.223.157.129/api/upload/42');
    expect(resolveMediaUrl('images/word.png')).toBe('http://124.223.157.129/images/word.png');
  });

  it('preserves absolute and local preview URLs', () => {
    for (const url of ['https://images.example/word.png', 'blob:preview', 'data:image/png;base64,AA', '']) {
      expect(resolveMediaUrl(url)).toBe(url);
    }
  });

  it('preserves relative web image paths', () => {
    native.enabled = false;
    expect(resolveMediaUrl('/api/upload/42')).toBe('/api/upload/42');
  });
});
