// Light/dark theme. The chosen theme is written to localStorage and mirrored
// onto <html data-theme> so CSS can key off a single attribute.
//
// `readStoredTheme` is called from an inline script in index.html before React
// mounts, which is what prevents a light-theme flash on a dark-mode reload.
// Keep the storage key in sync with that script.

export const THEME_STORAGE_KEY = "izwa-theme";

export type Theme = "dark" | "light";

export function isTheme(value: unknown): value is Theme {
  return value === "dark" || value === "light";
}

export function readStoredTheme(): Theme | null {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : null;
  } catch {
    // Private-mode Safari and similar throw on localStorage access. The
    // inline bootstrap script already handles that case, so stay quiet.
    return null;
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Theme still applies for this page view even if it can't be persisted.
  }
}

/** Cycles between light and dark. */
export function toggleTheme(current: Theme): Theme {
  const next: Theme = current === "dark" ? "light" : "dark";
  applyTheme(next);
  return next;
}
