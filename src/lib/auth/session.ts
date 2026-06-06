import type { UserRole } from "@prisma/client";
import { getActorFromDb, type Actor } from "@/lib/auth/actor";

export type SessionUser = {
  id: string;
  authUserId: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  isBlocked: boolean;
};

function toSessionUser(profile: Actor): SessionUser {
  return {
    id: profile.id,
    authUserId: profile.authUserId,
    email: profile.email,
    fullName: profile.fullName,
    role: profile.role,
    isBlocked: profile.isBlocked,
  };
}

/** Nie rzuca przy padniętej bazie — zwraca null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const actor = await getActorFromDb();
  return actor ? toSessionUser(actor) : null;
}

export function isStaff(role: UserRole) {
  return role === "LIBRARIAN" || role === "ADMIN";
}

export function isAdmin(role: UserRole) {
  return role === "ADMIN";
}
