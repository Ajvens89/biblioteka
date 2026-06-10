import { prisma } from "@/lib/db";

export type GameSuggestItem = {
  title: string;
  slug: string;
  coverImageUrl: string | null;
  collectionType: "BOARD_GAME" | "RPG";
};

export async function suggestGames(query: string, limit = 8): Promise<GameSuggestItem[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  return prisma.game.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { shortDescription: { contains: q, mode: "insensitive" } },
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
    take: limit,
  });
}
