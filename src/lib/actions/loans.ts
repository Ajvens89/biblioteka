"use server";

import { revalidatePath } from "next/cache";
import { isActorResult, requireActorAdmin, requireActorStaff } from "@/lib/auth/actor";
import { prisma } from "@/lib/db";
import { overdueEmail, returnReminderEmail } from "@/lib/email";
import { notifyUser } from "@/lib/notifications";
import { getSettingNumber } from "@/lib/settings";
import { fail, fromServiceError, ok, type ActionResult } from "@/lib/actions/utils";
import { loanIdSchema, reservationIdSchema } from "@/lib/validations/ids";
import { updateCopyStatusSchema } from "@/lib/validations/ids";
import { logAudit } from "@/lib/audit";
import * as loanService from "@/lib/services/loans";

export async function issueLoanFromReservation(
  reservationId: string,
): Promise<ActionResult<{ loanId: string }>> {
  const parsed = reservationIdSchema.safeParse({ reservationId });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Błąd walidacji");

  const actorResult = await requireActorStaff();
  if (!isActorResult(actorResult)) return actorResult;

  try {
    const { loanId } = await loanService.issueLoanFromReservation(
      prisma,
      parsed.data.reservationId,
      { actorId: actorResult.id, metadata: { reservationId: parsed.data.reservationId } },
    );

    revalidatePath("/admin/wypozyczenia");
    revalidatePath("/admin/rezerwacje");
    revalidatePath("/moje-rezerwacje");

    return ok({ loanId });
  } catch (e) {
    return fromServiceError<{ loanId: string }>(e);
  }
}

export async function returnLoan(
  loanId: string,
  options?: { damageNotes?: string; markDamaged?: boolean; markRepair?: boolean },
): Promise<ActionResult> {
  const parsed = loanIdSchema.safeParse({ loanId });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Błąd walidacji");

  const actorResult = await requireActorStaff();
  if (!isActorResult(actorResult)) return actorResult;

  try {
    const result = await loanService.returnLoan(
      prisma,
      parsed.data.loanId,
      { actorId: actorResult.id },
      options,
    );

    revalidatePath("/admin/wypozyczenia");
    if (result.gameSlug) revalidatePath(`/gry/${result.gameSlug}`);

    return ok();
  } catch (e) {
    return fromServiceError(e);
  }
}

export async function extendLoan(loanId: string, days = 7): Promise<ActionResult> {
  const parsed = loanIdSchema.safeParse({ loanId });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Błąd walidacji");

  const actorResult = await requireActorStaff();
  if (!isActorResult(actorResult)) return actorResult;

  const maxExt = await getSettingNumber("maxLoanExtensions", 2);
  const loan = await prisma.loan.findUnique({ where: { id: parsed.data.loanId } });
  if (!loan || !["ACTIVE", "OVERDUE"].includes(loan.status)) {
    return fail("Nie można przedłużyć.");
  }
  if (loan.extensionCount >= maxExt) {
    return fail(`Osiągnięto limit przedłużeń (${maxExt}).`);
  }

  const newDue = new Date(loan.dueAt);
  newDue.setDate(newDue.getDate() + days);

  await prisma.$transaction([
    prisma.loanExtension.create({
      data: {
        loanId: parsed.data.loanId,
        previousDue: loan.dueAt,
        newDue,
        reason: "Przedłużenie przez bibliotekarza",
      },
    }),
    prisma.loan.update({
      where: { id: parsed.data.loanId },
      data: { dueAt: newDue, extensionCount: { increment: 1 }, status: "ACTIVE" },
    }),
  ]);

  await logAudit({
    actorId: actorResult.id,
    action: "UPDATE",
    entityType: "loan",
    entityId: parsed.data.loanId,
    metadata: { newDue: newDue.toISOString() },
  });

  revalidatePath("/admin/wypozyczenia");
  return ok();
}

export async function updateCopyStatus(
  copyId: string,
  status: "AVAILABLE" | "RESERVED" | "BORROWED" | "DAMAGED" | "LOST" | "REPAIR" | "RETIRED",
): Promise<ActionResult> {
  const parsed = updateCopyStatusSchema.safeParse({ copyId, status });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Błąd walidacji");

  const actorResult = await requireActorStaff();
  if (!isActorResult(actorResult)) return actorResult;

  await prisma.gameCopy.update({
    where: { id: parsed.data.copyId },
    data: { status: parsed.data.status },
  });

  await logAudit({
    actorId: actorResult.id,
    action: "UPDATE",
    entityType: "game_copy",
    entityId: parsed.data.copyId,
    metadata: { status: parsed.data.status },
  });

  revalidatePath("/admin/egzemplarze");
  return ok();
}

export async function markOverdueLoans(): Promise<ActionResult<{ count: number }>> {
  const actorResult = await requireActorAdmin();
  if (!isActorResult(actorResult)) return actorResult;

  const now = new Date();
  const overdue = await prisma.loan.findMany({
    where: { status: "ACTIVE", dueAt: { lt: now } },
    include: { user: true, copy: { include: { game: true } } },
  });

  for (const loan of overdue) {
    await prisma.loan.update({
      where: { id: loan.id },
      data: { status: "OVERDUE" },
    });
    const email = overdueEmail(loan.copy.game.title);
    await notifyUser({
      userId: loan.userId,
      email: loan.user.email,
      type: "OVERDUE_RETURN",
      title: "Przeterminowany zwrot",
      body: `Gra ${loan.copy.game.title} jest po terminie.`,
      emailSubject: email.subject,
      emailHtml: email.html,
    });
  }

  await logAudit({
    actorId: actorResult.id,
    action: "UPDATE",
    entityType: "loan_batch",
    metadata: { operation: "markOverdueLoans", count: overdue.length },
  });

  return ok({ count: overdue.length });
}

export async function sendReturnReminders(): Promise<ActionResult<{ count: number }>> {
  const actorResult = await requireActorAdmin();
  if (!isActorResult(actorResult)) return actorResult;

  const inThreeDays = new Date();
  inThreeDays.setDate(inThreeDays.getDate() + 3);

  const loans = await prisma.loan.findMany({
    where: {
      status: "ACTIVE",
      dueAt: { lte: inThreeDays, gte: new Date() },
    },
    include: { user: true, copy: { include: { game: true } } },
  });

  for (const loan of loans) {
    const email = returnReminderEmail(
      loan.copy.game.title,
      loan.dueAt.toLocaleDateString("pl-PL"),
    );
    await notifyUser({
      userId: loan.userId,
      email: loan.user.email,
      type: "RETURN_REMINDER",
      title: "Przypomnienie o zwrocie",
      body: `Termin zwrotu: ${loan.dueAt.toLocaleDateString("pl-PL")}`,
      emailSubject: email.subject,
      emailHtml: email.html,
    });
  }

  await logAudit({
    actorId: actorResult.id,
    action: "UPDATE",
    entityType: "loan_batch",
    metadata: { operation: "sendReturnReminders", count: loans.length },
  });

  return ok({ count: loans.length });
}
