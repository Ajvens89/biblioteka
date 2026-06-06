import type { UserRole } from "@prisma/client";
import { getAuthProvider } from "@/lib/auth/config";
import { getLocalSessionProfileId } from "@/lib/auth/local-session";
import { prisma, runPrismaSafe } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { fail, type ActionResult } from "@/lib/actions/utils";

const profileSelect = {
  id: true,
  authUserId: true,
  email: true,
  fullName: true,
  role: true,
  isBlocked: true,
} as const;

export type Actor = {
  id: string;
  authUserId: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  isBlocked: boolean;
};

async function loadLocalActor(): Promise<Actor | null> {
  const profileId = await getLocalSessionProfileId();
  if (!profileId) return null;

  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: profileSelect,
  });
  return profile && !profile.isBlocked ? profile : null;
}

async function loadSupabaseActor(): Promise<Actor | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  let profile = await prisma.profile.findUnique({
    where: { authUserId: user.id },
    select: profileSelect,
  });

  if (!profile) {
    profile = await prisma.profile.create({
      data: {
        authUserId: user.id,
        email: user.email!.toLowerCase(),
        fullName: user.user_metadata?.full_name ?? null,
        role: "USER",
      },
      select: profileSelect,
    });
  }

  if (profile.isBlocked) return null;
  return profile;
}

/** Sesja + świeża rola/status z profiles (źródło prawdy). Nie rzuca przy padniętej bazie. */
export async function getActorFromDb(): Promise<Actor | null> {
  return runPrismaSafe(() =>
    getAuthProvider() === "local" ? loadLocalActor() : loadSupabaseActor(),
  );
}

export async function requireActor(): Promise<Actor | ActionResult<never>> {
  const actor = await getActorFromDb();
  if (!actor) return fail("Brak autoryzacji lub baza danych niedostępna.");
  return actor;
}

export async function requireActorStaff(): Promise<Actor | ActionResult<never>> {
  const actor = await getActorFromDb();
  if (!actor) return fail("Brak autoryzacji lub baza danych niedostępna.");
  if (actor.role !== "LIBRARIAN" && actor.role !== "ADMIN") {
    return fail("Brak uprawnień.");
  }
  return actor;
}

export async function requireActorAdmin(): Promise<Actor | ActionResult<never>> {
  const actor = await getActorFromDb();
  if (!actor) return fail("Brak autoryzacji lub baza danych niedostępna.");
  if (actor.role !== "ADMIN") return fail("Brak uprawnień.");
  return actor;
}

export function isActorResult<T>(v: Actor | ActionResult<T>): v is Actor {
  return "id" in v && "role" in v;
}

export function hasRole(actor: Actor, ...roles: UserRole[]) {
  return roles.includes(actor.role);
}
