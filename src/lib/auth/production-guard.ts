import { getAuthProvider } from "@/lib/auth/config";

const PLACEHOLDER_MARKERS = ["[PROJECT_REF]", "your-anon-key", "placeholder"];

function hasRealSupabaseConfig(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!url || !key) return false;
  if (PLACEHOLDER_MARKERS.some((m) => url.includes(m) || key.includes(m))) return false;
  if (url.includes("placeholder.supabase.co")) return false;
  return true;
}

let warned = false;

/**
 * W produkcji blokuje przypadkowe użycie AUTH_PROVIDER=local gdy skonfigurowany jest Supabase.
 * Wyjątek: ALLOW_LOCAL_AUTH_IN_PRODUCTION=true lub brak Supabase (np. Firebase + Neon).
 */
export function assertProductionAuthSafe(): void {
  if (process.env.NODE_ENV !== "production") return;
  // next build ustawia NODE_ENV=production — nie blokuj kompilacji
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const provider = getAuthProvider();
  if (provider !== "local") return;

  // Jedyny sensowny provider bez Supabase — typowy deploy Firebase App Hosting
  if (!hasRealSupabaseConfig()) {
    if (!warned) {
      console.warn("[auth] Produkcja bez Supabase — logowanie lokalne (Neon + sesja cookie).");
      warned = true;
    }
    return;
  }

  if (process.env.ALLOW_LOCAL_AUTH_IN_PRODUCTION === "true") {
    if (!warned) {
      console.warn(
        "[SECURITY] AUTH_PROVIDER=local w produkcji — dozwolone przez ALLOW_LOCAL_AUTH_IN_PRODUCTION.",
      );
      warned = true;
    }
    return;
  }

  const msg =
    "[SECURITY] AUTH_PROVIDER=local jest zablokowany w NODE_ENV=production. " +
    "Ustaw AUTH_PROVIDER=supabase z kluczami Supabase lub ALLOW_LOCAL_AUTH_IN_PRODUCTION=true (tylko świadomie).";

  console.error(msg);
  throw new Error(msg);
}
