import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "./ThemeProvider";
import { THEME_STORAGE_KEY, useTheme } from "./ThemeContext";

function ThemeProbe() {
  const { appearance, accent, resolvedAppearance } = useTheme();
  return <div>{`${appearance}:${accent}:${resolvedAppearance}`}</div>;
}

function mockSystemTheme(dark: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: dark,
      media: "(prefers-color-scheme: dark)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
}

describe("ThemeProvider", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    delete document.documentElement.dataset.theme;
    delete document.documentElement.dataset.accent;
  });

  it("restores a persisted dark accent theme", async () => {
    mockSystemTheme(false);
    window.localStorage.setItem(
      THEME_STORAGE_KEY,
      JSON.stringify({ appearance: "dark", accent: "green" }),
    );

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(screen.getByText("dark:green:dark")).toBeInTheDocument();
    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute("data-theme", "dark");
      expect(document.documentElement).toHaveAttribute("data-accent", "green");
    });
  });

  it("resolves system appearance from the operating system", async () => {
    mockSystemTheme(true);
    window.localStorage.setItem(
      THEME_STORAGE_KEY,
      JSON.stringify({ appearance: "system", accent: "purple" }),
    );

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(screen.getByText("system:purple:dark")).toBeInTheDocument();
    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    });
  });

  it("falls back to the light blue theme for invalid storage", () => {
    mockSystemTheme(true);
    window.localStorage.setItem(THEME_STORAGE_KEY, "not-json");

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(screen.getByText("light:blue:light")).toBeInTheDocument();
  });
});
