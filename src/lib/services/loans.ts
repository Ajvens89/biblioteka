import type { Prisma, PrismaClient } from "@prisma/client";
import { logAudit } from "@/lib/audit";
import { getSettingNumber } from "@/lib/settings";
import type { AuditContext } from "@/lib/services/reservations";
import { ServiceError } from "@/lib/services/errors";

export type IssueLoanResult = {
  loanId: string;
  gameSlug?: string | null;
};

/**
 * Wydanie wypożyczenia z rezerwacji (transakcja + audit BORROW).
 */
export async function issueLoanFromReservation(
  prisma: PrismaClient,
  reservationId: string,
  audit: AuditContext,
): Promise<IssueLoanResult> {
  const loanDays = await getSettingNumber("defaultLoanDays", 14);
  const dueAt = new Date();
  dueAt.setDate(dueAt.getDate() + loanDays);

  const { loan, gameSlug } = await prisma.$transaction(async (tx) => {
    const claimed = await tx.reservation.updateMany({
      where: { id: reservationId, status: { in: ["APPROVED", "READY_FOR_PICKUP", "PENDING"] } },
      data: { status: "BORROWED" },
    });
    if (claimed.count !== 1) {
      throw new ServiceError("Nieprawidłowy status rezerwacji.", "INVALID_STATUS");
    }
    const reservation = await tx.reservation.findUnique({
      where: { id: reservationId },
      include: { copy: true, game: true },
    });
    if (!reservation?.copyId || !reservation.copy) {
      throw new ServiceError("Rezerwacja bez przypisanego egzemplarza.", "NO_COPY");
    }
    const copyLock = await tx.gameCopy.updateMany({
      where: {
        id: reservation.copyId,
        gameId: reservation.gameId,
        status: { in: ["RESERVED", "AVAILABLE"] },
      },
      data: { status: "BORROWED" },
    });
    if (copyLock.count === 0) {
      throw new ServiceError("Egzemplarz nie jest dostępny do wydania.", "COPY_BUSY");
    }

    const created = await tx.loan.create({
      data: {
        userId: reservation.userId,
        copyId: reservation.copyId,
        reservationId: reservation.id,
        dueAt,
        status: "ACTIVE",
      },
    });

    return { loan: created, gameSlug: reservation.game?.slug ?? null };
  });

  await logAudit({
    actorId: audit.actorId,
    action: "BORROW",
    entityType: "loan",
    entityId: loan.id,
    metadata: {
      reservationId,
      ...(audit.metadata && typeof audit.metadata === "object" && !Array.isArray(audit.metadata)
        ? (audit.metadata as Prisma.InputJsonObject)
        : {}),
    },
  });

  return { loanId: loan.id, gameSlug };
}

/**
 * Wydanie na miejscu (bez rezerwacji) — walk-in.
 */
export async function issueWalkInLoan(
  prisma: PrismaClient,
  userId: string,
  copyId: string,
  audit: AuditContext,
): Promise<IssueLoanResult> {
  const user = await prisma.profile.findUnique({
    where: { id: userId },
    select: { id: true, isBlocked: true },
  });
  if (!user) {
    throw new ServiceError("Użytkownik nie istnieje.", "NOT_FOUND");
  }
  if (user.isBlocked) {
    throw new ServiceError("Konto użytkownika jest zablokowane.", "BLOCKED");
  }

  const overdue = await prisma.loan.findFirst({
    where: { userId, status: "OVERDUE" },
  });
  if (overdue) {
    throw new ServiceError("Użytkownik ma przeterminowane wypożyczenie.", "OVERDUE_LOAN");
  }

  const copy = await prisma.gameCopy.findUnique({
    where: { id: copyId },
    include: { game: { select: { slug: true, title: true, isActive: true, deletedAt: true } } },
  });
  if (!copy) {
    throw new ServiceError("Egzemplarz nie istnieje.", "NOT_FOUND");
  }
  if (!copy.game.isActive || copy.game.deletedAt) {
    throw new ServiceError("Gra nie jest dostępna w katalogu.", "INACTIVE_GAME");
  }

  const loanDays = await getSettingNumber("defaultLoanDays", 14);
  const dueAt = new Date();
  dueAt.setDate(dueAt.getDate() + loanDays);

  const loan = await prisma.$transaction(async (tx) => {
    const copyLock = await tx.gameCopy.updateMany({
      where: { id: copyId, status: "AVAILABLE" },
      data: { status: "BORROWED" },
    });
    if (copyLock.count === 0) {
      throw new ServiceError("Egzemplarz nie jest dostępny do wydania.", "COPY_BUSY");
    }

    return tx.loan.create({
      data: {
        userId,
        copyId,
        dueAt,
        status: "ACTIVE",
      },
    });
  });

  await logAudit({
    actorId: audit.actorId,
    action: "BORROW",
    entityType: "loan",
    entityId: loan.id,
    metadata: {
      walkIn: true,
      copyId,
      userId,
      ...(audit.metadata && typeof audit.metadata === "object" && !Array.isArray(audit.metadata)
        ? (audit.metadata as Prisma.InputJsonObject)
        : {}),
    },
  });

  return { loanId: loan.id, gameSlug: copy.game.slug ?? null };
}

