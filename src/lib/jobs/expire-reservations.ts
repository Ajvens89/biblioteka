import type { Prisma, PrismaClient } from "@prisma/client";
import { logAudit } from "@/lib/audit";
import { reservationExpiredEmail } from "@/lib/email";
import { notifyUser } from "@/lib/notifications";
import { getSettingNumber } from "@/lib/settings";

export type ExpireReservationsResult = {
  expired: number;
  skipped: number;
};

const ACTIVE_STATUSES = ["PENDING", "APPROVED", "READY_FOR_PICKUP"] as const;

/**
 * Wygasa rezerwacje po pickupDeadline (idempotentne).
 * Zwolnienie egzemplarza tylko gdy status copy = RESERVED.
 */
export async function expireReservations(
  db: PrismaClient,
  options?: { actorId?: string | null },
): Promise<ExpireReservationsResult> {
  const now = new Date();
  const validityDays = await getSettingNumber("reservationValidityDays", 3);
  const expiredWhere = {
    status: { in: [...ACTIVE_STATUSES] },
    OR: [
      { pickupDeadline: { lt: now } },
      {
        pickupDeadline: null,
        createdAt: { lt: new Date(now.getTime() - validityDays * 24 * 60 * 60_000) },
      },
    ],
  } satisfies Prisma.ReservationWhereInput;
  const candidates = await db.reservation.findMany({
    where: expiredWhere,
    include: { user: true, game: true, copy: true },
  });

  let expired = 0;
  let skipped = 0;

  for (const reservation of candidates) {
    const done = await db.$transaction(async (tx) => {
      // Recheck both state and deadline while claiming the row, after competing issuance/extension.
      const claimed = await tx.reservation.updateMany({
        where: { id: reservation.id, ...expiredWhere },
        data: { status: "EXPIRED" },
      });
      if (claimed.count !== 1) {
        return false;
      }
      const current = await tx.reservation.findUnique({
        where: { id: reservation.id },
        select: { copyId: true },
      });

      if (current?.copyId) {
        const released = await tx.gameCopy.updateMany({
          where: { id: current.copyId, status: "RESERVED" },
          data: { status: "AVAILABLE" },
        });
        if (released.count === 0) {
          /* egzemplarz już zwolniony lub w innym stanie — brak podwójnego zwolnienia */
        }
      }

      return true;
    });

    if (!done) {
      skipped += 1;
      continue;
    }

    expired += 1;
    await notifyUser({
      userId: reservation.userId,
      email: reservation.user.email,
      type: "RESERVATION_EXPIRED",
      title: "Rezerwacja wygasła",
      body: `Rezerwacja gry „${reservation.game.title}” wygasła z powodu przekroczenia terminu odbioru.`,
      linkUrl: "/moje-rezerwacje",
      emailSubject: reservationExpiredEmail(reservation.game.title).subject,
      emailHtml: reservationExpiredEmail(reservation.game.title).html,
    });
  }

  if (expired > 0) {
    await logAudit({
      actorId: options?.actorId ?? undefined,
      action: "UPDATE",
      entityType: "reservation_batch",
      metadata: { operation: "expireReservations", expired, skipped },
    });
  }

  return { expired, skipped };
}
