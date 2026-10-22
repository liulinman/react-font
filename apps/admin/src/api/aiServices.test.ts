import { afterEach, expect, it, vi } from "vitest";
import { aiFetch, secureKeyEntry } from "./aiServices";
afterEach(() => vi.unstubAllGlobals());
it("rejects public HTTP and HTTPS page with insecure API", () => {
  expect(secureKeyEntry("http://example.com/admin", "/api")).toBe(false);
  expect(
    secureKeyEntry("https://example.com/admin", "http://example.com/api"),
  ).toBe(false);
  expect(secureKeyEntry("http://localhost:5176/admin", "/api")).toBe(true);
  expect(secureKeyEntry("https://example.com/admin", "/api")).toBe(true);
});
it("sends cookie and preserves empty-key semantics without exposing errors", async () => {
  const mock = vi
    .fn()
    .mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 200,
          data: { configured: true, keyMask: "***" },
        }),
      ),
    );
  vi.stubGlobal("fetch", mock);
  const result = await aiFetch("/deepseek", "PUT", { enabled: true });
  expect(result).toEqual({ configured: true, keyMask: "***" });
  expect(mock.mock.calls[0][1]).toMatchObject({
    credentials: "include",
    body: '{"enabled":true}',
  });
});
it("rejects business errors even with HTTP 200", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ code: 400, message: "配置不可用" })),
      ),
  );
  await expect(aiFetch("")).rejects.toThrow("配置不可用");
});
