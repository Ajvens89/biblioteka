import type { PrismaClient } from "@prisma/client";
import { logAudit } from "@/lib/audit";
import { overdueEmail, returnReminderEmail } from "@/lib/email";
import { notifyUser } from "@/lib/notifications";

export type MarkOverdueLoansResult = { marked: number };

/** Oznacza ACTIVE po terminie jako OVERDUE (idempotentne). */
export async function markOverdueLoansJob(
  db: PrismaClient,
  options?: { actorId?: string | null },
): Promise<MarkOverdueLoansResult> {
  const now = new Date();
  const loans = await db.loan.findMany({
    where: { status: "ACTIVE", dueAt: { lt: now } },
    include: { user: true, copy: { include: { game: true } } },
  });

  let marked = 0;
  for (const loan of loans) {
    const updated = await db.loan.updateMany({
      where: { id: loan.id, status: "ACTIVE" },
      data: { status: "OVERDUE" },
    });
    if (updated.count === 0) continue;

    marked += 1;

    if (!loan.overdueNotifiedAt) {
      const email = overdueEmail(loan.copy.game.title);
      await notifyUser({
        userId: loan.userId,
        email: loan.user.email,
        type: "OVERDUE_RETURN",
        title: "Przeterminowany zwrot",
        body: `Gra „${loan.copy.game.title}” jest po terminie zwrotu.`,
        linkUrl: "/moje-konto",
        emailSubject: email.subject,
        emailHtml: email.html,
      });
      await db.loan.update({
        where: { id: loan.id },
        data: { overdueNotifiedAt: now },
      });
    }
  }

  if (marked > 0) {
    await logAudit({
      actorId: options?.actorId ?? undefined,
      action: "UPDATE",
      entityType: "loan_batch",
      metadata: { operation: "markOverdueLoans", count: marked },
    });
  }

  return { marked };
}

export type SendReturnRemindersResult = { sent: number };

const REMINDER_COOLDOWN_MS = 24 * 60 * 60_000;

/** Przypomnienie przed terminem (3 dni) i po przekroczeniu — bez duplikatów w 24h. */
export async function sendReturnRemindersJob(
  db: PrismaClient,
  options?: { actorId?: string | null },
): Promise<SendReturnRemindersResult> {
  const now = new Date();
  const inThreeDays = new Date(now);
  inThreeDays.setDate(inThreeDays.getDate() + 3);
  const cooldownSince = new Date(now.getTime() - REMINDER_COOLDOWN_MS);

  const upcoming = await db.loan.findMany({
    where: {
      status: { in: ["ACTIVE", "OVERDUE"] },
      dueAt: { gte: now, lte: inThreeDays },
      OR: [{ lastReminderAt: null }, { lastReminderAt: { lt: cooldownSince } }],
    },
    include: { user: true, copy: { include: { game: true } } },
  });

  const overdueNeedReminder = await db.loan.findMany({
    where: {
      status: "OVERDUE",
      dueAt: { lt: now },
      OR: [{ lastReminderAt: null }, { lastReminderAt: { lt: cooldownSince } }],
    },
    include: { user: true, copy: { include: { game: true } } },
  });

  const allLoans = [...upcoming, ...overdueNeedReminder];
  const seen = new Set<string>();
  let sent = 0;

  for (const loan of allLoans) {
    if (seen.has(loan.id)) continue;
    seen.add(loan.id);

    const isOverdue = loan.status === "OVERDUE" || loan.dueAt < now;
    const email = isOverdue
      ? overdueEmail(loan.copy.game.title)
      : returnReminderEmail(loan.copy.game.title, loan.dueAt.toLocaleDateString("pl-PL"));

    await notifyUser({
      userId: loan.userId,
      email: loan.user.email,
      type: isOverdue ? "OVERDUE_RETURN" : "RETURN_REMINDER",
      title: isOverdue ? "Przeterminowany zwrot" : "Przypomnienie o zwrocie",
      body: isOverdue
        ? `Gra „${loan.copy.game.title}” jest po terminie.`
        : `Termin zwrotu: ${loan.dueAt.toLocaleDateString("pl-PL")}.`,
      linkUrl: "/moje-konto",
      emailSubject: email.subject,
      emailHtml: email.html,
    });

    await db.loan.update({
      where: { id: loan.id },
      data: { lastReminderAt: now },
    });
    sent += 1;
  }

  if (sent > 0) {
    await logAudit({
      actorId: options?.actorId ?? undefined,
      action: "UPDATE",
      entityType: "loan_batch",
      metadata: { operation: "sendReturnReminders", count: sent },
    });
  }

  return { sent };
}

export type CleanupJobsResult = {
  rateLimits: number;
  resetTokens: number;
};

export async function runCleanupJobs(db: PrismaClient): Promise<CleanupJobsResult> {
  const { purgeExpiredRateLimits } = await import("@/lib/rate-limit/pg-rate-limit");
  const { purgeExpiredPasswordResetTokens } = await import("@/lib/services/password-reset");
  const rateLimits = await purgeExpiredRateLimits(db);
  const resetTokens = await purgeExpiredPasswordResetTokens(db);
  return { rateLimits, resetTokens };
}
