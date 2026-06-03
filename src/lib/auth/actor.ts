import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSessionUser, type SessionUser } from "@/lib/auth/session";
import { fail, type ActionResult } from "@/lib/actions/utils";

export type Actor = SessionUser;

/** Sesja + świeża rola/status z profiles (źródło prawdy). */
export async function getActorFromDb(): Promise<Actor | null> {
  const session = await getSessionUser();
  if (!session) return null;

  const profile = await prisma.profile.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      authUserId: true,
      email: true,
      fullName: true,
      role: true,
      isBlocked: true,
    },
  });

  if (!profile || profile.isBlocked) return null;
  return profile;
}

export async function requireActor(): Promise<Actor | ActionResult<never>> {
  const actor = await getActorFromDb();
  if (!actor) return fail("Brak autoryzacji.");
  return actor;
}

export async function requireActorStaff(): Promise<Actor | ActionResult<never>> {
  const actor = await getActorFromDb();
  if (!actor) return fail("Brak autoryzacji.");
  if (actor.role !== "LIBRARIAN" && actor.role !== "ADMIN") {
    return fail("Brak uprawnień.");
  }
  return actor;
}

export async function requireActorAdmin(): Promise<Actor | ActionResult<never>> {
  const actor = await getActorFromDb();
  if (!actor) return fail("Brak autoryzacji.");
  if (actor.role !== "ADMIN") return fail("Brak uprawnień.");
  return actor;
}

export function isActorResult<T>(v: Actor | ActionResult<T>): v is Actor {
  return "id" in v && "role" in v;
}

export function hasRole(actor: Actor, ...roles: UserRole[]) {
  return roles.includes(actor.role);
}
