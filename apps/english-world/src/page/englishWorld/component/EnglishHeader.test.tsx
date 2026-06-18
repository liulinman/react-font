import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
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

  it("keeps primary navigation focused on today's review and word library", () => {
    render(
      <MemoryRouter initialEntries={["/englishWorld/words"]}>
        <EnglishHeader activeKey="words" />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("button", { name: /今日复习/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /词库/ })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /语境实验室/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /记忆地图/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /学习统计/ }),
    ).not.toBeInTheDocument();
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

  it("keeps secondary navigation active and clickable through the more menu", async () => {
    const user = userEvent.setup();
    const onNavClick = vi.fn();

    render(
      <MemoryRouter initialEntries={["/englishWorld/memory-map"]}>
        <EnglishHeader activeKey="memoryMap" onNavClick={onNavClick} />
        <LocationProbe />
      </MemoryRouter>,
    );

    const moreButton = screen.getByTestId("english-world-more-menu-button");
    expect(moreButton).toHaveTextContent("更多");
    expect(moreButton).toHaveClass("ant-btn-primary");

    await user.click(moreButton);
    await user.click(await screen.findByRole("menuitem", { name: /AI 单词查询/ }));

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/englishWorld/ai-word",
    );
    expect(onNavClick).toHaveBeenCalledWith("aiWord");
  });
});
