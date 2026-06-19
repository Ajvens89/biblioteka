import { getAuthProvider } from "@/lib/auth/config";

export function AuthModeBanner() {
  const mode = getAuthProvider();
  if (mode === "supabase") return null;

  if (process.env.NODE_ENV === "production") {
    return (
      <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
        <strong>Tryb lokalny</strong> — logowanie przez bazę PostgreSQL (bez Supabase).
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
      <strong>Środowisko deweloperskie</strong> — tryb lokalny. Konta testowe tworzy{" "}
      <code className="text-xs">npm run db:seed</code> (szczegóły w README, nie na produkcji).
    </div>
  );
}
