import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
import { ThemeProvider } from "@/theme/ThemeProvider";
import {
  EnglishWorldLayout,
  SIDEBAR_COLLAPSED_STORAGE_KEY,
} from "./EnglishWorldLayout";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { username: "tester" }, logout: vi.fn() }),
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

describe("EnglishWorldLayout sidebar state", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("persists the collapsed state when the sidebar is toggled", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MemoryRouter>
        <EnglishWorldLayout activeKey="words">content</EnglishWorldLayout>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "收起侧栏" }));

    expect(container.querySelector(".english-world-shell-collapsed")).toBeInTheDocument();
    expect(window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe(
      "true",
    );
  });

  it("restores a previously collapsed sidebar", () => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, "true");

    const { container } = render(
      <MemoryRouter>
        <EnglishWorldLayout activeKey="words">content</EnglishWorldLayout>
      </MemoryRouter>,
    );

    expect(container.querySelector(".english-world-shell-collapsed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "展开侧栏" })).toBeInTheDocument();
  });

  it("defaults to expanded for invalid stored values", () => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, "collapsed");

    const { container } = render(
      <MemoryRouter>
        <EnglishWorldLayout activeKey="words">content</EnglishWorldLayout>
      </MemoryRouter>,
    );

    expect(container.querySelector(".english-world-shell-collapsed")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "收起侧栏" })).toBeInTheDocument();
  });

  it("shows the current product section in the desktop context bar", () => {
    const { container } = render(
      <MemoryRouter>
        <EnglishWorldLayout activeKey="words">content</EnglishWorldLayout>
      </MemoryRouter>,
    );

    const contextBar = screen.getByRole("banner");
    expect(contextBar).toHaveTextContent("English World");
    expect(contextBar).toHaveTextContent("词库");
    expect(
      contextBar.querySelector(".english-world-context-date"),
    ).toBeInTheDocument();
    expect(
      within(contextBar).getByRole("button", { name: /用户菜单：tester/ }),
    ).toBeInTheDocument();
    expect(
      within(
        container.querySelector(".english-world-header") as HTMLElement,
      ).queryByRole("button", { name: /用户菜单：tester/ }),
    ).not.toBeInTheDocument();
  });

  it("keeps system settings in the top-right user menu", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/englishWorld"]}>
        <EnglishWorldLayout activeKey="cockpit">content</EnglishWorldLayout>
        <LocationProbe />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: /用户菜单：tester/ }));
    await user.click(await screen.findByText("系统设置"));

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/englishWorld/settings",
    );
  });

  it("opens theme settings from the top-right user menu", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/englishWorld"]}>
          <EnglishWorldLayout activeKey="cockpit">content</EnglishWorldLayout>
        </MemoryRouter>
      </ThemeProvider>,
    );

    await user.click(screen.getByRole("button", { name: /用户菜单：tester/ }));
    await user.click(await screen.findByText("主题设置"));

    expect(
      await screen.findByRole("dialog", { name: "主题设置" }),
    ).toBeInTheDocument();
  });
});
