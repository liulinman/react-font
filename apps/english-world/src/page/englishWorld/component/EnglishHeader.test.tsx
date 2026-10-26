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

  it("renders learning child destinations, without removed word review, without implementation copy", () => {
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
    expect(within(navigation as HTMLElement).getByText("数据统计")).toBeInTheDocument();
    expect(within(navigation as HTMLElement).getByText("场景听力")).toBeInTheDocument();
    expect(within(navigation as HTMLElement).getByText("文章精读")).toBeInTheDocument();
    expect(within(navigation as HTMLElement).getByText("阅读练习")).toBeInTheDocument();
    expect(within(navigation as HTMLElement).getByText("复习手册")).toBeInTheDocument();
    expect(within(navigation as HTMLElement).queryByText("单词复习")).not.toBeInTheDocument();
    expect(within(navigation as HTMLElement).queryByText("雅思核心复习")).not.toBeInTheDocument();
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

    expect(screen.getByText("数据统计").closest(".ant-menu-item")).toHaveClass(
      "ant-menu-item-selected",
    );
    await user.click(screen.getByText("场景听力"));

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/englishWorld/ai-listening",
    );
    expect(onNavClick).toHaveBeenCalledWith("aiListening");
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
    expect(screen.getByTitle("数据统计")).toBeInTheDocument();
  });
});

it("links to the independent documentation document", () => {
  render(<MemoryRouter><EnglishHeader /></MemoryRouter>);
  expect(screen.getByRole("link", { name: "文档中心" })).toHaveAttribute("href", "/docs/");
});
