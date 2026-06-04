import { useCallback, useRef, useState } from "react";

export type SsePayload<TDone = unknown> =
  | { type: "chunk"; data: string; word?: string }
  | { type: "done"; data: TDone }
  | { type: "error"; message?: string; data?: unknown }
  | { type: string; data?: unknown; message?: string; word?: string };

export function parseSseLines<TDone = unknown>(
  text: string,
): Array<SsePayload<TDone>> {
  return text
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data: "))
    .map((line) => line.slice(6).trim())
    .filter(Boolean)
    .flatMap((payload) => {
      try {
        return [JSON.parse(payload) as SsePayload<TDone>];
      } catch {
        return [];
      }
    });
}

type StreamHandlers<TDone> = {
  onChunk?: (text: string, payload: SsePayload<TDone>) => void;
  onDone?: (data: TDone, payload: SsePayload<TDone>) => void;
  onError?: (message: string, payload?: SsePayload<TDone>) => void;
};

export function useSseStream<TDone = unknown>() {
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
  }, []);

  const start = useCallback(
    async (
      url: string,
      body: unknown,
      handlers: StreamHandlers<TDone> = {},
    ) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          handlers.onError?.("请求失败");
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() ?? "";

          for (const payload of parseSseLines<TDone>(lines.join("\n"))) {
            if (payload.type === "chunk" && typeof payload.data === "string") {
              handlers.onChunk?.(payload.data, payload);
            } else if (payload.type === "done") {
              handlers.onDone?.(payload.data as TDone, payload);
            } else if (payload.type === "error") {
              handlers.onError?.(payload.message ?? "生成失败", payload);
            }
          }
        }

        for (const payload of parseSseLines<TDone>(buffer)) {
          if (payload.type === "chunk" && typeof payload.data === "string") {
            handlers.onChunk?.(payload.data, payload);
          } else if (payload.type === "done") {
            handlers.onDone?.(payload.data as TDone, payload);
          } else if (payload.type === "error") {
            handlers.onError?.(payload.message ?? "生成失败", payload);
          }
        }
      } catch (error: unknown) {
        if ((error as { name?: string }).name !== "AbortError") {
          handlers.onError?.(
            error instanceof Error ? error.message : "请求失败",
          );
        }
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
        setLoading(false);
      }
    },
    [],
  );

  return { loading, start, abort };
}
