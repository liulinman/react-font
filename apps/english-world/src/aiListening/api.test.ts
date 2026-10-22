import { afterEach, expect, it, vi } from "vitest";
import { audioFetch, listeningFetch } from "./api";
afterEach(() => vi.unstubAllGlobals());
it("unwraps API and sends stable supplied request id", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ code: 200, data: { id: "session" } })),
    );
  vi.stubGlobal("fetch", fetcher);
  expect(
    await listeningFetch("/ai-learning/sessions", {
      requestUid: "fixed",
      wordIds: [1],
    }),
  ).toEqual({ id: "session" });
  expect(fetcher.mock.calls[0][1]).toMatchObject({
    credentials: "include",
    body: '{"requestUid":"fixed","wordIds":[1]}',
  });
});
it("does not mistake JSON errors or empty payloads for playable sound", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response("{}", { headers: { "content-type": "application/json" } }),
      ),
  );
  await expect(audioFetch("/audio")).rejects.toThrow("音频无效");
});
