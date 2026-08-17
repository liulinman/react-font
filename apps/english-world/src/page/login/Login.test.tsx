import "@testing-library/jest-dom/vitest";
import "antd-mobile/es/global";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Login from "./Login";

vi.mock("./LoginStarfieldCanvas", () => ({
  default: () => null,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    login: vi.fn(),
    register: vi.fn(),
    isAuthenticated: false,
  }),
}));

describe("Login", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("presents a calm learning workspace with a focused sign-in card", () => {
    const { container } = render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    expect(container.querySelector(".login-container")).toHaveClass(
      "login-workspace",
    );
    expect(screen.getByText("把每个单词点亮成星图")).toBeInTheDocument();
    expect(screen.getByText("每日复习")).toBeInTheDocument();
    expect(screen.getByText("AI 语境实验室")).toBeInTheDocument();
    expect(container.querySelector(".login-copy-points")).toBeInTheDocument();
    expect(container.querySelector(".login-status-strip")).not.toBeInTheDocument();
    expect(container.querySelector(".login-starfield")).not.toBeInTheDocument();
  });

  it("gives the sign-in form a deliberate product surface", () => {
    const { container } = render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    const form = container.querySelector(".login-card form");

    expect(form).toHaveClass("login-form", "login-form-compact");
    expect(form?.querySelector('[data-cy="login-username"]')).toHaveAttribute(
      "placeholder",
      "用户名（至少3个字符）",
    );
    expect(form?.querySelector('[data-cy="login-submit"]')).toHaveClass(
      "login-form-submit",
    );
  });
});
