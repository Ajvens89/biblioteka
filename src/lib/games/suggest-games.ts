import { prisma } from "@/lib/db";
import { catalogTextConditions } from "@/lib/games/catalog-text-search";
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

  const take = Number.isFinite(limit)
    ? Math.min(Math.max(Math.trunc(limit), 1), SUGGEST_MAX_LIMIT)
    : SUGGEST_DEFAULT_LIMIT;

  const rows = await prisma.game.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      OR: catalogTextConditions(q),
    },
    select: {
      title: true,
      slug: true,
      coverImageUrl: true,
      collectionType: true,
      publisher: { select: { name: true } },
    },
    orderBy: [{ title: "asc" }],
    take,
  });

  const qLower = q.toLowerCase();
  return rows.map((g) => {
    let matchKind: GameSuggestItem["matchKind"] = "title";
    if (!g.title.toLowerCase().includes(qLower) && g.publisher?.name.toLowerCase().includes(qLower)) {
      matchKind = "publisher";
    }
    return {
      title: g.title,
      slug: g.slug,
      coverImageUrl: g.coverImageUrl,
      collectionType: g.collectionType,
      matchKind,
    };
  });
}
