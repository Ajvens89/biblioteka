import type { Prisma } from "@prisma/client";

/** Public catalog search matches names of games or their publishers, never unrelated descriptions. */
export function catalogTextConditions(query: string): Prisma.GameWhereInput[] {
  return [
    { title: { contains: query, mode: "insensitive" } },
    { publisher: { name: { contains: query, mode: "insensitive" } } },
  ];
}
