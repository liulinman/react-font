import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { SystemSettingsPage } from "./SystemSettingsPage";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { username: "tester" }, logout: vi.fn() }),
}));

vi.mock("./SystemSettings", async () => {
  const actual = await vi.importActual<typeof import("./SystemSettings")>(
    "./SystemSettings",
  );
  return {
    ...actual,
    getSystemSettings: vi.fn(() => Promise.resolve(actual.DEFAULT_SETTINGS)),
    saveSystemSettings: vi.fn(() => Promise.resolve(true)),
  };
});

vi.mock("@font/api", () => ({ default: vi.fn(() => Promise.resolve(true)) }));

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
    expect(screen.getByRole("button", { name: /保存配置/ })).toBeInTheDocument();
  });
});
