/** Dozwolone ścieżki docelowe po logowaniu / OAuth (dokładne dopasowanie). */
const ALLOWED_EXACT = new Set([
  "/",
  "/katalog",
  "/admin",
  "/moje-konto",
  "/moje-rezerwacje",
  "/login",
  "/rejestracja",
  "/regulamin",
  "/kontakt",
]);

/** Bezpieczne prefiksy wewnętrznych ścieżek (np. karta gry z hash). */
const SAFE_PREFIXES = ["/gry/", "/katalog", "/admin", "/login", "/rejestracja"] as const;

const DANGEROUS_SCHEME = /^(javascript|data|vbscript):/i;

/**
 * Bezpieczny redirect wewnątrz aplikacji po logowaniu / OAuth.
 * Odrzuca zewnętrzne hosty, protokoły i ścieżki z //.
 */
export function safeRedirectPath(
  path: string | null | undefined,
  fallback = "/admin",
): string {
  if (!path || typeof path !== "string") return fallback;

  let trimmed = path.trim();
  if (!trimmed) return fallback;

  try {
    trimmed = decodeURIComponent(trimmed);
  } catch {
    return fallback;
  }

  if (DANGEROUS_SCHEME.test(trimmed)) return fallback;
  if (trimmed.includes("://")) return fallback;
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("\\")) return fallback;
  if (trimmed.includes("@")) return fallback;

  const pathOnly = trimmed.split("#")[0]?.split("?")[0] ?? trimmed;
  if (/^\/\w+:/.test(pathOnly)) return fallback;

  if (ALLOWED_EXACT.has(pathOnly)) return trimmed;

  if (SAFE_PREFIXES.some((prefix) => pathOnly === prefix || pathOnly.startsWith(prefix))) {
    return trimmed;
  }

  return fallback;
}
