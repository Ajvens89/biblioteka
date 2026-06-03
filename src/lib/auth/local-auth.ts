import { clearOtherAuthSessions } from "@/lib/auth/clear-sessions";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { setLocalSession, clearLocalSession } from "@/lib/auth/local-session";

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
  const valid = await verifyPassword(password, profile.passwordHash);
  if (!valid) return { ok: false, error: "Nieprawidłowy e-mail lub hasło." };

  await clearOtherAuthSessions();
  await setLocalSession(profile.id);
  return { ok: true };
}

export async function registerLocal(
  email: string,
  password: string,
  fullName: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const normalized = email.toLowerCase();
  const existing = await prisma.profile.findUnique({ where: { email: normalized } });
  if (existing) return { ok: false, error: "Konto z tym adresem e-mail już istnieje." };

  const passwordHash = await hashPassword(password);
  const profile = await prisma.profile.create({
    data: {
      authUserId: localAuthUserId(normalized),
      email: normalized,
      fullName,
      role: "USER",
      passwordHash,
    },
  });

  await clearOtherAuthSessions();
  await setLocalSession(profile.id);
  return { ok: true };
}

export async function logoutLocal() {
  await clearLocalSession();
}
