import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { RouterProvider, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { router } from "./router";

const authState = {
  isAuthenticated: true,
  loading: false,
  checkAuth: vi.fn(),
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("@/page/englishWorldMobile/EnglishWorldMobile", () => ({
  default: () => <div>legacy mobile page</div>,
}));

vi.mock("@/page/login/Login", () => ({
  default: () => {
    const location = useLocation();
    const from = (location.state as { from?: { pathname?: string } } | null)?.from;

    return <output data-testid="login-location">{`${location.pathname}|${from?.pathname ?? ""}`}</output>;
  },
}));

describe("application router mobile branch", () => {
  afterEach(() => {
    cleanup();
    authState.isAuthenticated = true;
    authState.loading = false;
  });

  it("replaces the legacy mobile entry with the lazy four-tab application", async () => {
    render(<RouterProvider router={router} />);

    await router.navigate("/englishWorldMobile");

    expect(await screen.findByRole("tab", { name: "学习" })).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(4);
    expect(screen.queryByText("legacy mobile page")).not.toBeInTheDocument();
  });

  it("hands an unauthenticated mobile deep link to login without the desktop spinner", async () => {
    authState.isAuthenticated = false;
    render(<RouterProvider router={router} />);

    await router.navigate("/mobile/words");

    await waitFor(() => {
      expect(screen.getByTestId("login-location")).toHaveTextContent(
        "/login|/mobile/words",
      );
    });
    expect(document.querySelector(".ant-spin")).not.toBeInTheDocument();
  });
});
