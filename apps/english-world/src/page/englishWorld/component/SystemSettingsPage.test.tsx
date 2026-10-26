import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { SystemSettingsPage } from "./SystemSettingsPage";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { username: "tester" }, logout: vi.fn() }),
}));

vi.mock("./McpAccessCard", () => ({
  McpAccessCard: () => <section aria-label="MCP 授权管理">MCP 授权管理</section>,
}));

describe("SystemSettingsPage", () => {
  beforeAll(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  afterEach(cleanup);

  it("uses the shared shell so settings content cannot sit under the sidebar", async () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/englishWorld/settings"]}>
        <SystemSettingsPage />
      </MemoryRouter>,
    );

    expect(container.querySelector(".english-world-shell")).toBeInTheDocument();
    expect(container.querySelector(".system-settings-page")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "系统设置" })).toBeInTheDocument();
    expect(screen.queryByText("偏好设置")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "MCP 授权管理" })).toBeInTheDocument();
    expect(screen.queryByText("单词默写配置")).not.toBeInTheDocument();
    expect(screen.queryByText("单词听写配置")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /保存配置|重置默认/ })).not.toBeInTheDocument();
  });
});
