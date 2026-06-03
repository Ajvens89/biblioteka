import { cookies } from "next/headers";
import { SESSION_COOKIE, signProfileSession, verifyProfileSession } from "@/lib/auth/session-token";

export async function getLocalSessionProfileId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return verifyProfileSession(token);
}

export async function setLocalSession(profileId: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, await signProfileSession(profileId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearLocalSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
