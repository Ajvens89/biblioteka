import type { Prisma, PrismaClient } from "@prisma/client";
import { logAudit } from "@/lib/audit";
import { getSettingNumber } from "@/lib/settings";
import { ServiceError } from "@/lib/services/errors";

export type AuditContext = {
  actorId: string;
  metadata?: Prisma.InputJsonValue;
};

export async function assertCanUserReserve(
  prisma: PrismaClient,
  userId: string,
  options?: { override?: boolean },
): Promise<void> {
  if (options?.override) return;

  const overdue = await prisma.loan.findFirst({
    where: { userId, status: "OVERDUE" },
  });
  if (overdue) {
    throw new ServiceError("Masz przeterminowane wypożyczenie.", "OVERDUE_LOAN");
  }

  const maxRes = await getSettingNumber("maxActiveReservations", 3);
  const active = await prisma.reservation.count({
    where: {
      userId,
      status: { in: ["PENDING", "APPROVED", "READY_FOR_PICKUP"] },
    },
  });
  if (active >= maxRes) {
    throw new ServiceError(
      `Osiągnięto limit aktywnych rezerwacji (${maxRes}).`,
      "RESERVATION_LIMIT",
    );
  }
}

/** Blokuje drugą aktywną rezerwację tej samej gry przez jednego użytkownika. */
export async function assertNoActiveReservationForGame(
  prisma: PrismaClient,
  userId: string,
  gameId: string,
): Promise<void> {
  const existing = await prisma.reservation.findFirst({
    where: {
      userId,
      gameId,
      status: { in: ["PENDING", "APPROVED", "READY_FOR_PICKUP"] },
    },
    select: { id: true },
  });
  if (existing) {
    throw new ServiceError("Masz już aktywną rezerwację tej gry.", "DUPLICATE_RESERVATION");
  }
}

export type ReserveGameInput = {
  userId: string;
  gameId: string;
  /** Jeśli brak — pierwszy AVAILABLE wg numeru inwentarzowego (jak UI). */
  copyId?: string;
  notes?: string | null;
  pickupDeadline?: Date;
  incrementPopularity?: boolean;
  audit: AuditContext;
};

export type ReserveGameResult = {
  reservationId: string;
  copyId: string;
};

/**
 * Rezerwacja egzemplarza (transakcja + audit RESERVE).
 * Wspólna dla UI (Server Action) i verify:flow / verify:race.
 */
export async function reserveGame(
  prisma: PrismaClient,
  params: ReserveGameInput,
): Promise<ReserveGameResult> {
  const validityDays = await getSettingNumber("reservationValidityDays", 3);
  const pickupDeadline = params.pickupDeadline ?? new Date();
  if (!params.pickupDeadline) {
    pickupDeadline.setDate(pickupDeadline.getDate() + validityDays);
  }

  const { reservation, copyId } = await prisma.$transaction(async (tx) => {
    let copyId = params.copyId;
    if (!copyId) {
      const copy = await tx.gameCopy.findFirst({
        where: { gameId: params.gameId, status: "AVAILABLE" },
        orderBy: { inventoryNumber: "asc" },
      });
      if (!copy) {
        throw new ServiceError("Brak dostępnych egzemplarzy.", "NO_COPY");
      }
      copyId = copy.id;
    }

    const updated = await tx.gameCopy.updateMany({
      where: { id: copyId, status: "AVAILABLE" },
      data: { status: "RESERVED" },
    });
    if (updated.count === 0) {
      throw new ServiceError(
        "Egzemplarz został właśnie zarezerwowany — spróbuj ponownie.",
        "RACE",
      );
    }

    const reservation = await tx.reservation.create({
      data: {
        userId: params.userId,
        gameId: params.gameId,
        copyId,
        status: "PENDING",
        pickupDeadline,
        notes: params.notes ?? null,
      },
    });

    if (params.incrementPopularity) {
      await tx.game.update({
        where: { id: params.gameId },
        data: { popularityCount: { increment: 1 } },
      });
    }

    return { reservation, copyId };
  });

  await logAudit({
    actorId: params.audit.actorId,
    action: "RESERVE",
    entityType: "reservation",
    entityId: reservation.id,
    metadata: params.audit.metadata,
  });

  return { reservationId: reservation.id, copyId };
}

