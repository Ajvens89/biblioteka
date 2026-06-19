import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";

export type SlugResolveResult = {
  gameId: string;
  canonicalSlug: string;
  requestedSlug: string;
  isAlias: boolean;
};

/** Rozwiązuje slug (primary lub alias) na grę. */
export async function resolveGameSlug(
  db: PrismaClient,
  slug: string,
): Promise<SlugResolveResult | null> {
  const game = await db.game.findFirst({
    where: { slug, deletedAt: null, isActive: true },
    select: { id: true, slug: true },
  });
  if (game) {
    return { gameId: game.id, canonicalSlug: game.slug, requestedSlug: slug, isAlias: false };
  }

  const alias = await db.gameSlugAlias.findUnique({
    where: { slug },
    include: { game: { select: { id: true, slug: true, deletedAt: true, isActive: true } } },
  });
  if (!alias?.game || alias.game.deletedAt || !alias.game.isActive) return null;

  return {
    gameId: alias.game.id,
    canonicalSlug: alias.game.slug,
    requestedSlug: slug,
    isAlias: true,
  };
}

export async function addSlugAlias(gameId: string, slug: string) {
  return prisma.gameSlugAlias.create({ data: { gameId, slug } });
}

export async function removeSlugAlias(slug: string) {
  return prisma.gameSlugAlias.delete({ where: { slug } });
}
