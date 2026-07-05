import { prisma, withPrismaRetry } from "@/lib/db";
import { isPrismaConnectionError } from "@/lib/db-errors";
import { ACTIVE_CATALOG_GAME_WHERE } from "@/lib/games/catalog-scope";

export async function fetchAdminDashboard() {
  try {
    return await withPrismaRetry(() => fetchAdminDashboardInner());
  } catch (error) {
    if (isPrismaConnectionError(error)) {
      return null;
    }
    throw error;
  }
}

async function fetchAdminDashboardInner() {
  const [
    gamesCount,
    copiesCount,
    availableCopies,
    pendingReservations,
    readyReservations,
    activeLoans,
    overdueLoans,
    gamesWithoutEan,
    gamesWithoutCover,
    gamesWithoutDescription,
    gamesWithoutCopies,
    boardGames,
    rpgGames,
    recentReservations,
    recentLoans,
    recentGames,
  ] = await Promise.all([
    prisma.game.count({ where: { deletedAt: null } }),
    prisma.gameCopy.count(),
    prisma.gameCopy.count({ where: { status: "AVAILABLE" } }),
    prisma.reservation.count({ where: { status: "PENDING" } }),
    prisma.reservation.count({ where: { status: "READY_FOR_PICKUP" } }),
    prisma.loan.count({ where: { status: "ACTIVE" } }),
    prisma.loan.count({ where: { status: "OVERDUE" } }),
    prisma.game.count({ where: { deletedAt: null, ean: null } }),
    prisma.game.count({
      where: { deletedAt: null, OR: [{ coverImageUrl: null }, { coverImageUrl: "" }] },
    }),
    prisma.game.count({
      where: {
        deletedAt: null,
        OR: [{ description: null }, { description: "" }],
      },
    }),
    prisma.game.count({
      where: { deletedAt: null, copies: { none: {} } },
    }),
    prisma.game.count({
      where: { ...ACTIVE_CATALOG_GAME_WHERE, collectionType: "BOARD_GAME" },
    }),
    prisma.game.count({
      where: { ...ACTIVE_CATALOG_GAME_WHERE, collectionType: "RPG" },
    }),
    prisma.reservation.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        game: { select: { title: true, ean: true } },
        user: { select: { fullName: true, email: true } },
      },
    }),
    prisma.loan.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        copy: { include: { game: { select: { title: true, ean: true } } } },
        user: { select: { fullName: true, email: true } },
      },
    }),
    prisma.game.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, title: true, createdAt: true, ean: true, collectionType: true },
    }),
  ]);

  const recentAuditLogs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { action: "IMPORT", entityType: { in: ["products_json", "games"] } },
        { entityType: "ean_audit" },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 6,
    include: { actor: { select: { email: true } } },
  });

  return {
    stats: {
      gamesCount,
      copiesCount,
      availableCopies,
      pendingReservations,
      readyReservations,
      activeLoans,
      overdueLoans,
      gamesWithoutEan,
      gamesWithoutCover,
      gamesWithoutDescription,
      gamesWithoutCopies,
      boardGames,
      rpgGames,
    },
    alerts: [
      gamesWithoutEan > 0 && {
        id: "no-ean",
        message: `${gamesWithoutEan} gier bez EAN`,
        href: "/admin/gry?missingEan=1",
        tone: "warning" as const,
      },
      gamesWithoutCover > 0 && {
        id: "no-cover",
        message: `${gamesWithoutCover} gier bez okładki`,
        href: "/admin/jakosc-danych",
        tone: "warning" as const,
      },
      gamesWithoutCopies > 0 && {
        id: "no-copies",
        message: `${gamesWithoutCopies} gier bez egzemplarzy`,
        href: "/admin/gry?missingCopies=1",
        tone: "warning" as const,
      },
      overdueLoans > 0 && {
        id: "overdue",
        message: `${overdueLoans} wypożyczeń przeterminowanych`,
        href: "/admin/wypozyczenia?status=OVERDUE",
        tone: "danger" as const,
      },
      pendingReservations > 0 && {
        id: "pending",
        message: `${pendingReservations} rezerwacji czeka na zatwierdzenie`,
        href: "/admin/rezerwacje?status=PENDING",
        tone: "accent" as const,
      },
    ].filter(Boolean) as {
      id: string;
      message: string;
      href: string;
      tone: "warning" | "danger" | "accent";
    }[],
    recentReservations,
    recentLoans,
    recentGames,
    recentAuditLogs,
  };
}
