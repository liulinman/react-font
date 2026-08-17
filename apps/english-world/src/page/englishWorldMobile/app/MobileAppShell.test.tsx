import "antd-mobile/es/global";
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { MobileActivityLockProvider } from "../offline/MobileActivityLockContext";
import {
  PwaUpdateProvider,
  type PwaRegistrationAdapter,
} from "../pwa/PwaUpdateContext";
import { MobileAppShell } from "./MobileAppShell";

const registration: PwaRegistrationAdapter = {
  register: () => () => undefined,
};

function ShellProviders({ children }: { children: ReactNode }) {
  return (
    <MobileActivityLockProvider>
      <PwaUpdateProvider registration={registration}>{children}</PwaUpdateProvider>
    </MobileActivityLockProvider>
  );
}

function TestMobileAppShell() {
  return (
    <ShellProviders>
      <MobileAppShell />
    </ShellProviders>
  );
}

function LocationProbe() {
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from;

  return <output data-testid="location">{`${location.pathname}|${from?.pathname ?? ""}`}</output>;
}

describe("MobileAppShell", () => {
  afterEach(cleanup);

  it("renders exactly four tabs and marks the tab for a nested route as active", () => {
    render(
      <MemoryRouter initialEntries={["/mobile/words"]}>
        <Routes>
          <Route path="/mobile" element={<TestMobileAppShell />}>
            <Route path="words" element={<div>words</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "学习",
      "词库",
      "工具",
      "我的",
    ]);
    expect(screen.getByRole("tablist", { name: "主要导航" })).toBeInTheDocument();
    expect(
      document.querySelector(".adm-safe-area-position-bottom"),
    ).toBeInTheDocument();
    expect(
      getComputedStyle(document.querySelector(".mobile-app-shell")!).paddingBottom,
    ).toBe("0px");
    expect(screen.getByRole("tab", { name: "词库" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("records the current route when changing tabs", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/mobile"]}>
        <Routes>
          <Route path="/mobile" element={<TestMobileAppShell />}>
            <Route index element={<LocationProbe />} />
            <Route path="words" element={<LocationProbe />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("tab", { name: "词库" }));

    expect(screen.getByTestId("location")).toHaveTextContent("/mobile/words|/mobile");
  });

  it.each([
    { key: "{Enter}", destination: "词库", path: "/mobile/words" },
    { key: " ", destination: "工具", path: "/mobile/tools" },
  ])("activates $destination once with $key", async ({ key, destination, path }) => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/mobile"]}>
        <Routes>
          <Route path="/mobile" element={<TestMobileAppShell />}>
            <Route index element={<LocationProbe />} />
            <Route path="words" element={<LocationProbe />} />
            <Route path="tools" element={<LocationProbe />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    const tab = screen.getByRole("tab", { name: destination });
    tab.focus();
    await user.keyboard(key);

    expect(screen.getByTestId("location")).toHaveTextContent(`${path}|/mobile`);
    expect(screen.getByRole("tab", { name: destination })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: destination })).toHaveAttribute(
      "tabindex",
      "0",
    );
    expect(screen.getByRole("tab", { name: destination })).toHaveFocus();
  });

  it("moves focus and activation with wrapping arrows, Home, and End", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/mobile"]}>
        <Routes>
          <Route path="/mobile" element={<TestMobileAppShell />}>
            <Route index element={<LocationProbe />} />
            <Route path="words" element={<LocationProbe />} />
            <Route path="tools" element={<LocationProbe />} />
            <Route path="me" element={<LocationProbe />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    screen.getByRole("tab", { name: "学习" }).focus();

    for (const [key, label, path] of [
      ["{ArrowLeft}", "我的", "/mobile/me"],
      ["{ArrowRight}", "学习", "/mobile"],
      ["{End}", "我的", "/mobile/me"],
      ["{Home}", "学习", "/mobile"],
    ] as const) {
      await user.keyboard(key);
      const tab = screen.getByRole("tab", { name: label });
      expect(screen.getByTestId("location")).toHaveTextContent(path);
      expect(tab).toHaveAttribute("aria-selected", "true");
      expect(tab).toHaveAttribute("tabindex", "0");
      expect(tab).toHaveFocus();
      for (const otherTab of screen.getAllByRole("tab").filter((item) => item !== tab)) {
        expect(otherTab).toHaveAttribute("aria-selected", "false");
        expect(otherTab).toHaveAttribute("tabindex", "-1");
      }
    }
  });
});
