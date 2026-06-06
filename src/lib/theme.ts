export const THEME_COOKIE = "theme";
export const THEME_STORAGE_KEY = "theme";

export type Theme = "light" | "dark" | "system";

export function parseTheme(value?: string | null): Theme {
  if (value === "light" || value === "dark" || value === "system") return value;
  return "system";
}

/** Klasy na <html> ustawiane po stronie serwera (bez <script>). */
export function themeHtmlClasses(theme: Theme): string[] {
  if (theme === "dark") return ["dark"];
  if (theme === "light") return ["light"];
  return [];
}

export function writeThemePersistence(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
  try {
    document.cookie = `${THEME_COOKIE}=${theme};path=/;max-age=31536000;SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

export function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    const fromStorage = localStorage.getItem(THEME_STORAGE_KEY);
    if (fromStorage === "light" || fromStorage === "dark" || fromStorage === "system") {
      return fromStorage;
    }
  } catch {
    /* ignore */
  }
  const match = document.cookie.match(new RegExp(`(?:^|; )${THEME_COOKIE}=([^;]*)`));
  return parseTheme(match ? decodeURIComponent(match[1]) : null);
}
