import { getAuthProvider } from "@/lib/auth/config";
import { clearLocalSession } from "@/lib/auth/local-session";
import { createClient } from "@/lib/supabase/server";

/** Nie mieszaj sesji — przy logowaniu wyczyść drugi provider. */
export async function clearOtherAuthSessions() {
  if (getAuthProvider() === "local") {
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch {
      /* brak kluczy Supabase */
    }
  } else {
    await clearLocalSession();
  }
}

export async function clearAllAuthSessions() {
  await clearLocalSession();
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    /* ignore */
  }
}
