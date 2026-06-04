import type { Prisma, PrismaClient } from "@prisma/client";
import { EanError, normalizeEan } from "@/lib/services/ean";

export const gameWithCopiesInclude = {
  publisher: true,
  designer: true,
  copies: { select: { id: true, inventoryNumber: true, status: true, barcode: true } },
  categories: { include: { category: true } },
  tags: { include: { tag: true } },
} satisfies Prisma.GameInclude;

export async function findGameByEan(prisma: PrismaClient, rawEan: string) {
  let normalized: string;
  try {
    normalized = normalizeEan(rawEan);
  } catch (e) {
    if (e instanceof EanError) return null;
    throw e;
  }

  return prisma.game.findFirst({
    where: { ean: normalized, deletedAt: null },
    include: gameWithCopiesInclude,
  });
}
