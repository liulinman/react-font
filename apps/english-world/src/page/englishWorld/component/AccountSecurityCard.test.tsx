import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AccountSecurityCard } from "./AccountSecurityCard";
const mocks = vi.hoisted(() => ({
  change: vi.fn(),
  logout: vi.fn(),
  navigate: vi.fn(),
}));
vi.mock("@font/api", () => ({
  useMutation: () => ({ mutateAsync: mocks.change }),
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    logout: mocks.logout,
    user: { username: "learner", email: "a@test.com" },
  }),
}));
vi.mock("react-router-dom", () => ({ useNavigate: () => mocks.navigate }));
beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});
afterEach(() => {
  vi.unstubAllGlobals();
  cleanup();
  vi.clearAllMocks();
});
it("changes own password then clears local auth and requires login", async () => {
  mocks.change.mockResolvedValue(null);
  render(<AccountSecurityCard />);
  fireEvent.click(screen.getByRole("button", { name: "修改密码" }));
  for (const [label, value] of [
    ["当前密码", "oldpass123"],
    ["新密码", "newpass123"],
    ["确认新密码", "newpass123"],
  ])
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: "保存新密码" }));
  expect(
    await screen.findByText("密码已修改，所有学习设备已退出。请重新登录。"),
  ).toBeInTheDocument();
  expect(mocks.change).toHaveBeenCalledWith({
    currentPassword: "oldpass123",
    password: "newpass123",
  });
  expect(mocks.logout).toHaveBeenCalled();
  expect(mocks.navigate).toHaveBeenCalledWith("/login", { replace: true });
});
it("reveals passwords accessibly and focuses invalid new password", () => {
  render(<AccountSecurityCard />);
  fireEvent.click(screen.getByRole("button", { name: "修改密码" }));
  const input = screen.getByLabelText("新密码");
  fireEvent.click(screen.getByRole("button", { name: "显示新密码" }));
  expect(input).toHaveAttribute("type", "text");
  fireEvent.submit(input.closest("form")!);
  expect(input).toHaveFocus();
});
