import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { GameFilterInput } from "@/lib/validations/game";

export const gameListInclude = {
  publisher: true,
  designer: true,
  categories: { include: { category: true } },
  tags: { include: { tag: true } },
  copies: { select: { id: true, status: true } },
} satisfies Prisma.GameInclude;

export function buildGameWhere(filters: GameFilterInput): Prisma.GameWhereInput {
  const where: Prisma.GameWhereInput = {
    deletedAt: null,
    isActive: true,
  };

  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
      { shortDescription: { contains: filters.q, mode: "insensitive" } },
      { tags: { some: { tag: { name: { contains: filters.q, mode: "insensitive" } } } } },
    ];
  }

  if (filters.category) {
    where.categories = { some: { category: { slug: filters.category } } };
  }
  if (filters.type) where.type = filters.type;
  if (filters.difficulty) where.difficulty = filters.difficulty;
  if (filters.minPlayers) where.maxPlayers = { gte: filters.minPlayers };
  if (filters.maxPlayers) where.minPlayers = { lte: filters.maxPlayers };
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
      return [{ popularityCount: "desc" }];
    case "available":
      return [{ popularityCount: "desc" }];
    default:
      return [{ title: "asc" }];
  }
}

export async function fetchGames(filters: GameFilterInput) {
  const where = buildGameWhere(filters);
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
