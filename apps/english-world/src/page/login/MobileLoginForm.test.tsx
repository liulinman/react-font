import "@testing-library/jest-dom/vitest";
import "antd-mobile/es/global";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Login from "./Login";

const navigate = vi.fn();
const auth = {
  login: vi.fn(),
  register: vi.fn(),
  isAuthenticated: false,
};

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigate };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => auth,
}));

function renderMobileLogin(from: {
  pathname: string;
  search?: string;
  hash?: string;
}) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: "/login", state: { from } }]}>
      <Login />
    </MemoryRouter>,
  );
}

describe("mobile login", () => {
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
    auth.isAuthenticated = false;
    auth.login.mockResolvedValue({ id: 1 });
    auth.register.mockResolvedValue({ id: 1 });
    navigate.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("uses the mobile login surface for a mobile deep link", () => {
    renderMobileLogin({ pathname: "/mobile/tools/context-lab" });

    expect(
      screen.getByRole("main", { name: "English World 移动端登录" }),
    ).toBeVisible();
    expect(screen.queryByText("把每个单词点亮成星图")).not.toBeInTheDocument();
  });

  it("returns a signed-in user to the complete saved mobile destination", async () => {
    const user = userEvent.setup();
    renderMobileLogin({
      pathname: "/mobile/tools/context-lab",
      search: "?task=42",
      hash: "#answer",
    });

    await user.type(screen.getByLabelText("用户名"), "mobile-user");
    await user.type(screen.getByLabelText("密码"), "secret12");
    await user.click(screen.getByRole("button", { name: "登录" }));

    expect(navigate).toHaveBeenCalledWith(
      "/mobile/tools/context-lab?task=42#answer",
      { replace: true },
    );
  });
});
