import type { PrismaClient } from "@prisma/client";
import { notifyUser } from "@/lib/notifications";
import { getSettingNumber } from "@/lib/settings";
import { ServiceError } from "@/lib/services/errors";

const ACTIVE_WAITLIST = ["WAITING", "NOTIFIED"] as const;

export async function getWaitlistPosition(
  db: PrismaClient,
  userId: string,
  gameId: string,
): Promise<{ position: number; status: string } | null> {
  const entry = await db.waitlistEntry.findFirst({
    where: {
      userId,
      gameId,
      status: { in: [...ACTIVE_WAITLIST] },
    },
    select: { position: true, status: true },
  });
  return entry;
}

export async function joinWaitlist(
  db: PrismaClient,
  userId: string,
  gameId: string,
): Promise<{ position: number }> {
  const game = await db.game.findFirst({
    where: { id: gameId, deletedAt: null, isActive: true },
    include: { copies: { where: { status: "AVAILABLE" }, select: { id: true } } },
  });
  if (!game) throw new ServiceError("Gra nie istnieje.", "NOT_FOUND");
  if (game.copies.length > 0) {
    throw new ServiceError("Gra jest dostępna — zarezerwuj ją zamiast kolejki.", "AVAILABLE");
  }

  const existing = await db.waitlistEntry.findFirst({
    where: { userId, gameId, status: { in: [...ACTIVE_WAITLIST] } },
  });
  if (existing) {
    return { position: existing.position };
  }

  const waitingCount = await db.waitlistEntry.count({
    where: { gameId, status: "WAITING" },
  });
  const position = waitingCount + 1;
  const validityDays = await getSettingNumber("waitlistValidityDays", 14);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + validityDays);

  await db.waitlistEntry.create({
    data: { userId, gameId, position, status: "WAITING", expiresAt },
  });

  return { position };
}

export async function leaveWaitlist(
  db: PrismaClient,
  userId: string,
  gameId: string,
): Promise<void> {
  const entry = await db.waitlistEntry.findFirst({
    where: { userId, gameId, status: { in: [...ACTIVE_WAITLIST] } },
  });
  if (!entry) throw new ServiceError("Nie jesteś na liście oczekujących.", "NOT_FOUND");

  await db.$transaction(async (tx) => {
    await tx.waitlistEntry.update({
      where: { id: entry.id },
      data: { status: "CANCELLED" },
    });
    await tx.waitlistEntry.updateMany({
      where: {
        gameId,
        status: "WAITING",
        position: { gt: entry.position },
      },
      data: { position: { decrement: 1 } },
    });
  });
}

/** Powiadom pierwszą osobę w kolejce po zwrocie egzemplarza. */
export async function notifyWaitlistOnAvailability(
  db: PrismaClient,
  gameId: string,
): Promise<number> {
  const available = await db.gameCopy.count({
    where: { gameId, status: "AVAILABLE" },
  });
  if (available === 0) return 0;

  const next = await db.waitlistEntry.findFirst({
    where: { gameId, status: "WAITING" },
    orderBy: { position: "asc" },
    include: { user: true, game: true },
  });
  if (!next) return 0;

  const notifyHours = await getSettingNumber("waitlistNotifyHours", 48);
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + notifyHours);

  await db.waitlistEntry.update({
    where: { id: next.id },
    data: { status: "NOTIFIED", notifiedAt: new Date(), expiresAt },
  });

  const linkUrl = `/gry/${next.game.slug}#rezerwacja`;
  await notifyUser({
    userId: next.userId,
    email: next.user.email,
    type: "WAITLIST_AVAILABLE",
    title: `${next.game.title} — dostępna w bibliotece`,
    body: `Egzemplarz jest wolny. Masz ${notifyHours} h na rezerwację, zanim oferta przejdzie dalej.`,
    linkUrl,
    emailSubject: `${next.game.title} jest dostępna — Biblioteka Zakątka Fantastyki`,
    emailHtml: `<p>Cześć${next.user.fullName ? ` ${next.user.fullName}` : ""}!</p>
<p>Gra <strong>${next.game.title}</strong> jest teraz dostępna w bibliotece.</p>
<p><a href="${linkUrl}">Zarezerwuj teraz</a> — oferta ważna ${notifyHours} godzin.</p>`,
  });

  return 1;
}
