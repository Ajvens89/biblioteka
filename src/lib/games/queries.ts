import type { Prisma, PrismaClient } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { resolveGameSlug } from "@/lib/services/slug-resolve";
import { ACTIVE_CATALOG_GAME_WHERE } from "@/lib/games/catalog-scope";
import { normalizeEan } from "@/lib/services/ean";
import { paginateIds, sortGamesByAvailableCopies } from "@/lib/games/sort-games-by-availability";
import type { GameFilterInput } from "@/lib/validations/game";
import { buildMoodWhere, isCatalogMood } from "@/lib/games/mood-filters";
import { catalogTextConditions } from "@/lib/games/catalog-text-search";

export const gameListInclude = {
  publisher: true,
  designer: true,
  categories: { include: { category: true } },
  tags: { include: { tag: true } },
} satisfies Prisma.GameInclude;

export type GameListItem = Prisma.GameGetPayload<{ include: typeof gameListInclude }>;

function parseCategorySlugs(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function buildGameWhere(filters: GameFilterInput): Prisma.GameWhereInput {
  const where: Prisma.GameWhereInput = {
    deletedAt: null,
    isActive: true,
  };

  const andClauses: Prisma.GameWhereInput[] = [];

  if (filters.ean) {
    try {
      const normalized = normalizeEan(filters.ean);
      where.ean = normalized;
    } catch {
      where.ean = "__invalid__";
    }
  } else if (filters.q) {
    andClauses.push({ OR: catalogTextConditions(filters.q) });
  }

  if (filters.mood && isCatalogMood(filters.mood)) {
    andClauses.push(buildMoodWhere(filters.mood));
  }

  if (filters.collectionType) where.collectionType = filters.collectionType;

  if (filters.category) {
    const slugs = parseCategorySlugs(filters.category);
    if (slugs.length === 1) {
      where.categories = { some: { category: { slug: slugs[0] } } };
    } else if (slugs.length > 1) {
      where.categories = { some: { category: { slug: { in: slugs } } } };
    }
  }
  if (filters.type) where.type = filters.type;
  if (filters.difficulty) where.difficulty = filters.difficulty;
  if (filters.minPlayers) where.maxPlayers = { gte: filters.minPlayers };
  if (filters.maxPlayers) where.minPlayers = { lte: filters.maxPlayers };
  // „Do X min” = partia kończy się w ≤ X minut (pole maxPlayTime gry).
  if (filters.maxPlayTime) {
    where.maxPlayTime = { lte: filters.maxPlayTime, gt: 0 };
  }
  if (filters.minAge !== undefined) where.minAge = { lte: filters.minAge };
  if (filters.tag) {
    where.tags = { some: { tag: { slug: filters.tag } } };
  }
  if (filters.publisher) {
    where.publisher = { slug: filters.publisher };
  }
  if (filters.designer) {
    where.designer = { slug: filters.designer };
  }
  if (filters.availability === "available") {
    where.copies = { some: { status: "AVAILABLE" } };
  }

  if (andClauses.length === 1) {
    Object.assign(where, andClauses[0]);
  } else if (andClauses.length > 1) {
    where.AND = andClauses;
  }

  return where;
}

export function buildGameOrderBy(
  sort: GameFilterInput["sort"],
): Prisma.GameOrderByWithRelationInput[] {
  switch (sort) {
    case "newest":
      return [{ createdAt: "desc" }];
    case "popular":
      return [{ popularityCount: "desc" }, { title: "asc" }];
    case "available":
      return [{ title: "asc" }];
    case "playtime_asc":
      return [{ minPlayTime: "asc" }, { title: "asc" }];
    case "playtime_desc":
      return [{ maxPlayTime: "desc" }, { title: "asc" }];
    default:
      return [{ title: "asc" }];
  }
}

export async function fetchGames(filters: GameFilterInput, db: Pick<PrismaClient, "game"> = prisma) {
  const where = buildGameWhere(filters);

  if (filters.sort === "available") {
    return fetchGamesSortedByAvailability(filters, where, db);
  }

  const orderBy = buildGameOrderBy(filters.sort);
  const fetchPage = (page: number) => db.game.findMany({
    where,
    include: gameListInclude,
    orderBy,
    skip: (page - 1) * filters.pageSize,
    take: filters.pageSize,
  });
  // The common first page stays parallel; an outdated later-page link is bounded before fetching rows.
  if (filters.page === 1) {
    const [items, total] = await Promise.all([fetchPage(1), db.game.count({ where })]);
    return { items, total, page: 1, pageSize: filters.pageSize };
  }
  const total = await db.game.count({ where });
  const page = Math.min(filters.page, Math.max(1, Math.ceil(total / filters.pageSize)));
  const items = total ? await fetchPage(page) : [];
  return { items, total, page, pageSize: filters.pageSize };
}

async function fetchGamesSortedByAvailability(
  filters: GameFilterInput,
  where: Prisma.GameWhereInput,
  db: Pick<PrismaClient, "game">,
) {
  const matching = await db.game.findMany({
    where,
    select: {
      id: true,
      title: true,
      copies: { select: { status: true } },
    },
  });

  const total = matching.length;
  const page = Math.min(filters.page, Math.max(1, Math.ceil(total / filters.pageSize)));

  const sortedIds = sortGamesByAvailableCopies(matching).map((g) => g.id);
  const pageIds = paginateIds(sortedIds, page, filters.pageSize);

  if (pageIds.length === 0) {
    return { items: [], total, page, pageSize: filters.pageSize };
  }

  const rows = await db.game.findMany({
    where: { id: { in: pageIds } },
    include: gameListInclude,
  });
  const byId = new Map(rows.map((g) => [g.id, g]));
  const items = pageIds
    .map((id) => byId.get(id))
    .filter((g): g is GameListItem => g !== undefined);

  return { items, total, page, pageSize: filters.pageSize };
}

export async function fetchGameBySlug(slug: string) {
  const resolved = await resolveGameSlug(prisma, slug);
  if (!resolved) return null;

  const game = await prisma.game.findFirst({
    where: { id: resolved.gameId, ...ACTIVE_CATALOG_GAME_WHERE },
    include: {
      ...gameListInclude,
      images: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!game) return null;
  return { ...game, _slugRedirect: resolved.isAlias ? resolved.canonicalSlug : null };
}

export async function fetchFeaturedGames(limit = 6) {
  return prisma.game.findMany({
    where: { isActive: true, deletedAt: null, isFeatured: true },
    include: gameListInclude,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function fetchPopularGames(limit = 6) {
  return prisma.game.findMany({
    where: { isActive: true, deletedAt: null },
    include: gameListInclude,
    orderBy: { popularityCount: "desc" },
    take: limit,
  });
}

export async function fetchAvailableNow(limit = 6) {
  return prisma.game.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      copies: { some: { status: "AVAILABLE" } },
      coverImageUrl: { not: null },
      NOT: { coverImageUrl: "" },
    },
    include: gameListInclude,
    orderBy: [{ isFeatured: "desc" }, { popularityCount: "desc" }, { title: "asc" }],
    take: limit,
  });
}

export async function fetchNewestGames(limit = 6) {
  return prisma.game.findMany({
    where: { isActive: true, deletedAt: null },
    include: gameListInclude,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function fetchRpgGames(limit = 6) {
  return prisma.game.findMany({
    where: { isActive: true, deletedAt: null, collectionType: "RPG" },
    include: gameListInclude,
    orderBy: { title: "asc" },
    take: limit,
  });
}

const showcaseCoverWhere = {
  coverImageUrl: { not: null },
  NOT: { coverImageUrl: "" },
} satisfies Prisma.GameWhereInput;

/** Catalog previews depend on published metadata, never on physical inventory. */
export async function fetchShowcaseGames(
  collectionType: "BOARD_GAME" | "RPG",
  limit = 4,
) {
  const baseWhere: Prisma.GameWhereInput = {
    isActive: true,
    deletedAt: null,
    collectionType,
    ...showcaseCoverWhere,
  };

  return prisma.game.findMany({
    where: baseWhere,
    include: gameListInclude,
    orderBy: [{ isFeatured: "desc" }, { popularityCount: "desc" }, { title: "asc" }],
    take: limit,
  });

}

export async function fetchSimilarGames(
  gameId: string,
  categoryIds: string[],
  collectionType: "BOARD_GAME" | "RPG",
  limit = 4,
  publisherId?: string | null,
  designerId?: string | null,
) {
  const baseWhere = {
    id: { not: gameId },
    deletedAt: null,
    isActive: true,
    collectionType,
  } as const;

  const orClauses: Prisma.GameWhereInput[] = [];
  if (categoryIds.length) {
    orClauses.push({ categories: { some: { categoryId: { in: categoryIds } } } });
  }
  if (publisherId) orClauses.push({ publisherId });
  if (designerId) orClauses.push({ designerId });

  const candidates = await prisma.game.findMany({
    where: orClauses.length ? { ...baseWhere, OR: orClauses } : baseWhere,
    include: gameListInclude,
    take: Math.max(limit * 4, 16),
    orderBy: { popularityCount: "desc" },
  });

  const categorySet = new Set(categoryIds);
  const scored = candidates
    .map((g) => {
      const sharedCategories = g.categories.filter((c) => categorySet.has(c.categoryId)).length;
      const samePublisher = publisherId && g.publisherId === publisherId ? 2 : 0;
      const sameDesigner = designerId && g.designerId === designerId ? 1 : 0;
      return {
        game: g,
        score: sharedCategories * 3 + samePublisher + sameDesigner,
      };
    })
    .sort((a, b) => b.score - a.score || b.game.popularityCount - a.game.popularityCount);

  return scored.slice(0, limit).map((s) => s.game);
}

export async function fetchPublicStats(db: Pick<PrismaClient, "game"> = prisma) {
  const [games, boardGames, rpgGames] = await Promise.all([
    db.game.count({ where: ACTIVE_CATALOG_GAME_WHERE }),
    db.game.count({
      where: { ...ACTIVE_CATALOG_GAME_WHERE, collectionType: "BOARD_GAME" },
    }),
    db.game.count({
      where: { ...ACTIVE_CATALOG_GAME_WHERE, collectionType: "RPG" },
    }),
  ]);
  return { games, boardGames, rpgGames };
}

const HOME_CACHE_SECONDS = 60;

export const fetchPublicStatsCached = unstable_cache(() => fetchPublicStats(), ["home-public-stats-v6-catalog"], {
  revalidate: HOME_CACHE_SECONDS,
  tags: ["public-stats"],
});

export const fetchAvailableNowCached = unstable_cache(
  (limit = 6) => fetchAvailableNow(limit),
  ["home-available-now-v4"],
  { revalidate: HOME_CACHE_SECONDS, tags: ["home-available"] },
);

export const fetchShowcaseGamesCached = unstable_cache(
  (collectionType: "BOARD_GAME" | "RPG", limit = 4) =>
    fetchShowcaseGames(collectionType, limit),
  ["home-showcase-v5-catalog"],
  { revalidate: HOME_CACHE_SECONDS, tags: ["home-showcase"] },
);
