import type { UserRole } from "@prisma/client";
import { getAuthProvider } from "@/lib/auth/config";
import { getLocalSessionProfileId } from "@/lib/auth/local-session";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export type SessionUser = {
  id: string;
  authUserId: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  isBlocked: boolean;
};

function toSessionUser(profile: {
  id: string;
  authUserId: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  isBlocked: boolean;
}): SessionUser {
  return {
    id: profile.id,
    authUserId: profile.authUserId,
    email: profile.email,
    fullName: profile.fullName,
    role: profile.role,
    isBlocked: profile.isBlocked,
  };
}

async function getLocalSessionUser(): Promise<SessionUser | null> {
  const profileId = await getLocalSessionProfileId();
  if (!profileId) return null;

  const profile = await prisma.profile.findUnique({ where: { id: profileId } });
  if (!profile || profile.isBlocked) return null;
  return toSessionUser(profile);
}

async function getSupabaseSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  let profile = await prisma.profile.findUnique({
    where: { authUserId: user.id },
  });

  if (!profile) {
    profile = await prisma.profile.create({
      data: {
        authUserId: user.id,
        email: user.email.toLowerCase(),
        fullName: user.user_metadata?.full_name ?? null,
        role: "USER",
      },
    });
  }

  if (profile.isBlocked) return null;
  return toSessionUser(profile);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    if (getAuthProvider() === "local") {
      return getLocalSessionUser();
    }
    return getSupabaseSessionUser();
  } catch (e) {
    console.error("getSessionUser failed", e);
    return null;
  }
}

export function isStaff(role: UserRole) {
  return role === "LIBRARIAN" || role === "ADMIN";
}

export function isAdmin(role: UserRole) {
  return role === "ADMIN";
}
