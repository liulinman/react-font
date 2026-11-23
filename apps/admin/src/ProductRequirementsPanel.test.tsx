import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { ProductRequirementsPanel } from "./ProductRequirementsPanel";
vi.mock("@font/api", () => ({ getApiBaseUrl: () => "/api" }));
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("unavailable")));
it("embeds the protected backend VitePress site and offers reopening and reload", async () => {
  render(<ProductRequirementsPanel />);
  fireEvent.click(screen.getByRole("tab", { name: "需求全文" }));
  const frame = screen.getByTitle("产品需求阅读器");
  expect(frame).toHaveAttribute("src", "/api/admin/prd/");
  expect(screen.getByRole("link", { name: "独立阅读" })).toHaveAttribute(
    "href",
    "/api/admin/prd/",
  );
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "重新加载" }));
  expect(screen.getByTitle("产品需求阅读器")).not.toBe(frame);
});

it("shows the expired-admin message when the protected document returns an authentication error", () => {
  render(<ProductRequirementsPanel />);
  fireEvent.click(screen.getByRole("tab", { name: "需求全文" }));
  const frame = screen.getByTitle("产品需求阅读器");
  Object.defineProperty(frame, "contentDocument", { configurable: true, value: {
    contentType: "application/json", body: { textContent: JSON.stringify({ code: 4001, message: "Unauthorized" }) },
  }});
  fireEvent.load(frame);
  expect(screen.getByText("管理员登录已失效，请重新登录后查看产品需求。")).toBeInTheDocument();
  expect(screen.queryByTitle("产品需求阅读器")).not.toBeInTheDocument();
});
