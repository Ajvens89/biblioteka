import { prisma } from "@/lib/db";

export const SUGGEST_MIN_QUERY_LENGTH = 2;
export const SUGGEST_MAX_QUERY_LENGTH = 80;
export const SUGGEST_DEFAULT_LIMIT = 8;
export const SUGGEST_MAX_LIMIT = 12;

export type GameSuggestItem = {
  title: string;
  slug: string;
  coverImageUrl: string | null;
  collectionType: "BOARD_GAME" | "RPG";
};

export function normalizeSuggestQuery(raw: string): string {
  return raw.trim().slice(0, SUGGEST_MAX_QUERY_LENGTH);
}

export async function suggestGames(
  query: string,
  limit = SUGGEST_DEFAULT_LIMIT,
): Promise<GameSuggestItem[]> {
  const q = normalizeSuggestQuery(query);
  if (q.length < SUGGEST_MIN_QUERY_LENGTH) return [];

  const take = Math.min(Math.max(limit, 1), SUGGEST_MAX_LIMIT);

  return prisma.game.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { shortDescription: { contains: q, mode: "insensitive" } },
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
    },
    orderBy: [{ title: "asc" }],
    take,
  });
}
