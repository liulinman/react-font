import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
vi.mock("@font/api", () => ({ getApiBaseUrl: () => "/api" }));
import { IeltsListeningPanel } from "./IeltsListeningPanel";
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
});
describe("IELTS material administration", () => {
  afterEach(() => {cleanup(); vi.unstubAllGlobals();});
  it("keeps invalid import text and gives a recoverable error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ code: 200, data: [] }),
      }),
    );
    render(<IeltsListeningPanel />);
    await screen.findByText("导入原创材料");
    fireEvent.change(screen.getByLabelText("材料包 JSON"), {
      target: { value: "invalid" },
    });
    fireEvent.click(screen.getByRole("button", { name: "校验并导入" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("JSON"),
    );
    expect(screen.getByLabelText("材料包 JSON")).toHaveValue("invalid");
  });
  it("loads a published version, cancels safely and creates a separate revision draft", async () => {
    const original = {id: "published-1", title: "Original", status: "ready", visibility: "public", source: "Original", completedParts: 1, requestedParts: [1]};
    const payload = {title: "Original", sections: [{part: 1, transcript: "Original recording", groups: []}]};
    const fetchMock = vi.fn(async (url: string, options?: RequestInit) => ({ok: true, json: async () => ({code: 200, data: url.endsWith("/edit") ? payload : options?.method === "POST" ? {id: "new-draft", status: "draft", previousMaterialId: original.id} : [original]})}));
    vi.stubGlobal("fetch", fetchMock);
    render(<IeltsListeningPanel />);
    fireEvent.click(await screen.findByRole("button", {name: "创建修订"}));
    await screen.findByText("修订已发布材料");
    expect(screen.getByLabelText("材料包 JSON")).toHaveValue(JSON.stringify(payload, null, 2));
    expect(screen.getByRole("status")).toHaveTextContent("不覆盖原材料或历史作答");
    fireEvent.click(screen.getByRole("button", {name: "取消修订"}));
    expect(screen.getByLabelText("材料包 JSON")).toHaveValue("");
    expect(fetchMock.mock.calls.some(([, options]) => options?.method === "POST")).toBe(false);
    fireEvent.click(screen.getByRole("button", {name: "创建修订"}));
    await waitFor(() => expect(screen.getByRole("button", {name: /校验并创建新版本/})).toBeEnabled());
    const revised = {...payload, title: "Revised"};
    fireEvent.change(screen.getByLabelText("材料包 JSON"), {target: {value: JSON.stringify(revised)}});
    fireEvent.click(screen.getByRole("button", {name: /校验并创建新版本/}));
    await waitFor(() => expect(fetchMock.mock.calls.some(([url, options]) => url.endsWith("/materials/published-1/revisions") && options?.method === "POST")).toBe(true));
    const [, options] = fetchMock.mock.calls.find(([url, options]) => url.endsWith("/revisions") && options?.method === "POST")!;
    expect(JSON.parse(options!.body as string)).toMatchObject(revised);
    expect(JSON.parse(options!.body as string).requestId).toBeTruthy();
    await screen.findByText("导入原创材料");
    expect(screen.getByLabelText("材料包 JSON")).toHaveValue("");
  });

});
