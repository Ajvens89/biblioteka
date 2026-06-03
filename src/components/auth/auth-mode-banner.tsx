import { getAuthProvider } from "@/lib/auth/config";

export function AuthModeBanner() {
  const mode = getAuthProvider();
  if (mode === "supabase") return null;

  return (
    <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
      <strong>Tryb lokalny</strong> — logowanie przez bazę PostgreSQL (bez Supabase).
      Po seedzie użyj kont testowych, np. <code className="text-xs">admin@example.com</code> /{" "}
      <code className="text-xs">Admin123!</code>. Instrukcja Supabase:{" "}
      <code className="text-xs">docs/SUPABASE.md</code>.
    </div>
  );
}
