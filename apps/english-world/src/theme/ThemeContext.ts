import { createContext, useContext } from "react";

export type ThemeAppearance = "light" | "dark" | "system";
export type ThemeAccent = "blue" | "green" | "purple";
export type ResolvedAppearance = Exclude<ThemeAppearance, "system">;

export type ThemePreference = {
  appearance: ThemeAppearance;
  accent: ThemeAccent;
};

export type ThemeContextValue = ThemePreference & {
  resolvedAppearance: ResolvedAppearance;
  setAppearance: (appearance: ThemeAppearance) => void;
  setAccent: (accent: ThemeAccent) => void;
};

export const THEME_STORAGE_KEY = "english-world-theme";

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }
  return value;
}
