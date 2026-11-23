export class ClassroomApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function classroomRequest<T>(
  path: string,
  body?: object,
  signal?: AbortSignal,
): Promise<T> {
  const multipart = body instanceof FormData;
  const response = await fetch("/api" + path, {
    credentials: "same-origin",
    signal,
    ...(body
      ? {
          method: "POST",
          headers: multipart
            ? undefined
            : { "Content-Type": "application/json" },
          body: multipart ? body : JSON.stringify(body),
        }
      : {}),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.code !== 200) {
    const message = payload?.message;
    throw new ClassroomApiError(
      typeof message === "string" ? message : "请求失败，请重试",
      response.status,
    );
  }
  return payload.data;
}

export const classroomError = (error: unknown) =>
  error instanceof Error ? error.message : "操作失败，请重试";
