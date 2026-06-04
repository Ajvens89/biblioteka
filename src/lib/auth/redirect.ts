/** Bezpieczny redirect wewnątrz aplikacji po logowaniu. */
export function safeRedirectPath(path: string | null | undefined, fallback = "/moje-rezerwacje") {
  if (!path || typeof path !== "string") return fallback;
  const trimmed = path.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;
  return trimmed;
}
