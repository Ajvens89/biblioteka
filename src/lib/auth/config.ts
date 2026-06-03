export type AuthProvider = "supabase" | "local";

const PLACEHOLDER_MARKERS = ["[PROJECT_REF]", "your-anon-key", "placeholder"];

function hasRealSupabaseConfig(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!url || !key) return false;
  if (PLACEHOLDER_MARKERS.some((m) => url.includes(m) || key.includes(m))) return false;
  if (url.includes("placeholder.supabase.co")) return false;
  return true;
}

/**
 * Aktywny provider auth.
 * Produkcja: domyślnie supabase jeśli są klucze; local tylko z AUTH_PROVIDER=local + opcjonalnie ALLOW_*.
 */
export function getAuthProvider(): AuthProvider {
  const forced = process.env.AUTH_PROVIDER?.toLowerCase();

  if (process.env.NODE_ENV === "production") {
    if (forced === "local") {
      return "local";
    }
    if (forced === "supabase" || hasRealSupabaseConfig()) {
      return "supabase";
    }
    return "local";
  }

  if (forced === "local" || forced === "supabase") {
    return forced;
  }
  return hasRealSupabaseConfig() ? "supabase" : "local";
}

export function isSupabaseAuthEnabled(): boolean {
  return getAuthProvider() === "supabase";
}

export function isLocalAuthEnabled(): boolean {
  return getAuthProvider() === "local";
}

export { SESSION_COOKIE } from "@/lib/auth/session-token";
