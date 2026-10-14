import "@testing-library/jest-dom/vitest";
import "antd-mobile/es/global";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Login from "./Login";

const { login } = vi.hoisted(() => ({ login: vi.fn() }));

vi.mock("./LoginStarfieldCanvas", () => ({
  default: () => null,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    login,
    register: vi.fn(),
    isAuthenticated: false,
  }),
}));

describe("Login", () => {
  beforeEach(() => {
    login.mockReset();
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
    expect(screen.getByRole("heading", { name: "继续你的英语学习" })).toBeInTheDocument();
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

  it("shows a rejected login error even when the shared API suppresses code 4001", async () => {
    login.mockRejectedValue({ code: 4001, message: "用户名或密码错误" });
    const { container } = render(<MemoryRouter><Login /></MemoryRouter>);
    fireEvent.change(container.querySelector('[data-cy="login-username"]')!, { target: { value: 'learner' } });
    fireEvent.change(container.querySelector('[data-cy="login-password"]')!, { target: { value: 'wrong-password' } });
    fireEvent.submit(container.querySelector('.login-card form')!);
    expect(await screen.findByRole('alert')).toHaveTextContent('用户名或密码错误');
  });
});