/** Extend only the still-active loan/version the staff member originally reviewed. */
export async function extendLoan(
  prisma: PrismaClient,
  loanId: string,
  days: number,
  audit: AuditContext,
): Promise<{ dueAt: Date }> {
  if (!Number.isInteger(days) || days < 1 || days > 21) {
    throw new ServiceError("Przedłużenie musi wynosić od 1 do 21 dni.", "INVALID_DAYS");
  }
  const maxExtensions = await getSettingNumber("maxLoanExtensions", 2);
  const loan = await prisma.loan.findUnique({ where: { id: loanId } });
  if (!loan || !["ACTIVE", "OVERDUE"].includes(loan.status)) {
    throw new ServiceError("Nie można przedłużyć zamkniętego wypożyczenia.", "INVALID_STATUS");
  }
  if (loan.extensionCount >= maxExtensions) {
    throw new ServiceError(`Osiągnięto limit przedłużeń (${maxExtensions}).`, "LIMIT");
  }
  const dueAt = new Date(loan.dueAt);
  dueAt.setDate(dueAt.getDate() + days);
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.loan.updateMany({
      where: {
        id: loanId,
        status: { in: ["ACTIVE", "OVERDUE"] },
        dueAt: loan.dueAt,
        extensionCount: loan.extensionCount,
      },
      data: { dueAt, extensionCount: { increment: 1 }, status: "ACTIVE" },
    });
    if (claimed.count !== 1) {
      throw new ServiceError("Wypożyczenie zostało zmienione. Odśwież stronę i spróbuj ponownie.", "LOAN_CHANGED");
    }
    await tx.loanExtension.create({ data: {
      loanId, previousDue: loan.dueAt, newDue: dueAt, reason: "Przedłużenie przez bibliotekarza",
    } });
  });
  await logAudit({
    actorId: audit.actorId, action: "UPDATE", entityType: "loan", entityId: loanId,
    metadata: { newDue: dueAt.toISOString() },
  });
  return { dueAt };
}

export type ReturnLoanOptions = {
  damageNotes?: string;
  markDamaged?: boolean;
  markRepair?: boolean;
};

export type ReturnLoanResult = {
  copyStatus: "AVAILABLE" | "DAMAGED" | "REPAIR";
  loanStatus: "RETURNED" | "DAMAGED";
  gameSlug?: string | null;
  reservationId?: string | null;
};

/**
 * Zwrot wypożyczenia (domyślnie egzemplarz AVAILABLE — jak verify:flow).
 */
export async function returnLoan(
  prisma: PrismaClient,
  loanId: string,
  audit: AuditContext,
  options?: ReturnLoanOptions,
): Promise<ReturnLoanResult> {
  let copyStatus: ReturnLoanResult["copyStatus"] = "AVAILABLE";
  let loanStatus: ReturnLoanResult["loanStatus"] = "RETURNED";
  if (options?.markRepair) {
    copyStatus = "REPAIR";
  } else if (options?.markDamaged) {
    copyStatus = "DAMAGED";
    loanStatus = "DAMAGED";
  }

  const loan = await prisma.$transaction(async (tx) => {
    const claimed = await tx.loan.updateMany({
      where: { id: loanId, status: { in: ["ACTIVE", "OVERDUE"] } },
      data: {
        status: loanStatus,
        returnedAt: new Date(),
        damageNotes: options?.damageNotes,
        returnNotes: options?.damageNotes ? "Zwrot z uwagą" : undefined,
      },
    });
    if (claimed.count !== 1) {
      throw new ServiceError("To wypożyczenie jest już zamknięte.", "INVALID_STATUS");
    }
    const loan = await tx.loan.findUnique({
      where: { id: loanId },
      include: { copy: { include: { game: true } }, reservation: true },
    });
    if (!loan) {
      throw new ServiceError("Wypożyczenie nie istnieje.", "NOT_FOUND");
    }

    await tx.gameCopy.update({
      where: { id: loan.copyId },
      data: { status: copyStatus },
    });

    if (loan.reservationId) {
      await tx.reservation.updateMany({
        where: { id: loan.reservationId, status: "BORROWED" },
        data: { status: "RETURNED" },
      });
    }
    return loan;
  });

  await logAudit({
    actorId: audit.actorId,
    action: "RETURN",
    entityType: "loan",
    entityId: loanId,
    metadata: {
      copyStatus,
      loanStatus,
      ...(audit.metadata && typeof audit.metadata === "object" && !Array.isArray(audit.metadata)
        ? (audit.metadata as Prisma.InputJsonObject)
        : {}),
    },
  });

  return {
    copyStatus,
    loanStatus,
    gameSlug: loan.copy.game?.slug ?? null,
    reservationId: loan.reservationId,
  };
}
