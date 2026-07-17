import {
  ConfigProvider,
  theme as antdTheme,
  type ThemeConfig,
} from "antd";
import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  THEME_STORAGE_KEY,
  ThemeContext,
  type ResolvedAppearance,
  type ThemeAccent,
  type ThemeAppearance,
  type ThemeContextValue,
  type ThemePreference,
} from "./ThemeContext";
import "./theme.css";

const DEFAULT_PREFERENCE: ThemePreference = {
  appearance: "light",
  accent: "blue",
};

const ACCENT_COLORS: Record<ThemeAccent, string> = {
  blue: "#2563eb",
  green: "#16a34a",
  purple: "#7c3aed",
};

function isAppearance(value: unknown): value is ThemeAppearance {
  return value === "light" || value === "dark" || value === "system";
}

function isAccent(value: unknown): value is ThemeAccent {
  return value === "blue" || value === "green" || value === "purple";
}

function readPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (!stored) return DEFAULT_PREFERENCE;
    const parsed = JSON.parse(stored) as Partial<ThemePreference>;
    return {
      appearance: isAppearance(parsed.appearance)
        ? parsed.appearance
        : DEFAULT_PREFERENCE.appearance,
      accent: isAccent(parsed.accent)
        ? parsed.accent
        : DEFAULT_PREFERENCE.accent,
    };
  } catch {
    return DEFAULT_PREFERENCE;
  }
}

function getSystemAppearance(): ResolvedAppearance {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>(readPreference);
  const [systemAppearance, setSystemAppearance] =
    useState<ResolvedAppearance>(getSystemAppearance);

  useEffect(() => {
    const mediaQuery = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mediaQuery) return;

    const handleChange = (event: MediaQueryListEvent) => {
      setSystemAppearance(event.matches ? "dark" : "light");
    };
    mediaQuery.addEventListener?.("change", handleChange);
    return () => mediaQuery.removeEventListener?.("change", handleChange);
  }, []);

  const resolvedAppearance =
    preference.appearance === "system"
      ? systemAppearance
      : preference.appearance;

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedAppearance;
    document.documentElement.dataset.accent = preference.accent;
    document.documentElement.style.colorScheme = resolvedAppearance;
  }, [preference.accent, resolvedAppearance]);

  const updatePreference = (next: ThemePreference) => {
    setPreference(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // The in-memory selection still works when storage is unavailable.
    }
  };

  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      ...preference,
      resolvedAppearance,
      setAppearance: (appearance) =>
        updatePreference({ ...preference, appearance }),
      setAccent: (accent) => updatePreference({ ...preference, accent }),
    }),
    [preference, resolvedAppearance],
  );

  const themeConfig = useMemo<ThemeConfig>(
    () => ({
      algorithm:
        resolvedAppearance === "dark"
          ? antdTheme.darkAlgorithm
          : antdTheme.defaultAlgorithm,
      token: {
        colorPrimary: ACCENT_COLORS[preference.accent],
        borderRadius: 8,
      },
    }),
    [preference.accent, resolvedAppearance],
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      <ConfigProvider theme={themeConfig}>{children}</ConfigProvider>
    </ThemeContext.Provider>
  );
}
