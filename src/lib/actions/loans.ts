"use server";

import { CATALOG_ONLY_MODE, circulationDisabledResult } from "@/lib/catalog-mode";

import { revalidatePath } from "next/cache";
import { isActorResult, requireActorStaff } from "@/lib/auth/actor";
import { prisma } from "@/lib/db";
import { fail, fromServiceError, ok, type ActionResult } from "@/lib/actions/utils";
import { logAudit } from "@/lib/audit";
import { assertCopyStatusTransition } from "@/lib/services/copy-status";
import { updateCopyIfUnchanged } from "@/lib/services/copy-update";
import * as loanService from "@/lib/services/loans";
import {
  circulationLookupSchema,
  loanIdSchema,
  reservationIdSchema,
  updateCopyStatusSchema,
  walkInLoanSchema,
} from "@/lib/validations/ids";

const ACTIVE_LOAN_STATUSES = ["ACTIVE", "OVERDUE"] as const;

export async function issueLoanFromReservation(
  reservationId: string,
): Promise<ActionResult<{ loanId: string }>> {
  if (CATALOG_ONLY_MODE) return circulationDisabledResult();
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
    revalidatePath("/admin/obsluga");
    revalidatePath("/moje-rezerwacje");

    return ok({ loanId });
  } catch (e) {
    return fromServiceError<{ loanId: string }>(e);
  }
}

export async function issueWalkInLoan(userId: string, copyId: string): Promise<ActionResult<{ loanId: string }>> {
  if (CATALOG_ONLY_MODE) return circulationDisabledResult();
  const parsed = walkInLoanSchema.safeParse({ userId, copyId });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Błąd walidacji");

  const actorResult = await requireActorStaff();
  if (!isActorResult(actorResult)) return actorResult;

  try {
    const { loanId, gameSlug } = await loanService.issueWalkInLoan(
      prisma,
      parsed.data.userId,
      parsed.data.copyId,
      { actorId: actorResult.id },
    );

    revalidatePath("/admin/wypozyczenia");
    revalidatePath("/admin/obsluga");
    revalidatePath("/admin/egzemplarze");
    if (gameSlug) revalidatePath(`/gry/${gameSlug}`);

    return ok({ loanId }, "Wydano grę na miejscu.");
  } catch (e) {
    return fromServiceError<{ loanId: string }>(e);
  }
}

export async function returnLoan(
  loanId: string,
  options?: { damageNotes?: string; markDamaged?: boolean; markRepair?: boolean },
): Promise<ActionResult> {
  if (CATALOG_ONLY_MODE) return circulationDisabledResult();
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

    if (result.copyStatus === "AVAILABLE" && result.gameSlug) {
      const game = await prisma.game.findFirst({
        where: { slug: result.gameSlug },
        select: { id: true },
      });
      if (game) {
        const { notifyWaitlistOnAvailability } = await import("@/lib/services/waitlist");
        await notifyWaitlistOnAvailability(prisma, game.id);
      }
    }

    revalidatePath("/admin/wypozyczenia");
    revalidatePath("/admin/obsluga");
    revalidatePath("/admin/egzemplarze");
    if (result.gameSlug) revalidatePath(`/gry/${result.gameSlug}`);

    return ok(undefined, "Zwrot przyjęty.");
  } catch (e) {
    return fromServiceError(e);
  }
}

export async function returnLoanByCopyScan(
  copyQuery: string,
  options?: { markDamaged?: boolean; markRepair?: boolean },
): Promise<ActionResult<{ loanId: string }>> {
  if (CATALOG_ONLY_MODE) return circulationDisabledResult();
  const lookup = circulationLookupSchema.safeParse({ query: copyQuery });
  if (!lookup.success) return fail(lookup.error.issues[0]?.message ?? "Błąd walidacji");

  const actorResult = await requireActorStaff();
  if (!isActorResult(actorResult)) return actorResult;

  const copy = await prisma.gameCopy.findFirst({
    where: {
      OR: [{ barcode: lookup.data.query }, { inventoryNumber: lookup.data.query }],
    },
    select: { id: true },
  });
  if (!copy) return fail("Nie znaleziono egzemplarza.");

  const loan = await prisma.loan.findFirst({
    where: { copyId: copy.id, status: { in: [...ACTIVE_LOAN_STATUSES] } },
    select: { id: true },
  });
  if (!loan) return fail("Brak aktywnego wypożyczenia dla tego egzemplarza.");

  const result = await returnLoan(loan.id, options);
  if (!result.success) return result;
  return ok({ loanId: loan.id }, "Zwrot przyjęty.");
}

export async function lookupUserForCirculation(query: string): Promise<
  ActionResult<{
    users: Array<{ id: string; email: string; fullName: string | null; isBlocked: boolean }>;
  }>
> {
  if (CATALOG_ONLY_MODE) return circulationDisabledResult();
  const parsed = circulationLookupSchema.safeParse({ query });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Błąd walidacji");

  const actorResult = await requireActorStaff();
  if (!isActorResult(actorResult)) return actorResult;

  const term = parsed.data.query;
  const uuidMatch = /^[0-9a-f-]{36}$/i.test(term);

  const users = await prisma.profile.findMany({
    where: uuidMatch
      ? { id: term }
      : {
          OR: [
            { email: { equals: term, mode: "insensitive" } },
            { email: { contains: term, mode: "insensitive" } },
            { fullName: { contains: term, mode: "insensitive" } },
          ],
        },
    select: { id: true, email: true, fullName: true, isBlocked: true },
    orderBy: { email: "asc" },
    take: 10,
  });

  if (users.length === 0) return fail("Nie znaleziono użytkownika.");
  return ok({ users });
}

