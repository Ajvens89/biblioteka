"use server";

import { revalidatePath } from "next/cache";
import { isActorResult, requireActorAdmin, requireActorStaff } from "@/lib/auth/actor";
import { prisma } from "@/lib/db";
import { getSettingNumber } from "@/lib/settings";
import { fail, fromServiceError, ok, type ActionResult } from "@/lib/actions/utils";
import { loanIdSchema, reservationIdSchema } from "@/lib/validations/ids";
import { updateCopyStatusSchema } from "@/lib/validations/ids";
import { logAudit } from "@/lib/audit";
import * as loanService from "@/lib/services/loans";
import { markOverdueLoansJob, sendReturnRemindersJob } from "@/lib/jobs/loan-maintenance";

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

  const { marked } = await markOverdueLoansJob(prisma, { actorId: actorResult.id });
  return ok({ count: marked });
}

export async function sendReturnReminders(): Promise<ActionResult<{ count: number }>> {
  const actorResult = await requireActorAdmin();
  if (!isActorResult(actorResult)) return actorResult;

  const { sent } = await sendReturnRemindersJob(prisma, { actorId: actorResult.id });
  return ok({ count: sent });
}
