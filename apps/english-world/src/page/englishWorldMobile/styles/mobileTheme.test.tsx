import "@testing-library/jest-dom/vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { THEME_STORAGE_KEY } from "@/theme/ThemeContext";
import { ThemeProvider } from "@/theme/ThemeProvider";
import "./mobile-tokens.css";
import "./mobile-shell.css";
import "@/page/login/Login.css";

type ThemeCase = {
  name: string;
  appearance: "light" | "dark" | "system";
  systemDark: boolean;
  resolved: "light" | "dark";
  surfaceBase: string;
  surfaceRaised: string;
  inkPrimary: string;
};

const themeCases: ThemeCase[] = [
  {
    name: "explicit light",
    appearance: "light",
    systemDark: true,
    resolved: "light",
    surfaceBase: "#f2f2f7",
    surfaceRaised: "#ffffff",
    inkPrimary: "#000000",
  },
  {
    name: "explicit dark",
    appearance: "dark",
    systemDark: false,
    resolved: "dark",
    surfaceBase: "#000000",
    surfaceRaised: "#1c1c1e",
    inkPrimary: "#ffffff",
  },
  {
    name: "system-resolved dark",
    appearance: "system",
    systemDark: true,
    resolved: "dark",
    surfaceBase: "#000000",
    surfaceRaised: "#1c1c1e",
    inkPrimary: "#ffffff",
  },
];

function mockSystemTheme(dark: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: dark,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
}

describe("mobile semantic theme spine", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    delete document.documentElement.dataset.theme;
    delete document.documentElement.dataset.accent;
    document.documentElement.style.colorScheme = "";
    vi.restoreAllMocks();
  });

  it.each(themeCases)(
    "keeps the shell and mobile login on ThemeProvider tokens for $name",
    async ({ appearance, systemDark, resolved, surfaceBase, surfaceRaised, inkPrimary }) => {
      mockSystemTheme(systemDark);
      window.localStorage.setItem(
        THEME_STORAGE_KEY,
        JSON.stringify({ appearance, accent: "blue" }),
      );

      const { container } = render(
        <ThemeProvider>
          <div className="mobile-app-shell">shell</div>
          <main className="mobile-login">
            <section className="mobile-login__surface">login</section>
          </main>
        </ThemeProvider>,
      );

      await waitFor(() => {
        expect(document.documentElement).toHaveAttribute("data-theme", resolved);
      });

      const rootStyle = getComputedStyle(document.documentElement);
      expect(rootStyle.getPropertyValue("--mobile-surface-base")).toBe(surfaceBase);
      expect(rootStyle.getPropertyValue("--mobile-surface-raised")).toBe(surfaceRaised);
      expect(rootStyle.getPropertyValue("--mobile-ink-primary")).toBe(inkPrimary);
      expect(document.documentElement.style.colorScheme).toBe(resolved);

      const shell = container.querySelector(".mobile-app-shell")!;
      const login = container.querySelector(".mobile-login")!;
      const loginSurface = container.querySelector(".mobile-login__surface")!;
      expect(getComputedStyle(shell).background).toBe("var(--mobile-surface-base)");
      expect(getComputedStyle(shell).color).toBe("var(--mobile-ink-primary)");
      expect(getComputedStyle(login).background).toBe("var(--mobile-surface-base)");
      expect(getComputedStyle(login).color).toBe("var(--mobile-ink-primary)");
      expect(getComputedStyle(loginSurface).background).toBe(
        "var(--mobile-surface-raised)",
      );
    },
  );
});
