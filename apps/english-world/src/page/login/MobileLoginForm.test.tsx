import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Login, { isMobileLoginSurface, resolveAfterLoginPath } from "./Login";
const mocks = vi.hoisted(() => ({ login: vi.fn(), navigate: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ login: mocks.login, isAuthenticated: false }),
}));
vi.mock("@font/api", () => ({
  useMutation: () => ({
    mutateAsync: async () => ({
      captchaId: "mobile-challenge",
      imageDataUrl: "data:image/png;base64,AA",
    }),
  }),
}));
vi.mock("react-router-dom", async (original) => ({
  ...(await original<typeof import("react-router-dom")>()),
  useNavigate: () => mocks.navigate,
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it("mobile uses the secure shared form and preserves complete deep links", async () => {
  render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: "/login",
          state: {
            from: {
              pathname: "/mobile/tools/context-lab",
              search: "?task=42",
              hash: "#answer",
            },
          },
        },
      ]}
    >
      <Login />
    </MemoryRouter>,
  );
  await screen.findByAltText("图形验证码");
  fireEvent.change(screen.getByLabelText("用户名"), {
    target: { value: "mobile-user" },
  });
  fireEvent.change(screen.getByLabelText("密码"), {
    target: { value: "secret12" },
  });
  fireEvent.change(screen.getByLabelText("图形验证码"), {
    target: { value: "ABCDE" },
  });
  fireEvent.click(screen.getByRole("button", { name: "登录" }));
  await waitFor(() =>
    expect(mocks.navigate).toHaveBeenCalledWith(
      "/mobile/tools/context-lab?task=42#answer",
      { replace: true },
    ),
  );
  expect(mocks.login).toHaveBeenCalledWith("mobile-user", "secret12", {
    captchaId: "mobile-challenge",
    captchaCode: "ABCDE",
  });
});
it("retains standalone PWA detection and safe mobile fallback", () => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({ matches: true }),
  });
  expect(isMobileLoginSurface(null)).toBe(true);
  expect(resolveAfterLoginPath(null, true)).toBe("/mobile");
});
