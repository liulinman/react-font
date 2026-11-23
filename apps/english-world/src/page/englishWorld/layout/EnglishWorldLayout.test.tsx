import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
import { PwaUpdateProvider, type PwaRegistrationCallbacks } from "../../englishWorldMobile/pwa/PwaUpdateContext";
import { MobileActivityLockContext } from "../../englishWorldMobile/offline/MobileActivityLockContext";
import { ThemeProvider } from "@/theme/ThemeProvider";
import {
  EnglishWorldLayout,
  SIDEBAR_COLLAPSED_STORAGE_KEY,
} from "./EnglishWorldLayout";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { username: "tester" }, logout: vi.fn() }),
}));

vi.mock("@/notifications/NotificationContext", () => ({
  useNotifications: () => ({
    items: [],
    unreadCount: 0,
    loading: false,
    markRead: vi.fn(),
    markAllRead: vi.fn(),
    refresh: vi.fn(),
  }),
}));

function LocationProbe() {
  const location = useLocation();
  return (
    <div data-testid="location">
      {location.pathname}
      {location.search}
    </div>
  );
}

beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});

afterEach(() => vi.unstubAllGlobals());

describe("EnglishWorldLayout sidebar state", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("uses the reading workspace without changing the saved navigation preference", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/englishWorld/reading-practices/7"]}>
        <EnglishWorldLayout activeKey="readingPractices">content</EnglishWorldLayout>
      </MemoryRouter>,
    );
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "收起侧栏" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "显示导航" }));
    expect(screen.getByRole("banner")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "专注阅读" }));
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    expect(localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBeNull();
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
    expect(contextBar).toHaveTextContent("Freewing");
    expect(contextBar).toHaveTextContent("词库");
    expect(
      contextBar.querySelector(".english-world-context-date"),
    ).toBeInTheDocument();
    expect(
      within(contextBar).getByRole("button", { name: /用户菜单：tester/ }),
    ).toBeInTheDocument();
    expect(
      within(contextBar).getByRole("button", { name: "通知" }),
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

  it("returns advanced pages to the mobile feature center", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter
        initialEntries={["/englishWorld/bulk-import?source=mobile"]}
      >
        <EnglishWorldLayout activeKey="bulkImport">
          content
        </EnglishWorldLayout>
        <LocationProbe />
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole("button", { name: "返回移动版" }),
    );

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/englishWorldMobile?view=more",
    );
  });
});

it("shows one desktop update prompt and keeps activation behind the activity lock and user click", async () => {
  let callbacks: PwaRegistrationCallbacks | undefined;
  const activate = vi.fn();
  const registration = { register(next: PwaRegistrationCallbacks) { callbacks = next; return activate; } };
  const shell = (locked: boolean) => <MemoryRouter><MobileActivityLockContext.Provider value={{ locked, lock: () => undefined, unlock: () => undefined }}><PwaUpdateProvider registration={registration}><EnglishWorldLayout activeKey="words">content</EnglishWorldLayout></PwaUpdateProvider></MobileActivityLockContext.Provider></MemoryRouter>;
  const view = render(shell(true));
  act(() => callbacks?.onNeedRefresh());
  expect(screen.getAllByText("新版本已准备好")).toHaveLength(1);
  expect(screen.getByRole("button", { name: "立即更新" })).toBeDisabled();
  expect(activate).not.toHaveBeenCalled();
  view.rerender(shell(false));
  expect(activate).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: "立即更新" }));
  expect(activate).toHaveBeenCalledExactlyOnceWith(true);
  cleanup();
});
