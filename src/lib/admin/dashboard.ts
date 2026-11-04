import type { PrismaClient } from "@prisma/client";
import { prisma, withPrismaRetry } from "@/lib/db";
import { isPrismaConnectionError } from "@/lib/db-errors";
import { ACTIVE_CATALOG_GAME_WHERE } from "@/lib/games/catalog-scope";

export async function fetchAdminDashboard(db: Pick<PrismaClient, "game" | "auditLog"> = prisma) {
  try {
    return await withPrismaRetry(async () => {
      const [gamesCount, publishedGames, hiddenGames, gamesWithoutEan, gamesWithoutCover,
        gamesWithoutDescription, boardGames, rpgGames, recentGames, recentAuditLogs] = await Promise.all([
        db.game.count({ where: { deletedAt: null } }),
        db.game.count({ where: ACTIVE_CATALOG_GAME_WHERE }),
        db.game.count({ where: { deletedAt: null, isActive: false } }),
        db.game.count({ where: { deletedAt: null, OR: [{ ean: null }, { ean: "" }] } }),
        db.game.count({ where: { deletedAt: null, OR: [{ coverImageUrl: null }, { coverImageUrl: "" }] } }),
        db.game.count({ where: { deletedAt: null, OR: [{ description: null }, { description: "" }] } }),
        db.game.count({ where: { ...ACTIVE_CATALOG_GAME_WHERE, collectionType: "BOARD_GAME" } }),
        db.game.count({ where: { ...ACTIVE_CATALOG_GAME_WHERE, collectionType: "RPG" } }),
        db.game.findMany({
          where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 8,
          select: { id: true, title: true, createdAt: true, collectionType: true, isActive: true,
            publisher: { select: { name: true } } },
        }),
        db.auditLog.findMany({
          where: { entityType: { in: ["game", "games", "products_json", "games_json", "ean_audit", "app_settings"] } },
          orderBy: { createdAt: "desc" }, take: 6,
          select: { id: true, action: true, entityType: true, createdAt: true },
        }),
      ]);
      return { stats: { gamesCount, publishedGames, hiddenGames, gamesWithoutEan, gamesWithoutCover,
        gamesWithoutDescription, boardGames, rpgGames }, recentGames, recentAuditLogs };
    });
  } catch (error) {
    if (isPrismaConnectionError(error)) return null;
    throw error;
  }
}
