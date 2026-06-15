import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { normalizeEan } from "@/lib/services/ean";
import { paginateIds, sortGamesByAvailableCopies } from "@/lib/games/sort-games-by-availability";
import type { GameFilterInput } from "@/lib/validations/game";

export const gameListInclude = {
  publisher: true,
  designer: true,
  categories: { include: { category: true } },
  tags: { include: { tag: true } },
  copies: { select: { id: true, status: true } },
} satisfies Prisma.GameInclude;

export type GameListItem = Prisma.GameGetPayload<{ include: typeof gameListInclude }>;

export function buildGameWhere(filters: GameFilterInput): Prisma.GameWhereInput {
  const where: Prisma.GameWhereInput = {
    deletedAt: null,
    isActive: true,
  };

  if (filters.ean) {
    try {
      const normalized = normalizeEan(filters.ean);
      where.ean = normalized;
    } catch {
      where.ean = "__invalid__";
    }
  } else if (filters.q) {
    let eanClause: Prisma.GameWhereInput | null = null;
    try {
      const normalized = normalizeEan(filters.q);
      eanClause = { ean: normalized };
    } catch {
      /* nie wygląda na EAN — szukaj tekstowo */
    }
    const textClauses: Prisma.GameWhereInput[] = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
      { shortDescription: { contains: filters.q, mode: "insensitive" } },
      { tags: { some: { tag: { name: { contains: filters.q, mode: "insensitive" } } } } },
      { publisher: { name: { contains: filters.q, mode: "insensitive" } } },
      { designer: { name: { contains: filters.q, mode: "insensitive" } } },
    ];
    if (eanClause) textClauses.push(eanClause);
    where.OR = textClauses;
  }

  if (filters.collectionType) where.collectionType = filters.collectionType;

  if (filters.category) {
    where.categories = { some: { category: { slug: filters.category } } };
  }
  if (filters.type) where.type = filters.type;
  if (filters.difficulty) where.difficulty = filters.difficulty;
  if (filters.minPlayers) where.maxPlayers = { gte: filters.minPlayers };
  if (filters.maxPlayers) where.minPlayers = { lte: filters.maxPlayers };
  if (filters.maxPlayTime) where.minPlayTime = { lte: filters.maxPlayTime };
  if (filters.minAge) where.minAge = { lte: filters.minAge };
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

export async function fetchGames(filters: GameFilterInput) {
  const where = buildGameWhere(filters);

  if (filters.sort === "available") {
    return fetchGamesSortedByAvailability(filters, where);
  }

  const orderBy = buildGameOrderBy(filters.sort);
  const skip = (filters.page - 1) * filters.pageSize;

  const [items, total] = await Promise.all([
    prisma.game.findMany({
      where,
      include: gameListInclude,
      orderBy,
      skip,
      take: filters.pageSize,
    }),
    prisma.game.count({ where }),
  ]);

  return { items, total, page: filters.page, pageSize: filters.pageSize };
}

async function fetchGamesSortedByAvailability(
  filters: GameFilterInput,
  where: Prisma.GameWhereInput,
) {
  const [matching, total] = await Promise.all([
    prisma.game.findMany({
      where,
      select: {
        id: true,
        title: true,
        copies: { select: { status: true } },
      },
    }),
    prisma.game.count({ where }),
  ]);

  const sortedIds = sortGamesByAvailableCopies(matching).map((g) => g.id);
  const pageIds = paginateIds(sortedIds, filters.page, filters.pageSize);

  if (pageIds.length === 0) {
    return { items: [], total, page: filters.page, pageSize: filters.pageSize };
  }

  const rows = await prisma.game.findMany({
    where: { id: { in: pageIds } },
    include: gameListInclude,
  });
  const byId = new Map(rows.map((g) => [g.id, g]));
  const items = pageIds
    .map((id) => byId.get(id))
    .filter((g): g is GameListItem => g !== undefined);

  return { items, total, page: filters.page, pageSize: filters.pageSize };
}

export async function fetchGameBySlug(slug: string) {
  return prisma.game.findFirst({
    where: { slug, deletedAt: null },
    include: {
      ...gameListInclude,
      images: { orderBy: { sortOrder: "asc" } },
      reservations: {
        where: {
          status: { in: ["PENDING", "APPROVED", "READY_FOR_PICKUP"] },
        },
        include: { user: { select: { fullName: true, email: true } } },
        take: 10,
        orderBy: { createdAt: "desc" },
      },
    },
  });
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
    },
    include: gameListInclude,
    orderBy: { title: "asc" },
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

/** Gry do podglądu w hero — tylko z okładką i wolnym egzemplarzem w bibliotece. */
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

  const withAvailable = await prisma.game.findMany({
    where: {
      ...baseWhere,
      copies: { some: { status: "AVAILABLE" } },
    },
    include: gameListInclude,
    orderBy: [{ isFeatured: "desc" }, { title: "asc" }],
    take: limit,
  });

  if (withAvailable.length >= limit) return withAvailable;

  const exclude = withAvailable.map((g) => g.id);
  const rest = await prisma.game.findMany({
    where: {
      ...baseWhere,
      id: exclude.length ? { notIn: exclude } : undefined,
      copies: { some: {} },
    },
    include: gameListInclude,
    orderBy: [{ isFeatured: "desc" }, { title: "asc" }],
    take: limit - withAvailable.length,
  });

  return [...withAvailable, ...rest];
}

export async function fetchSimilarGames(
  gameId: string,
  categoryIds: string[],
  collectionType: "BOARD_GAME" | "RPG",
  limit = 4,
) {
  if (categoryIds.length === 0) {
    return prisma.game.findMany({
      where: {
        id: { not: gameId },
        deletedAt: null,
        isActive: true,
        collectionType,
      },
      include: gameListInclude,
      take: limit,
      orderBy: { popularityCount: "desc" },
    });
  }
  return prisma.game.findMany({
    where: {
      id: { not: gameId },
      deletedAt: null,
      isActive: true,
      OR: [
        { categories: { some: { categoryId: { in: categoryIds } } } },
        { collectionType },
      ],
    },
    include: gameListInclude,
    take: limit,
    orderBy: { popularityCount: "desc" },
  });
}

export async function fetchPublicStats() {
  const [games, copies, available, rpg] = await Promise.all([
    prisma.game.count({ where: { deletedAt: null, isActive: true } }),
    prisma.gameCopy.count(),
    prisma.gameCopy.count({ where: { status: "AVAILABLE" } }),
    prisma.game.count({
      where: { deletedAt: null, isActive: true, collectionType: "RPG" },
    }),
  ]);
  return { games, copies, available, rpg };
}
