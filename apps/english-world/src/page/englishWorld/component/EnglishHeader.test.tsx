import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { EnglishHeader } from "./EnglishHeader";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { username: "tester" },
    logout: vi.fn(),
  }),
}));

function LocationProbe() {
  const location = useLocation();
  return (
    <div data-testid="location">
      {location.pathname}
      {location.hash}
    </div>
  );
}

describe("EnglishHeader ToC navigation", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders four focused learning destinations without implementation copy", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/englishWorld/words"]}>
        <EnglishHeader activeKey="words" />
      </MemoryRouter>,
    );

    const navigation = container.querySelector(".english-world-nav");
    expect(navigation).toBeInTheDocument();
    const navButtons = within(navigation as HTMLElement).getAllByRole("button");

    expect(navButtons).toHaveLength(4);
    expect(within(navigation as HTMLElement).getByRole("button", { name: /今天/ })).toBeInTheDocument();
    expect(within(navigation as HTMLElement).getByRole("button", { name: /词库/ })).toBeInTheDocument();
    expect(within(navigation as HTMLElement).getByRole("button", { name: /学习/ })).toBeInTheDocument();
    expect(within(navigation as HTMLElement).getByRole("button", { name: /数据/ })).toBeInTheDocument();
    expect(within(navigation as HTMLElement).queryByText("系统设置")).not.toBeInTheDocument();
    expect(screen.queryByText("字段保留版")).not.toBeInTheDocument();
  });

  it("uses real paths for primary navigation instead of hash routes", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/englishWorld/recite"]}>
        <EnglishHeader activeKey="recite" />
        <LocationProbe />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: /词库/ }));

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/englishWorld/words",
    );
  });

  it("keeps primary navigation active and directly clickable", async () => {
    const user = userEvent.setup();
    const onNavClick = vi.fn();

    render(
      <MemoryRouter initialEntries={["/englishWorld/stats"]}>
        <EnglishHeader activeKey="stats" onNavClick={onNavClick} />
        <LocationProbe />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: /数据/ })).toHaveClass(
      "ant-btn-primary",
    );
    await user.click(screen.getByRole("button", { name: /学习/ }));

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/englishWorld/recite",
    );
    expect(onNavClick).toHaveBeenCalledWith("recite");
  });

  it("exposes a controlled desktop sidebar toggle without losing navigation labels", async () => {
    const user = userEvent.setup();
    const onCollapsedChange = vi.fn();
    const { container, rerender } = render(
      <MemoryRouter initialEntries={["/englishWorld/words"]}>
        <EnglishHeader
          activeKey="words"
          collapsed={false}
          onCollapsedChange={onCollapsedChange}
        />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "收起侧栏" }));
    expect(onCollapsedChange).toHaveBeenCalledWith(true);

    rerender(
      <MemoryRouter initialEntries={["/englishWorld/words"]}>
        <EnglishHeader
          activeKey="words"
          collapsed
          onCollapsedChange={onCollapsedChange}
        />
      </MemoryRouter>,
    );

    expect(container.querySelector(".english-world-header-collapsed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "展开侧栏" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /今天/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /词库/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /学习/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /数据/ })).toBeInTheDocument();
  });

  it("moves system settings into the user menu", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/englishWorld"]}>
        <EnglishHeader activeKey="cockpit" />
        <LocationProbe />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: /tester/ }));
    await user.click(await screen.findByText("系统设置"));

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/englishWorld/settings",
    );
  });

  it("opens theme settings from the user menu", async () => {
    const user = userEvent.setup();
    window.localStorage.clear();

    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/englishWorld"]}>
          <EnglishHeader activeKey="cockpit" />
        </MemoryRouter>
      </ThemeProvider>,
    );

    await user.click(screen.getByRole("button", { name: /tester/ }));
    await user.click(await screen.findByText("主题设置"));

    expect(
      await screen.findByRole("dialog", { name: "主题设置" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "浅色" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "深色" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "跟随系统" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "蓝色" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "绿色" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "紫色" })).toBeInTheDocument();

    await user.click(screen.getByText("深色"));
    await user.click(screen.getByText("紫色"));

    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(document.documentElement).toHaveAttribute("data-accent", "purple");
    expect(window.localStorage.getItem("english-world-theme")).toBe(
      JSON.stringify({ appearance: "dark", accent: "purple" }),
    );
  });
});
