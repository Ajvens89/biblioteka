import { clearOtherAuthSessions } from "@/lib/auth/clear-sessions";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { setLocalSession, clearLocalSession } from "@/lib/auth/local-session";
import { FOUNDATION_LOAN_EMAIL } from "@/lib/constants";

export function localAuthUserId(email: string) {
  return `local:${email.toLowerCase()}`;
}

export async function loginLocal(email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const profile = await prisma.profile.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!profile?.passwordHash) {
    return { ok: false, error: "Nieprawidłowy e-mail lub hasło." };
  }
  if (profile.isBlocked) {
    return { ok: false, error: "Konto jest zablokowane." };
  }
  if (profile.role !== "ADMIN" && profile.role !== "LIBRARIAN") {
    return {
      ok: false,
      error: `Logowanie jest dostępne tylko dla personelu biblioteki. W sprawie wypożyczeń napisz na ${FOUNDATION_LOAN_EMAIL}.`,
    };
  }
  const valid = await verifyPassword(password, profile.passwordHash);
  if (!valid) return { ok: false, error: "Nieprawidłowy e-mail lub hasło." };

  await clearOtherAuthSessions();
  await setLocalSession(profile.id);
  return { ok: true };
}

export async function registerLocal(
  _email: string,
  _password: string,
  _fullName: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return {
    ok: false,
    error: `Rejestracja publiczna jest wyłączona. Katalog działa w trybie poglądu — napisz na ${FOUNDATION_LOAN_EMAIL}.`,
  };
}

export async function logoutLocal() {
  await clearLocalSession();
}
