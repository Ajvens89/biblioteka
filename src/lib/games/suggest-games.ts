import { prisma } from "@/lib/db";
import { normalizeProductBarcode } from "@/lib/services/import-products";
import {
  normalizeSuggestQuery,
  SUGGEST_DEFAULT_LIMIT,
  SUGGEST_MAX_LIMIT,
  type GameSuggestItem,
} from "@/lib/games/suggest-games.types";

export {
  normalizeSuggestQuery,
  SUGGEST_MIN_QUERY_LENGTH,
  SUGGEST_MAX_QUERY_LENGTH,
  SUGGEST_DEFAULT_LIMIT,
  SUGGEST_MAX_LIMIT,
  type GameSuggestItem,
} from "@/lib/games/suggest-games.types";

export async function suggestGames(
  query: string,
  limit = SUGGEST_DEFAULT_LIMIT,
): Promise<GameSuggestItem[]> {
  const q = normalizeSuggestQuery(query);
  if (q.length < 2) return [];

  const take = Math.min(Math.max(limit, 1), SUGGEST_MAX_LIMIT);
  const ean = normalizeProductBarcode(q);

  if (ean && ean.length >= 8) {
    const byEan = await prisma.game.findMany({
      where: { deletedAt: null, isActive: true, ean },
      select: {
        title: true,
        slug: true,
        coverImageUrl: true,
        collectionType: true,
      },
      take,
    });
    if (byEan.length > 0) {
      return byEan.map((g) => ({ ...g, matchKind: "ean" as const }));
    }
  }

  const rows = await prisma.game.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { shortDescription: { contains: q, mode: "insensitive" } },
        { ean: { contains: q, mode: "insensitive" } },
        { tags: { some: { tag: { name: { contains: q, mode: "insensitive" } } } } },
        { publisher: { name: { contains: q, mode: "insensitive" } } },
        { designer: { name: { contains: q, mode: "insensitive" } } },
      ],
    },
    select: {
      title: true,
      slug: true,
      coverImageUrl: true,
      collectionType: true,
      ean: true,
      tags: { select: { tag: { select: { name: true } } } },
      publisher: { select: { name: true } },
      designer: { select: { name: true } },
    },
    orderBy: [{ title: "asc" }],
    take,
  });

  const qLower = q.toLowerCase();
  return rows.map((g) => {
    let matchKind: GameSuggestItem["matchKind"] = "title";
    if (g.ean?.includes(q)) matchKind = "ean";
    else if (g.tags.some((t) => t.tag.name.toLowerCase().includes(qLower))) matchKind = "tag";
    else if (g.publisher?.name.toLowerCase().includes(qLower)) matchKind = "publisher";
    else if (g.designer?.name.toLowerCase().includes(qLower)) matchKind = "designer";
    return {
      title: g.title,
      slug: g.slug,
      coverImageUrl: g.coverImageUrl,
      collectionType: g.collectionType,
      matchKind,
    };
  });
}
