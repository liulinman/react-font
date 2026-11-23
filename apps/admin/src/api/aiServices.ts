export type Provider = "deepseek" | "doubao" | "tencent";
export interface AiConfig {
  provider: Provider;
  enabled: boolean;
  configured: boolean;
  keyMask: string;
  baseUrl: string;
  model: string;
  resourceId: string;
  speaker: string;
  secondSpeaker: string;
  version: number;
  status: string;
  testedAt?: string;
  testMessage?: string;
}
export interface AiUsage {
  provider: Provider;
  requests: number;
  characters: number;
  failures: number;
  cacheHits: number;
  tokens?: number;
}
const base = import.meta.env.VITE_API_BASE_URL || "/api";
export function secureKeyEntry(page = location.href, api = base) {
  const origin = new URL(page);
  const target = new URL(api, page);
  const local = (h: string) => ["localhost", "127.0.0.1", "[::1]"].includes(h);
  return (
    (origin.protocol === "https:" && target.protocol === "https:") ||
    (local(origin.hostname) && local(target.hostname))
  );
}
export async function aiFetch<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(`${base}/admin/ai-services${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.code !== 200)
    throw new Error(
      typeof result?.message === "string"
        ? result.message
        : "服务请求失败，请重试",
    );
  return result.data;
}
export async function testAudio(id: string) {
  const response = await fetch(
    `${base}/admin/ai-services/audio/${encodeURIComponent(id)}`,
    { credentials: "include" },
  );
  if (!response.ok) throw new Error("试听音频加载失败");
  return response.blob();
}