export async function lookupCopyForCirculation(query: string): Promise<
  ActionResult<{
    copy: {
      id: string;
      inventoryNumber: string;
      barcode: string | null;
      status: string;
      gameTitle: string;
      activeLoan: { id: string; userName: string; dueAt: string } | null;
    };
  }>
> {
  if (CATALOG_ONLY_MODE) return circulationDisabledResult();
  const parsed = circulationLookupSchema.safeParse({ query });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Błąd walidacji");

  const actorResult = await requireActorStaff();
  if (!isActorResult(actorResult)) return actorResult;

  const copy = await prisma.gameCopy.findFirst({
    where: {
      OR: [{ barcode: parsed.data.query }, { inventoryNumber: parsed.data.query }],
    },
    include: {
      game: { select: { title: true } },
      loans: {
        where: { status: { in: [...ACTIVE_LOAN_STATUSES] } },
        take: 1,
        include: { user: { select: { fullName: true, email: true } } },
      },
    },
  });
  if (!copy) return fail("Nie znaleziono egzemplarza.");

  const activeLoan = copy.loans[0];
  return ok({
    copy: {
      id: copy.id,
      inventoryNumber: copy.inventoryNumber,
      barcode: copy.barcode,
      status: copy.status,
      gameTitle: copy.game.title,
      activeLoan: activeLoan
        ? {
            id: activeLoan.id,
            userName: activeLoan.user.fullName ?? activeLoan.user.email,
            dueAt: activeLoan.dueAt.toISOString(),
          }
        : null,
    },
  });
}

export async function extendLoan(loanId: string, days = 7): Promise<ActionResult> {
  if (CATALOG_ONLY_MODE) return circulationDisabledResult();
  const parsed = loanIdSchema.safeParse({ loanId });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Błąd walidacji");

  const actorResult = await requireActorStaff();
  if (!isActorResult(actorResult)) return actorResult;

  try {
    await loanService.extendLoan(prisma, parsed.data.loanId, days, { actorId: actorResult.id });
  } catch (error) {
    return fromServiceError(error);
  }

  revalidatePath("/admin/wypozyczenia");
  return ok();
}

export async function updateCopyStatus(
  copyId: string,
  status: "AVAILABLE" | "RESERVED" | "BORROWED" | "DAMAGED" | "LOST" | "REPAIR" | "RETIRED",
): Promise<ActionResult> {
  if (CATALOG_ONLY_MODE) return circulationDisabledResult();
  const parsed = updateCopyStatusSchema.safeParse({ copyId, status });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Błąd walidacji");

  const actorResult = await requireActorStaff();
  if (!isActorResult(actorResult)) return actorResult;

  const existing = await prisma.gameCopy.findUnique({
    where: { id: parsed.data.copyId },
    select: { status: true },
  });
  if (!existing) return fail("Egzemplarz nie istnieje.");

  const [activeLoan, activeReservation] = await Promise.all([
    prisma.loan.findFirst({
      where: { copyId: parsed.data.copyId, status: { in: [...ACTIVE_LOAN_STATUSES] } },
      select: { id: true },
    }),
    prisma.reservation.findFirst({
      where: {
        copyId: parsed.data.copyId,
        status: { in: ["PENDING", "APPROVED", "READY_FOR_PICKUP"] },
      },
      select: { id: true },
    }),
  ]);

  try {
    assertCopyStatusTransition(existing.status, parsed.data.status, {
      hasActiveLoan: Boolean(activeLoan),
      hasActiveReservation: Boolean(activeReservation),
    });
  } catch (e) {
    return fromServiceError(e);
  }

  try {
    await updateCopyIfUnchanged(prisma, parsed.data.copyId, existing.status, { status: parsed.data.status });
  } catch (error) {
    return fromServiceError(error);
  }

  await logAudit({
    actorId: actorResult.id,
    action: "UPDATE",
    entityType: "game_copy",
    entityId: parsed.data.copyId,
    metadata: { status: parsed.data.status, from: existing.status },
  });

  revalidatePath("/admin/egzemplarze");
  return ok(undefined, "Zaktualizowano status.");
}

export async function markOverdueLoans(): Promise<ActionResult<{ count: number }>> {
  if (CATALOG_ONLY_MODE) return circulationDisabledResult();
  const { isActorResult: isActor, requireActorAdmin } = await import("@/lib/auth/actor");
  const actorResult = await requireActorAdmin();
  if (!isActor(actorResult)) return actorResult;

  const { markOverdueLoansJob } = await import("@/lib/jobs/loan-maintenance");
  const { marked } = await markOverdueLoansJob(prisma, { actorId: actorResult.id });
  return ok({ count: marked });
}

export async function sendReturnReminders(): Promise<ActionResult<{ count: number }>> {
  if (CATALOG_ONLY_MODE) return circulationDisabledResult();
  const { isActorResult: isActor, requireActorAdmin } = await import("@/lib/auth/actor");
  const actorResult = await requireActorAdmin();
  if (!isActor(actorResult)) return actorResult;

  const { sendReturnRemindersJob } = await import("@/lib/jobs/loan-maintenance");
  const { sent } = await sendReturnRemindersJob(prisma, { actorId: actorResult.id });
  return ok({ count: sent });
}
