import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { MobileMorePage } from "./MobileMorePage";
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { username: "demo" }, logout: vi.fn() }) }));
vi.mock("@/theme/ThemeSettingsModal", () => ({ ThemeSettingsModal: () => null }));
afterEach(cleanup);
it("opens docs through a real document link rather than SPA routing", () => {
  render(<MemoryRouter><MobileMorePage onOpenAi={vi.fn()} /></MemoryRouter>);
  expect(screen.getByRole("link", { name: /文档中心/ })).toHaveAttribute("href", "/docs/");
});
