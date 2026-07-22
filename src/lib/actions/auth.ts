"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAudit } from "@/lib/audit";
import { clearAllAuthSessions, clearOtherAuthSessions } from "@/lib/auth/clear-sessions";
import { getAuthProvider } from "@/lib/auth/config";
import { loginLocal, logoutLocal } from "@/lib/auth/local-auth";
import { getActorFromDb, isActorResult, requireActorAdmin } from "@/lib/auth/actor";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, profileSchema } from "@/lib/validations/auth";
import { updateUserRoleSchema, uuidSchema } from "@/lib/validations/ids";
import { z } from "zod";
import { safeRedirectPath } from "@/lib/auth/redirect";
import { FOUNDATION_LOAN_EMAIL } from "@/lib/constants";
import { fail, ok, type ActionResult } from "@/lib/actions/utils";
import {
  checkRateLimit,
  rateLimitErrorMessage,
} from "@/lib/rate-limit/pg-rate-limit";
import { emailRateLimitKey, getRequestClientKey } from "@/lib/rate-limit/request-context";

export async function loginAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Błąd");

  const clientKey = await getRequestClientKey();
  const rl = await checkRateLimit(
    prisma,
    "login",
    emailRateLimitKey(parsed.data.email, clientKey),
  );
  if (!rl.allowed) return fail(rateLimitErrorMessage(rl.retryAfterMs));

  const redirectTo = safeRedirectPath(formData.get("redirect")?.toString(), "/admin");

  if (getAuthProvider() === "local") {
    const result = await loginLocal(parsed.data.email, parsed.data.password);
    if (!result.ok) return fail(result.error);
    revalidatePath("/", "layout");
    redirect(redirectTo);
  }

  await clearOtherAuthSessions();
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return fail("Nieprawidłowy e-mail lub hasło.");

  const actor = await getActorFromDb();
  if (!actor || (actor.role !== "ADMIN" && actor.role !== "LIBRARIAN")) {
    await supabase.auth.signOut();
    await clearAllAuthSessions();
    return fail(
      `Logowanie jest dostępne tylko dla personelu biblioteki. W sprawie wypożyczeń napisz na ${FOUNDATION_LOAN_EMAIL}.`,
    );
  }

  revalidatePath("/", "layout");
  redirect(redirectTo);
}

export async function registerAction(
  _prev: unknown,
  _formData: FormData,
): Promise<ActionResult> {
  return fail(
    `Rejestracja publiczna jest wyłączona. Katalog działa w trybie poglądu — napisz na ${FOUNDATION_LOAN_EMAIL}.`,
  );
}

export async function logoutAction() {
  if (getAuthProvider() === "local") {
    await logoutLocal();
  } else {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  await clearAllAuthSessions();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function updateProfileAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getActorFromDb();
  if (!user) return fail("Brak autoryzacji.");

  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName") || undefined,
    phone: formData.get("phone") || undefined,
    emailNotificationsEnabled: formData.get("emailNotificationsEnabled")?.toString(),
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Błąd");

  await prisma.profile.update({
    where: { id: user.id },
    data: {
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
      emailNotificationsEnabled: parsed.data.emailNotificationsEnabled ?? false,
    },
  });

  await logAudit({
    actorId: user.id,
    action: "UPDATE",
    entityType: "profile",
    entityId: user.id,
  });

  revalidatePath("/moje-konto");
  return ok();
}

export async function updateUserRole(
  profileId: string,
  role: "USER" | "LIBRARIAN" | "ADMIN",
): Promise<ActionResult> {
  const parsed = updateUserRoleSchema.safeParse({ profileId, role });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Błąd walidacji");

  const actorResult = await requireActorAdmin();
  if (!isActorResult(actorResult)) return actorResult;

  if (parsed.data.profileId === actorResult.id && parsed.data.role !== "ADMIN") {
    return fail("Nie możesz odebrać sobie roli administratora.");
  }

  await prisma.profile.update({
    where: { id: parsed.data.profileId },
    data: { role: parsed.data.role },
  });
  await logAudit({
    actorId: actorResult.id,
    action: "UPDATE",
    entityType: "profile",
    entityId: parsed.data.profileId,
    metadata: { role: parsed.data.role },
  });

  revalidatePath("/admin/uzytkownicy");
  return ok();
}

export async function toggleUserBlock(
  profileId: string,
  blocked: boolean,
): Promise<ActionResult> {
  const idParsed = z.object({ profileId: uuidSchema }).safeParse({ profileId });
  if (!idParsed.success) return fail(idParsed.error.issues[0]?.message ?? "Błąd walidacji");

  const actorResult = await requireActorAdmin();
  if (!isActorResult(actorResult)) return actorResult;

  if (idParsed.data.profileId === actorResult.id && blocked) {
    return fail("Nie możesz zablokować własnego konta.");
  }

  await prisma.profile.update({
    where: { id: idParsed.data.profileId },
    data: { isBlocked: blocked },
  });

  await logAudit({
    actorId: actorResult.id,
    action: "UPDATE",
    entityType: "profile",
    entityId: idParsed.data.profileId,
    metadata: { isBlocked: blocked },
  });

  revalidatePath("/admin/uzytkownicy");
  return ok();
}
