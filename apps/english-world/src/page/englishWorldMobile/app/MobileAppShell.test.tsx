import "antd-mobile/es/global";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { MobileAppShell } from "./MobileAppShell";

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
          <Route path="/mobile" element={<MobileAppShell />}>
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
          <Route path="/mobile" element={<MobileAppShell />}>
            <Route index element={<LocationProbe />} />
            <Route path="words" element={<LocationProbe />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("tab", { name: "词库" }));

    expect(screen.getByTestId("location")).toHaveTextContent("/mobile/words|/mobile");
  });
});
