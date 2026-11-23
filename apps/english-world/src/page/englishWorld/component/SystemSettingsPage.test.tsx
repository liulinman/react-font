import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ApplicationUpdateCard } from "./ApplicationUpdateCard";
import { MobileActivityLockContext } from "../../englishWorldMobile/offline/MobileActivityLockContext";
import { SystemSettingsPage } from "./SystemSettingsPage";

const updateAvatar = vi.hoisted(() => vi.fn());

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { username: "tester" }, logout: vi.fn(), updateAvatar }),
}));

vi.mock("@font/api", () => ({ useMutation: () => ({ mutateAsync: vi.fn() }) }));

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
    expect(screen.getByRole("link", { name: "检查更新" })).toHaveAttribute("href", "/docs/app-update.html");
    expect(screen.getByRole("region", { name: "账号安全" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "修改密码" })).toBeInTheDocument();
    expect(screen.queryByText("偏好设置")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "MCP 授权管理" })).toBeInTheDocument();
    expect(screen.queryByText("单词默写配置")).not.toBeInTheDocument();
    expect(screen.queryByText("单词听写配置")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /保存配置|重置默认/ })).not.toBeInTheDocument();
  });
  it("saves a replacement avatar from system settings", async () => {
    updateAvatar.mockResolvedValue(undefined);
    render(<MemoryRouter><SystemSettingsPage /></MemoryRouter>);
    const input = screen.getByLabelText("更换头像");
    const file = new File(["image"], "avatar.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(updateAvatar).toHaveBeenCalledWith(file));
    expect(await screen.findByText("头像已更新")).toBeInTheDocument();
  });

  it("keeps update navigation unavailable while a learning operation is locked", () => {
    render(<MobileActivityLockContext.Provider value={{ locked: true, lock: vi.fn(), unlock: vi.fn() }}>
      <ApplicationUpdateCard />
    </MobileActivityLockContext.Provider>);
    expect(screen.getByRole("button", { name: "检查更新" })).toBeDisabled();
    expect(screen.queryByRole("link", { name: "检查更新" })).not.toBeInTheDocument();
    expect(screen.getByText("请先完成当前学习操作，再检查更新。")).toBeInTheDocument();
  });

});
