import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { McpAccessCard } from "./McpAccessCard";
vi.mock("@font/api", () => ({ getApiBaseUrl: () => "/api" }));
const secret = "test-once-only-token";
let items: unknown[];
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  Object.defineProperty(window, "matchMedia", { writable: true, value: vi.fn().mockImplementation(query => ({ matches: false, media: query, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() })) });
  items = [];
  fetchMock = vi.fn(async (url: string, options: RequestInit) => {
    const path = url.replace("/api/mcp-access", "");
    let data: unknown = { items: [] };
    if (path === "/info") data = { endpoint: "https://example.com/api/mcp", transport: "streamable-http", auth: "bearer" };
    if (path === "/tokens" && options.method === "GET") data = { items };
    if (path === "/tokens" && options.method === "POST") { const values = JSON.parse(options.body as string); const item = { id: "t1", ...values, expiresAt: "2099-01-01", createdAt: "2026-10-26" }; items = [item]; data = { token: secret, item }; }
    return { ok: true, json: async () => ({ code: 200, data }) };
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
it("creates read-only authorization by default and removes secret on close", async () => {
  const user = userEvent.setup(); render(<McpAccessCard />);
  await screen.findByText("https://example.com/api/mcp");
  await user.click(screen.getByRole("button", { name: /创建授权/ }));
  await user.type(screen.getByPlaceholderText("例如：我的 AI 助手"), "My assistant");
  const createButtons = screen.getAllByRole("button", { name: /创建授权/ });
  await user.click(createButtons[createButtons.length - 1]);
  await screen.findByDisplayValue(secret);
  const createCall = fetchMock.mock.calls.find(([url, options]) => url.endsWith("/tokens") && options.method === "POST");
  expect(JSON.parse(createCall![1].body as string)).toEqual({ name: "My assistant", scopes: ["words:read"], expiresInDays: 30 });
  expect(createCall![1].credentials).toBe("include");
  expect(window.localStorage.getItem("mcpToken")).toBeNull();
  await user.click(screen.getByRole("button", { name: "我已保存，关闭" }));
  await waitFor(() => expect(screen.queryByDisplayValue(secret)).toBeNull());
  expect(screen.getByText("My assistant")).toBeTruthy();
});
it("requires confirmation before revoking a token", async () => {
  items = [{ id: "t1", name: "My assistant", scopes: ["words:read"], expiresAt: "2099-01-01" }];
  const user = userEvent.setup(); render(<McpAccessCard />);
  await user.click(await screen.findByRole("button", { name: "撤销授权" }));
  expect(fetchMock.mock.calls.filter(([url]) => url.includes("/revoke"))).toHaveLength(0);
  await user.click(screen.getByRole("button", { name: "确认撤销" }));
  await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url.endsWith("/tokens/t1/revoke"))).toBe(true));
});
it("keeps creation error visible in dialog and never renders server secret text", async () => {
  const user = userEvent.setup(); render(<McpAccessCard />);
  await screen.findByText("https://example.com/api/mcp");
  await user.click(screen.getByRole("button", { name: /创建授权/ }));
  await user.type(screen.getByPlaceholderText("例如：我的 AI 助手"), "Fail client");
  fetchMock.mockImplementationOnce(async () => ({ ok: false, json: async () => ({ message: secret }) }));
  const buttons = screen.getAllByRole("button", { name: /创建授权/ });
  await user.click(buttons[buttons.length - 1]);
  await screen.findAllByText("创建失败。请刷新授权列表确认结果后再重试，避免重复创建。");
  expect(screen.getByRole("dialog").textContent).toContain("创建失败");
  expect(screen.queryByText(secret)).toBeNull();
});
it("shows creation date and translates audit action and outcome", async () => {
  items = [{ id: "t1", name: "My assistant", scopes: ["words:read"], expiresAt: "2099-01-01", createdAt: "2026-10-26" }];
  const existing = fetchMock.getMockImplementation() as (url: string, options: RequestInit) => Promise<unknown>;
  fetchMock.mockImplementation(async (url: string, options: RequestInit) => url.endsWith("/audit") ? { ok: true, json: async () => ({ code: 200, data: { items: [{ id: "a1", tokenName: "My assistant", action: "confirm_update_word", outcome: "forbidden", createdAt: "2026-10-26" }] } }) } : existing(url, options));
  render(<McpAccessCard />);
  await screen.findByText(/My assistant · 确认覆盖/);
  expect(screen.getByText(/创建 2026/)).toBeTruthy();
  expect(screen.getByText(/权限不足 ·/)).toBeTruthy();
});
it("replaces copy feedback when success and failure follow each other", async () => {
  const user = userEvent.setup();
  const writeText = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("denied")).mockResolvedValueOnce(undefined);
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  render(<McpAccessCard />);
  const copyButton = await screen.findByRole("button", { name: /复制地址/ });
  await user.click(copyButton);
  expect(screen.getByText("已复制")).toBeTruthy();
  await user.click(copyButton);
  await screen.findByText("复制失败，请选中文本手动复制。");
  expect(copyButton.closest(".mcp-access-copy-action")?.textContent).toContain("复制失败");
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.queryByText("已复制")).toBeNull();
  await user.click(copyButton);
  await screen.findByText("已复制");
  expect(screen.queryByText("复制失败，请选中文本手动复制。")).toBeNull();
});
it("distinguishes audit records with identical names using nonsecret token IDs", async () => {
  const existing = fetchMock.getMockImplementation() as (url: string, options: RequestInit) => Promise<unknown>;
  fetchMock.mockImplementation(async (url: string, options: RequestInit) => url.endsWith("/audit") ? { ok: true, json: async () => ({ code: 200, data: { items: ["aaaa1111-0000", "bbbb2222-0000"].map((tokenId, index) => ({ id: `a${index}`, tokenName: "Same client", tokenId, action: "query_words", outcome: "success", createdAt: "2026-10-26" })) } }) } : existing(url, options));
  render(<McpAccessCard />);
  expect(await screen.findByTitle("aaaa1111-0000")).toHaveProperty("textContent", " #aaaa1111");
  expect(screen.getByTitle("bbbb2222-0000")).toHaveProperty("textContent", " #bbbb2222");
});
