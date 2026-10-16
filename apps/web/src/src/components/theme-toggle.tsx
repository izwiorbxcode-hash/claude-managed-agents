import { useCallback, useEffect, useState } from "react";
import { readStoredTheme, type Theme, toggleTheme } from "../lib/theme";

function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/**
 * Light/dark switch. Until this component mounts, the initial value comes from
 * whatever the inline bootstrap script already put on <html data-theme>, so
 * there is no flash and the toggle never disagrees with the rendered page.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(
    () => readStoredTheme() ?? systemTheme()
  );

  useEffect(() => {
    // Re-sync in case the inline script fell back to the system preference.
    const active = document.documentElement.dataset.theme;
    if (isThemeValue(active)) {
      setTheme(active);
    }
  }, []);

  const onToggle = useCallback(() => {
    setTheme(toggleTheme(theme));
  }, [theme]);

  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      aria-label={`Switch to ${next} mode`}
      className="theme-toggle"
      onClick={onToggle}
      title={`Switch to ${next} mode`}
      type="button"
    >
      <span aria-hidden="true">{theme === "dark" ? "☾" : "☀"}</span>
      <span className="theme-toggle-label">
        {theme === "dark" ? "Dark" : "Light"}
      </span>
    </button>
  );
}

function isThemeValue(value: string | undefined): value is Theme {
  return value === "dark" || value === "light";
}