export async function approveReservation(
  prisma: PrismaClient,
  reservationId: string,
  audit: AuditContext,
): Promise<void> {
  const result = await prisma.reservation.updateMany({
    where: { id: reservationId, status: "PENDING" },
    data: { status: "APPROVED", approvedAt: new Date() },
  });
  if (result.count === 0) {
    throw new ServiceError("Rezerwacja nie istnieje lub ma inny status.", "INVALID_STATUS");
  }

  await logAudit({
    actorId: audit.actorId,
    action: "APPROVE",
    entityType: "reservation",
    entityId: reservationId,
    metadata: audit.metadata,
  });
}

export async function markReadyForPickup(
  prisma: PrismaClient,
  reservationId: string,
  audit: AuditContext,
): Promise<{ gameTitle: string; userId: string; userEmail: string }> {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { game: true, user: true },
  });
  if (!reservation) {
    throw new ServiceError("Rezerwacja nie istnieje.", "NOT_FOUND");
  }
  if (!["APPROVED", "PENDING"].includes(reservation.status)) {
    throw new ServiceError("Nieprawidłowy status rezerwacji.", "INVALID_STATUS");
  }

  await prisma.reservation.update({
    where: { id: reservationId },
    data: { status: "READY_FOR_PICKUP", readyAt: new Date() },
  });

  await logAudit({
    actorId: audit.actorId,
    action: "UPDATE",
    entityType: "reservation",
    entityId: reservationId,
    metadata: {
      status: "READY_FOR_PICKUP",
      ...(audit.metadata && typeof audit.metadata === "object" && !Array.isArray(audit.metadata)
        ? (audit.metadata as Prisma.InputJsonObject)
        : {}),
    },
  });

  return {
    gameTitle: reservation.game.title,
    userId: reservation.userId,
    userEmail: reservation.user.email,
  };
}

export async function cancelReservation(
  prisma: PrismaClient,
  reservationId: string,
  copyId: string | null | undefined,
  audit: AuditContext,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.reservation.update({
      where: { id: reservationId },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    if (copyId) {
      await tx.gameCopy.update({
        where: { id: copyId },
        data: { status: "AVAILABLE" },
      });
    }
  });

  await logAudit({
    actorId: audit.actorId,
    action: "CANCEL",
    entityType: "reservation",
    entityId: reservationId,
    metadata: audit.metadata,
  });
}

export async function rejectReservation(
  prisma: PrismaClient,
  reservationId: string,
  audit: AuditContext & { reason?: string },
): Promise<void> {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: { id: true, status: true, copyId: true },
  });
  if (!reservation) {
    throw new ServiceError("Rezerwacja nie istnieje.", "NOT_FOUND");
  }
  if (!["PENDING", "APPROVED"].includes(reservation.status)) {
    throw new ServiceError("Można odrzucić tylko oczekującą lub zatwierdzoną rezerwację.", "INVALID_STATUS");
  }

  await cancelReservation(prisma, reservationId, reservation.copyId, {
    actorId: audit.actorId,
    metadata: {
      rejected: true,
      reason: audit.reason ?? null,
      ...(audit.metadata && typeof audit.metadata === "object" && !Array.isArray(audit.metadata)
        ? (audit.metadata as Prisma.InputJsonObject)
        : {}),
    },
  });
}

export async function extendPickupDeadline(
  prisma: PrismaClient,
  reservationId: string,
  days: number,
  audit: AuditContext,
): Promise<{ pickupDeadline: Date }> {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: { id: true, status: true, pickupDeadline: true, createdAt: true },
  });
  if (!reservation) {
    throw new ServiceError("Rezerwacja nie istnieje.", "NOT_FOUND");
  }
  if (!["PENDING", "APPROVED", "READY_FOR_PICKUP"].includes(reservation.status)) {
    throw new ServiceError("Nie można przedłużyć terminu dla tej rezerwacji.", "INVALID_STATUS");
  }

  const base = reservation.pickupDeadline ?? reservation.createdAt;
  const pickupDeadline = new Date(base);
  pickupDeadline.setDate(pickupDeadline.getDate() + days);

  await prisma.reservation.update({
    where: { id: reservationId },
    data: { pickupDeadline },
  });

  await logAudit({
    actorId: audit.actorId,
    action: "UPDATE",
    entityType: "reservation",
    entityId: reservationId,
    metadata: {
      operation: "extendPickup",
      days,
      pickupDeadline: pickupDeadline.toISOString(),
      ...(audit.metadata && typeof audit.metadata === "object" && !Array.isArray(audit.metadata)
        ? (audit.metadata as Prisma.InputJsonObject)
        : {}),
    },
  });

  return { pickupDeadline };
}
