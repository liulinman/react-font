import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import {
  EnglishWorldLayout,
  SIDEBAR_COLLAPSED_STORAGE_KEY,
} from "./EnglishWorldLayout";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { username: "tester" }, logout: vi.fn() }),
}));

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
});
