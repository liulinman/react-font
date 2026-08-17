import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import "../styles/mobile-tokens.css";
import "../styles/mobile-shell.css";
import { MobilePage } from "./MobilePage";
import { MobileStateView } from "./MobileStateView";
import { SafeAreaActions } from "./SafeAreaActions";

describe("mobile shared contracts", () => {
  afterEach(cleanup);

  it("keeps editable controls at the iOS zoom-safe type size inside the mobile shell", () => {
    render(
      <div className="mobile-app-shell">
        <input aria-label="draft" />
        <textarea aria-label="notes" />
        <select aria-label="level"><option>Beginner</option></select>
        <div aria-label="answer" contentEditable role="textbox" />
      </div>,
    );

    for (const label of ["draft", "notes", "level", "answer"]) {
      expect(getComputedStyle(screen.getByLabelText(label)).fontSize).toBe("16px");
    }
  });

  it("keeps actionable controls at the 44 point mobile target inside the mobile shell", () => {
    render(
      <div className="mobile-app-shell">
        <button type="button">Save</button>
        <div aria-label="Open details" role="button" tabIndex={0} />
        <div aria-label="Library" role="tab" tabIndex={0} />
        <a href="#words">Words</a>
        <div aria-label="Open word" role="link" tabIndex={0} />
        <input aria-label="Include learned words" type="checkbox" />
        <input aria-label="Review now" type="radio" />
        <div aria-label="Study reminders" role="switch" tabIndex={0} />
      </div>,
    );

    for (const control of [
      screen.getByRole("button", { name: "Save" }),
      screen.getByRole("button", { name: "Open details" }),
      screen.getByRole("tab", { name: "Library" }),
      screen.getByRole("link", { name: "Words" }),
      screen.getByRole("link", { name: "Open word" }),
      screen.getByRole("checkbox", { name: "Include learned words" }),
      screen.getByRole("radio", { name: "Review now" }),
      screen.getByRole("switch", { name: "Study reminders" }),
    ]) {
      expect(Number.parseFloat(getComputedStyle(control).minHeight)).toBeGreaterThanOrEqual(44);
      expect(Number.parseFloat(getComputedStyle(control).minWidth)).toBeGreaterThanOrEqual(44);
    }

    expect(getComputedStyle(screen.getByRole("link", { name: "Words" })).display).not.toBe("inline");
  });

  it("exposes page actions as a labelled safe-area region", () => {
    render(
      <div className="mobile-app-shell">
        <SafeAreaActions><button type="button">Next</button></SafeAreaActions>
      </div>,
    );

    expect(screen.getByRole("region", { name: "页面操作" })).toHaveClass("mobile-safe-area-actions");
  });

  it("keeps a growing action area in normal flow after the final page content", () => {
    render(
      <div className="mobile-app-shell">
        <MobilePage title="词库">
          <p>Final page content</p>
          <SafeAreaActions style={{ width: "100px" }}>
            <button type="button">Save draft</button>
            <button type="button">Continue study</button>
            <button type="button">Review later</button>
          </SafeAreaActions>
        </MobilePage>
      </div>,
    );

    const page = screen.getByRole("region", { name: "词库" });
    const actions = screen.getByRole("region", { name: "页面操作" });

    expect(page.lastElementChild).toBe(actions);
    expect(actions.previousElementSibling).toHaveTextContent("Final page content");
    expect(getComputedStyle(actions).position).toBe("static");
    expect(getComputedStyle(actions).flexWrap).toBe("wrap");
  });

  it.each([
    ["loading", "正在加载"],
    ["empty", "暂无内容"],
    ["offline", "当前离线"],
    ["error", "暂时无法加载"],
  ] as const)("announces the %s state with text as well as styling", (state, message) => {
    render(
      <div className="mobile-app-shell">
        <MobileStateView state={state} />
      </div>,
    );

    expect(screen.getByText(message)).toBeVisible();
    expect(screen.getByTestId("mobile-state-view")).toHaveAttribute("data-state", state);
  });

  it("gives mobile page content a labelled, padded page container", () => {
    render(
      <div className="mobile-app-shell">
        <MobilePage title="词库"><p>Content</p></MobilePage>
      </div>,
    );

    expect(screen.getByRole("region", { name: "词库" })).toHaveClass("mobile-page");
    expect(screen.getByRole("heading", { name: "词库" })).toBeVisible();
  });
});
