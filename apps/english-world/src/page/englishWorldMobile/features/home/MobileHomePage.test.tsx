import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MobileHomePage } from "./MobileHomePage";

const auth = { user: { id: 7, username: "mobile-user" } };
let online = true;

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("../../offline/useConnectivity", () => ({ useConnectivity: () => online }));
vi.mock("./recentWordStore", () => ({
  recentWordStore: {
    list: vi.fn(),
  },
}));

const { recentWordStore } = await import("./recentWordStore");

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

function renderHome(route = "/mobile") {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/mobile" element={<MobileHomePage />} />
        <Route path="/mobile/words" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("MobileHomePage", () => {
  beforeEach(() => {
    online = true;
    vi.mocked(recentWordStore.list).mockResolvedValue([
      { id: 4, englishWord: "retain", englishChinese: "保留" },
    ]);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("prioritizes searchable recent words before today's study and keeps manual add reachable", async () => {
    renderHome();

    await screen.findByRole("link", { name: /retain/ });
    const headings = screen.getAllByRole("heading").map((node) => node.textContent);
    expect(headings.indexOf("最近查看")).toBeLessThan(headings.indexOf("今日学习"));
    expect(screen.getByRole("searchbox", { name: "搜索单词、释义或标签" })).toBeVisible();
    expect(screen.getByRole("link", { name: "手动添加" })).toHaveAttribute("href", "/mobile/words/new");
    expect(screen.getByRole("link", { name: "retain 保留" })).toHaveAttribute("href", "/mobile/words/4");
  });

  it("navigates a non-empty search with an encoded q parameter", async () => {
    const user = userEvent.setup();
    renderHome();

    await user.type(screen.getByRole("searchbox", { name: "搜索单词、释义或标签" }), "look up & go");
    await user.click(screen.getByRole("button", { name: "搜索" }));

    expect(screen.getByTestId("location")).toHaveTextContent("/mobile/words?q=look+up+%26+go");
  });

  it("renders cached recent words offline while leaving local manual and import routes available", async () => {
    online = false;
    renderHome();

    expect(await screen.findByRole("link", { name: /retain/ })).toBeVisible();
    expect(screen.getByRole("link", { name: "手动添加" })).toHaveAttribute("href", "/mobile/words/new");
    expect(screen.getByRole("link", { name: "批量导入" })).toHaveAttribute("href", "/mobile/tools/bulk-import");
  });

  it("disables only network-only quick actions with an explicit offline explanation", async () => {
    online = false;
    renderHome();

    await screen.findByRole("link", { name: /retain/ });
    expect(screen.getByRole("button", { name: "AI 补全" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "开始新的学习任务" })).toBeDisabled();
    expect(screen.getByText("需要网络连接后才能使用 AI 补全和新建学习任务。", { selector: "p" })).toBeVisible();
  });

  it("keeps AI completion and new-task actions available when online", async () => {
    renderHome();

    await screen.findByRole("link", { name: /retain/ });
    expect(screen.getByRole("button", { name: "AI 补全" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "开始新的学习任务" })).toBeEnabled();
    expect(screen.queryByText("需要网络连接后才能使用 AI 补全和新建学习任务。", { selector: "p" })).not.toBeInTheDocument();
  });
});
