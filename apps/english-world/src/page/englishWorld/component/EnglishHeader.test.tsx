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

  it("renders learning child destinations, including IELTS core review, without implementation copy", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/englishWorld/words"]}>
        <EnglishHeader activeKey="words" />
      </MemoryRouter>,
    );

    const navigation = container.querySelector(".english-world-nav");
    expect(navigation).toBeInTheDocument();

    expect(within(navigation as HTMLElement).getByText("今天")).toBeInTheDocument();
    expect(within(navigation as HTMLElement).getByText("词库")).toBeInTheDocument();
    expect(within(navigation as HTMLElement).getByText("词库列表")).toBeInTheDocument();
    expect(within(navigation as HTMLElement).getByText("批量导入")).toBeInTheDocument();
    expect(within(navigation as HTMLElement).getByText("覆盖统计")).toBeInTheDocument();
    expect(within(navigation as HTMLElement).getByText("学习")).toBeInTheDocument();
    expect(within(navigation as HTMLElement).getByText("数据")).toBeInTheDocument();
    expect(within(navigation as HTMLElement).getByText("后台")).toBeInTheDocument();
    expect(within(navigation as HTMLElement).getByText("今日复习")).toBeInTheDocument();
    expect(within(navigation as HTMLElement).getByText("语境实验室")).toBeInTheDocument();
    expect(within(navigation as HTMLElement).getByText("雅思核心复习")).toBeInTheDocument();
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

    await user.click(screen.getByText("词库列表"));

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

    expect(screen.getByText("数据").closest(".ant-menu-item")).toHaveClass(
      "ant-menu-item-selected",
    );
    await user.click(screen.getByText("今日复习"));

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/englishWorld/recite",
    );
    expect(onNavClick).toHaveBeenCalledWith("recite");
  });

  it("keeps IELTS core review under the learning primary navigation", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/englishWorld/ielts-core"]}>
        <EnglishHeader activeKey="ieltsCore" />
      </MemoryRouter>,
    );

    expect(screen.getByText("学习").closest(".ant-menu-submenu")).toHaveClass(
      "ant-menu-submenu-open",
    );
    expect(screen.getByText("雅思核心复习").closest(".ant-menu-item")).toHaveClass(
      "ant-menu-item-selected",
    );
    expect(container.querySelector(".english-world-nav-child-note")).toHaveTextContent(
      "IELTS",
    );
  });

  it("opens IELTS core review from the learning submenu", async () => {
    const user = userEvent.setup();
    const onNavClick = vi.fn();

    render(
      <MemoryRouter initialEntries={["/englishWorld/ielts-core"]}>
        <EnglishHeader activeKey="recite" onNavClick={onNavClick} />
        <LocationProbe />
      </MemoryRouter>,
    );

    await user.click(screen.getByText("雅思核心复习"));

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/englishWorld/ielts-core",
    );
    expect(onNavClick).toHaveBeenCalledWith("ieltsCore");
  });

  it("opens bulk import from the vocabulary submenu", async () => {
    const user = userEvent.setup();
    const onNavClick = vi.fn();

    render(
      <MemoryRouter initialEntries={["/englishWorld/words"]}>
        <EnglishHeader activeKey="words" onNavClick={onNavClick} />
        <LocationProbe />
      </MemoryRouter>,
    );

    await user.click(screen.getByText("批量导入"));

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/englishWorld/bulk-import",
    );
    expect(onNavClick).toHaveBeenCalledWith("bulkImport");
  });

  it("opens overwrite stats from the vocabulary submenu", async () => {
    const user = userEvent.setup();
    const onNavClick = vi.fn();

    render(
      <MemoryRouter initialEntries={["/englishWorld/words"]}>
        <EnglishHeader activeKey="words" onNavClick={onNavClick} />
        <LocationProbe />
      </MemoryRouter>,
    );

    await user.click(screen.getByText("覆盖统计"));

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/englishWorld/overwrite-stats",
    );
    expect(onNavClick).toHaveBeenCalledWith("overwriteStats");
  });


  it("keeps contextual word tools highlighted under the vocabulary primary item", () => {
    render(
      <MemoryRouter initialEntries={["/englishWorld/ai-word"]}>
        <EnglishHeader activeKey="aiWord" />
      </MemoryRouter>,
    );

    expect(screen.getByText("词库").closest(".ant-menu-submenu")).toHaveClass(
      "ant-menu-submenu-open",
    );
    expect(screen.getByText("词库列表").closest(".ant-menu-item")).toHaveClass(
      "ant-menu-item-selected",
    );
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
    expect(screen.getByTitle("今天")).toBeInTheDocument();
    expect(screen.getByTitle("词库")).toBeInTheDocument();
    expect(screen.getByTitle("学习")).toBeInTheDocument();
    expect(screen.getByTitle("数据")).toBeInTheDocument();
    expect(screen.getByTitle("后台")).toBeInTheDocument();
  });
});
