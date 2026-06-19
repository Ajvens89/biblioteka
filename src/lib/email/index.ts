import { Resend } from "resend";

export type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Biblioteka Zakątka <onboarding@resend.dev>";

  if (!apiKey) {
    console.info("[Email mock]", payload.to, payload.subject);
    return false;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
  });

  if (error) {
    console.error("Email send failed", error);
    return false;
  }
  return true;
}

export function reservationConfirmedEmail(gameTitle: string) {
  return {
    subject: `Potwierdzenie rezerwacji: ${gameTitle}`,
    html: `<p>Twoja rezerwacja gry <strong>${gameTitle}</strong> została przyjęta i oczekuje na zatwierdzenie.</p>`,
  };
}

export function readyForPickupEmail(gameTitle: string) {
  return {
    subject: `Gra gotowa do odbioru: ${gameTitle}`,
    html: `<p>Gra <strong>${gameTitle}</strong> jest gotowa do odbioru w bibliotece Zakątka Fantastyki.</p>`,
  };
}

export function returnReminderEmail(gameTitle: string, dueDate: string) {
  return {
    subject: `Przypomnienie o zwrocie: ${gameTitle}`,
    html: `<p>Przypominamy o zwrocie gry <strong>${gameTitle}</strong> do ${dueDate}.</p>`,
  };
}

export function overdueEmail(gameTitle: string) {
  return {
    subject: `Przeterminowany zwrot: ${gameTitle}`,
    html: `<p>Gra <strong>${gameTitle}</strong> jest przeterminowana. Skontaktuj się z biblioteką.</p>`,
  };
}

export function passwordResetEmail(resetUrl: string) {
  return {
    subject: "Reset hasła — Biblioteka Zakątka Fantastyki",
    html: `<p>Otrzymaliśmy prośbę o reset hasła.</p>
<p><a href="${resetUrl}">Ustaw nowe hasło</a></p>
<p>Link jest ważny przez 60 minut. Jeśli to nie Ty — zignoruj tę wiadomość.</p>`,
  };
}

export function reservationExpiredEmail(gameTitle: string) {
  return {
    subject: `Rezerwacja wygasła: ${gameTitle}`,
    html: `<p>Rezerwacja gry <strong>${gameTitle}</strong> wygasła z powodu przekroczenia terminu odbioru.</p>`,
  };
}
