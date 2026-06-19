import type { PrismaClient } from "@prisma/client";

export type UserLibraryStats = {
  activeReservations: number;
  activeLoans: number;
  completedLoans: number;
  wishlistCount: number;
  ratingsCount: number;
  waitlistCount: number;
};

export async function fetchUserLibraryStats(
  db: PrismaClient,
  userId: string,
): Promise<UserLibraryStats> {
  const [
    activeReservations,
    activeLoans,
    completedLoans,
    wishlistCount,
    ratingsCount,
    waitlistCount,
  ] = await Promise.all([
    db.reservation.count({
      where: {
        userId,
        status: { in: ["PENDING", "APPROVED", "READY_FOR_PICKUP", "BORROWED"] },
      },
    }),
    db.loan.count({
      where: { userId, status: { in: ["ACTIVE", "OVERDUE"] } },
    }),
    db.loan.count({
      where: { userId, status: { in: ["RETURNED", "DAMAGED", "LOST"] } },
    }),
    db.wishlistItem.count({ where: { userId } }),
    db.gameRating.count({ where: { userId } }),
    db.waitlistEntry.count({
      where: { userId, status: { in: ["WAITING", "NOTIFIED"] } },
    }),
  ]);

  return {
    activeReservations,
    activeLoans,
    completedLoans,
    wishlistCount,
    ratingsCount,
    waitlistCount,
  };
}
