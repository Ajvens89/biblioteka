import { getAuthProvider } from "@/lib/auth/config";

let warned = false;

/**
 * W produkcji blokuje przypadkowe użycie AUTH_PROVIDER=local.
 * Wyjątek: ALLOW_LOCAL_AUTH_IN_PRODUCTION=true
 */
export function assertProductionAuthSafe(): void {
  if (process.env.NODE_ENV !== "production") return;
  // next build ustawia NODE_ENV=production — nie blokuj kompilacji
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const provider = getAuthProvider();
  if (provider !== "local") return;

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
