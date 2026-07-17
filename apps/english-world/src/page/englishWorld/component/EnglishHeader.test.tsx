import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
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
});
