import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { DeliveryPipelinePanel } from "./DeliveryPipelinePanel";
vi.mock("@font/api", () => ({ getApiBaseUrl: () => "/api" }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const feature = {
  id: "notes/demo",
  moduleId: "notes",
  title: "笔记功能",
  prd: {
    route: "notes/prd.html",
    sha256: "abc",
    path: "docs/prd/notes/prd.md",
  },
  specs: [],
  cases: [],
  runs: [
    {
      id: "old-run",
      createdAt: "2026-10-28",
      status: "incomplete",
      freshness: "stale",
      specVersion: "unknown",
      prdSha256: "old",
      codeVersions: [],
      cloudUrls: [],
      images: [],
      tests: [],
      analysis: [],
      rows: [
        {
          id: "notes/demo/AC-01",
          text: "保存原文",
          status: "pending",
          reason: "尚未执行",
          caseIds: [],
        },
      ],
    },
  ],
};
it("navigates real stages and preserves missing spec, stale run and pending requirements", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        schemaVersion: 1,
        modules: [{ id: "notes", name: "知识笔记" }],
        features: [feature],
      }),
    }),
  );
  render(<DeliveryPipelinePanel />);
  await screen.findByRole("button", { name: /笔记功能/ });
  fireEvent.click(screen.getByRole("tab", { name: /Spec/ }));
  expect(screen.getByText("尚未归档 Spec 正文")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("tab", { name: /测试结果/ }));
  expect(screen.getByText(/需求已更新/)).toBeInTheDocument();
  expect(screen.getByText("尚未执行")).toBeInTheDocument();
  fireEvent.change(screen.getByRole("searchbox"), {
    target: { value: "没有这个功能" },
  });
  expect(screen.getByText("没有匹配的功能")).toBeInTheDocument();
});
it("recovers a failed load and shows expired admin sessions", async () => {
  const fetcher = vi
    .fn()
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValue({ ok: false, status: 401 });
  vi.stubGlobal("fetch", fetcher);
  render(<DeliveryPipelinePanel />);
  await screen.findByText(/产线资料加载失败/);
  fireEvent.click(screen.getByRole("button", { name: "重试" }));
  await screen.findByText(/管理员登录已失效/);
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
});
