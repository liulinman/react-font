export const apiBase = import.meta.env.VITE_API_BASE_URL || "/api";
export const requestUid = () => {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const h = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};
async function transport(url: string, options: RequestInit) {
  try {
    return await fetch(url, options);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new Error("网络连接中断，暂时无法连接服务。请检查网络后重试。");
  }
}
export async function listeningFetch<T>(
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await transport(`${apiBase}${path}`, {
    method: body === undefined ? "GET" : "POST",
    credentials: "include",
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.code !== 200)
    throw Object.assign(
      new Error(
        typeof data?.message === "string"
          ? data.message
          : "请求失败，请稍后重试",
      ),
      { status: response.status },
    );
  return data.data;
}
export async function audioFetch(
  path: string,
  body?: unknown,
  signal?: AbortSignal,
) {
  const response = await transport(`${apiBase}${path}`, {
    method: body === undefined ? "GET" : "POST",
    credentials: "include",
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message || "音频暂不可用，请重试");
  }
  const blob = await response.blob();
  if (!blob.size || !response.headers.get("content-type")?.includes("audio/"))
    throw new Error("音频无效，请重试");
  return blob;
}
