"use server";

import { isActorResult, requireActorAdmin } from "@/lib/auth/actor";
import { logAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { fail, ok, type ActionResult } from "@/lib/actions/utils";

const TEST_SUBJECT = "Test powiadomień — Biblioteka Zakątka Fantastyki";
const TEST_HTML =
  "<p>Wysyłanie wiadomości z systemu bibliotecznego działa poprawnie.</p>";

/** Wyślij jeden testowy e-mail na adres zalogowanego ADMIN (Resend). */
export async function sendAdminTestEmailAction(): Promise<ActionResult<{ sent: boolean }>> {
  const actor = await requireActorAdmin();
  if (!isActorResult(actor)) return actor;

  if (!process.env.RESEND_API_KEY) {
    return fail("RESEND_API_KEY nie jest skonfigurowany w środowisku produkcyjnym.");
  }

  const sent = await sendEmail({
    to: actor.email,
    subject: TEST_SUBJECT,
    html: TEST_HTML,
  });

  await logAudit({
    actorId: actor.id,
    action: "UPDATE",
    entityType: "email_test",
    metadata: { to: actor.email, sent, subject: TEST_SUBJECT },
  });

  if (!sent) return fail("Resend nie potwierdził wysyłki. Sprawdź logi serwera.");
  return ok({ sent: true });
}
