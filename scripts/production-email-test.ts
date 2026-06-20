/**
 * Test wysyłki e-mail (Resend) — tylko ajvens@gmail.com.
 * Wymaga RESEND_API_KEY w .env.
 *   npm run test:production-email
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import {
  passwordResetEmail,
  reservationConfirmedEmail,
  returnReminderEmail,
  sendEmail,
} from "../src/lib/email";
import { createPasswordResetToken } from "../src/lib/services/password-reset";

const ADMIN_EMAIL = "ajvens@gmail.com";

async function main() {
  if (!process.env.RESEND_API_KEY) {
    console.error("Brak RESEND_API_KEY w .env");
    process.exit(2);
  }

  const prisma = new PrismaClient();
  const admin = await prisma.profile.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!admin?.passwordHash) {
    console.error(`Brak konta local z hasłem: ${ADMIN_EMAIL}`);
    process.exit(2);
  }

  console.log("=== 1. Testowy e-mail ===");
  const testOk = await sendEmail({
    to: ADMIN_EMAIL,
    subject: "Test powiadomień — Biblioteka Zakątka Fantastyki",
    html: "<p>Wysyłanie wiadomości z systemu bibliotecznego działa poprawnie.</p>",
  });
  console.log(testOk ? "OK: wysłano" : "BŁĄD: sendEmail zwróciło false");

  console.log("\n=== 2. Reset hasła (bez logowania tokenu) ===");
  const { token } = await createPasswordResetToken(prisma, admin.id);
  const appUrl =
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "https://bookshelf--bibl-2c364.europe-west4.hosted.app";
  const resetUrl = `${appUrl}/reset-hasla/${encodeURIComponent(token)}`;
  const resetMail = passwordResetEmail(resetUrl);
  const resetOk = await sendEmail({
    to: ADMIN_EMAIL,
    subject: resetMail.subject,
    html: resetMail.html,
  });
  console.log(resetOk ? "OK: e-mail resetu wysłany (token nie logowany)" : "BŁĄD reset");

  console.log("\n=== 3. Przypomnienie o zwrocie ===");
  const reminder = returnReminderEmail("Gra testowa", new Date().toLocaleDateString("pl-PL"));
  const reminderOk = await sendEmail({
    to: ADMIN_EMAIL,
    subject: reminder.subject,
    html: reminder.html,
  });
  console.log(reminderOk ? "OK: przypomnienie wysłane" : "BŁĄD przypomnienie");

  console.log("\n=== 4. Potwierdzenie rezerwacji ===");
  const resMail = reservationConfirmedEmail("Gra testowa");
  const resOk = await sendEmail({
    to: ADMIN_EMAIL,
    subject: resMail.subject,
    html: resMail.html,
  });
  console.log(resOk ? "OK: rezerwacja wysłana" : "BŁĄD rezerwacja");

  await prisma.$disconnect();
  process.exit(testOk && resetOk && reminderOk && resOk ? 0 : 1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
