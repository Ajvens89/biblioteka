import type { PrismaClient } from "@prisma/client";
import slugify from "slugify";
import { logAudit } from "@/lib/audit";
import { ServiceError } from "@/lib/services/errors";

export type MergeGamesInput = {
  primaryGameId: string;
  secondaryGameId: string;
  actorId: string;
};

/**
 * Scal dwie gry: przenosi egzemplarze, rezerwacje, wypożyczenia; archiwizuje secondary.
 */
export async function mergeGames(db: PrismaClient, input: MergeGamesInput): Promise<void> {
  if (input.primaryGameId === input.secondaryGameId) {
    throw new ServiceError("Nie można scalić gry z samą sobą.", "INVALID");
  }

  const [primary, secondary] = await Promise.all([
    db.game.findUnique({ where: { id: input.primaryGameId } }),
    db.game.findUnique({ where: { id: input.secondaryGameId } }),
  ]);

  if (!primary || !secondary) {
    throw new ServiceError("Jedna z gier nie istnieje.", "NOT_FOUND");
  }

  await db.$transaction(async (tx) => {
    await tx.gameCopy.updateMany({
      where: { gameId: secondary.id },
      data: { gameId: primary.id },
    });

    await tx.reservation.updateMany({
      where: { gameId: secondary.id },
      data: { gameId: primary.id },
    });

    const secondaryCategories = await tx.gameCategory.findMany({ where: { gameId: secondary.id } });
    for (const gc of secondaryCategories) {
      await tx.gameCategory.upsert({
        where: { gameId_categoryId: { gameId: primary.id, categoryId: gc.categoryId } },
        create: { gameId: primary.id, categoryId: gc.categoryId },
        update: {},
      }).catch(() => undefined);
    }

    const secondaryTags = await tx.gameTag.findMany({ where: { gameId: secondary.id } });
    for (const gt of secondaryTags) {
      await tx.gameTag.upsert({
        where: { gameId_tagId: { gameId: primary.id, tagId: gt.tagId } },
        create: { gameId: primary.id, tagId: gt.tagId },
        update: {},
      }).catch(() => undefined);
    }

    await tx.gameImage.updateMany({
      where: { gameId: secondary.id },
      data: { gameId: primary.id },
    });

    await tx.gameSlugAlias.upsert({
      where: { slug: secondary.slug },
      create: { gameId: primary.id, slug: secondary.slug },
      update: { gameId: primary.id },
    });

    await tx.game.update({
      where: { id: secondary.id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        slug: `${secondary.slug}-merged-${secondary.id.slice(0, 8)}`,
      },
    });
  });

  await logAudit({
    actorId: input.actorId,
    action: "UPDATE",
    entityType: "game_merge",
    entityId: primary.id,
    metadata: {
      primaryGameId: primary.id,
      secondaryGameId: secondary.id,
      secondaryTitle: secondary.title,
    },
  });
}

export async function fixSlugMismatch(
  db: PrismaClient,
  gameId: string,
  newSlug?: string,
): Promise<{ oldSlug: string; newSlug: string }> {
  const game = await db.game.findUnique({ where: { id: gameId } });
  if (!game) throw new ServiceError("Gra nie istnieje.", "NOT_FOUND");

  const oldSlug = game.slug;
  const targetSlug =
    newSlug ??
    slugify(game.title, { lower: true, strict: true, locale: "pl" });

  if (targetSlug === oldSlug) return { oldSlug, newSlug: oldSlug };

  const conflict = await db.game.findFirst({ where: { slug: targetSlug, id: { not: gameId } } });
  if (conflict) {
    throw new ServiceError(`Slug „${targetSlug}” jest już zajęty.`, "SLUG_CONFLICT");
  }

  await db.$transaction(async (tx) => {
    await tx.gameSlugAlias.upsert({
      where: { slug: oldSlug },
      create: { gameId: game.id, slug: oldSlug },
      update: { gameId: game.id },
    });
    await tx.game.update({
      where: { id: gameId },
      data: { slug: targetSlug },
    });
  });

  return { oldSlug, newSlug: targetSlug };
}
