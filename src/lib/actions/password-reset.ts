"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthProvider } from "@/lib/auth/config";
import { clearAllAuthSessions } from "@/lib/auth/clear-sessions";
import { prisma } from "@/lib/db";
import { passwordResetEmail, sendEmail } from "@/lib/email";
import {
  checkRateLimit,
  rateLimitErrorMessage,
} from "@/lib/rate-limit/pg-rate-limit";
import { emailRateLimitKey, getRequestClientKey } from "@/lib/rate-limit/request-context";
import {
  createPasswordResetToken,
  resetPasswordWithToken,
} from "@/lib/services/password-reset";
import { fail, fromServiceError, ok, type ActionResult } from "@/lib/actions/utils";
import {
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
} from "@/lib/validations/password-reset";

const GENERIC_RESET_MSG =
  "Jeśli konto z tym adresem istnieje, wysłaliśmy link do resetu hasła. Sprawdź skrzynkę e-mail.";

export async function requestPasswordResetAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  if (getAuthProvider() !== "local") {
    return fail("Reset hasła jest dostępny tylko dla logowania lokalnego.");
  }

  const parsed = passwordResetRequestSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Błąd");

  const clientKey = await getRequestClientKey();
  const rl = await checkRateLimit(
    prisma,
    "password-reset-request",
    emailRateLimitKey(parsed.data.email, clientKey),
  );
  if (!rl.allowed) return fail(rateLimitErrorMessage(rl.retryAfterMs));

  const profile = await prisma.profile.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });

  if (profile?.passwordHash) {
    const { token } = await createPasswordResetToken(prisma, profile.id);
    const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";
    const resetUrl = `${appUrl}/reset-hasla/${encodeURIComponent(token)}`;
    const email = passwordResetEmail(resetUrl);
    await sendEmail({ to: profile.email, subject: email.subject, html: email.html });
  }

  return ok(undefined, GENERIC_RESET_MSG);
}

export async function confirmPasswordResetAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = passwordResetConfirmSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Błąd");

  const clientKey = await getRequestClientKey();
  const rl = await checkRateLimit(prisma, "password-reset-confirm", clientKey);
  if (!rl.allowed) return fail(rateLimitErrorMessage(rl.retryAfterMs));

  try {
    await resetPasswordWithToken(prisma, parsed.data.token, parsed.data.password);
    await clearAllAuthSessions();
    revalidatePath("/", "layout");
    redirect("/login?reset=1");
  } catch (e) {
    return fromServiceError(e);
  }
}
