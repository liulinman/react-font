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

  it("renders the field-preserved commercial sidebar entries", () => {
    render(
      <MemoryRouter initialEntries={["/englishWorld/words"]}>
        <EnglishHeader activeKey="words" />
      </MemoryRouter>,
    );

    expect(screen.getByText("字段保留版")).toBeInTheDocument();
    expect(screen.getByText("主流程")).toBeInTheDocument();
    expect(screen.getByText("学习")).toBeInTheDocument();
    expect(screen.getByText("配置")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /今日复习/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /词库/ })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /AI 单词查询/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /语境实验室/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /记忆地图/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /学习统计/ })).toBeInTheDocument();
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

  it("keeps secondary navigation active and directly clickable", async () => {
    const user = userEvent.setup();
    const onNavClick = vi.fn();

    render(
      <MemoryRouter initialEntries={["/englishWorld/memory-map"]}>
        <EnglishHeader activeKey="memoryMap" onNavClick={onNavClick} />
        <LocationProbe />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: /记忆地图/ })).toHaveClass(
      "ant-btn-primary",
    );
    await user.click(screen.getByRole("button", { name: /AI 单词查询/ }));

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/englishWorld/ai-word",
    );
    expect(onNavClick).toHaveBeenCalledWith("aiWord");
  });
});
