import type { PrismaClient } from "@prisma/client";

export type DuplicateCandidate = {
  gameA: { id: string; title: string; slug: string; ean: string | null };
  gameB: { id: string; title: string; slug: string; ean: string | null };
  reason: string;
  score: number;
};

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9ąćęłńóśźż\s]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function titleSimilarity(a: string, b: string): number {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  const wordsA = new Set(na.split(" "));
  const wordsB = new Set(nb.split(" "));
  const inter = [...wordsA].filter((w) => wordsB.has(w) && w.length > 2).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  return union > 0 ? inter / union : 0;
}

export async function findDuplicateCandidates(db: PrismaClient): Promise<DuplicateCandidate[]> {
  const games = await db.game.findMany({
    where: { deletedAt: null, isActive: true },
    include: { publisher: true },
    orderBy: { title: "asc" },
  });

  const results: DuplicateCandidate[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < games.length; i++) {
    for (let j = i + 1; j < games.length; j++) {
      const a = games[i]!;
      const b = games[j]!;

      if (a.ean && b.ean && a.ean === b.ean) {
        const key = [a.id, b.id].sort().join(":");
        if (!seen.has(key)) {
          seen.add(key);
          results.push({
            gameA: { id: a.id, title: a.title, slug: a.slug, ean: a.ean },
            gameB: { id: b.id, title: b.title, slug: b.slug, ean: b.ean },
            reason: "Identyczny EAN",
            score: 1,
          });
        }
        continue;
      }

      const sim = titleSimilarity(a.title, b.title);
      if (sim >= 0.85) {
        const key = [a.id, b.id].sort().join(":");
        if (!seen.has(key)) {
          seen.add(key);
          results.push({
            gameA: { id: a.id, title: a.title, slug: a.slug, ean: a.ean },
            gameB: { id: b.id, title: b.title, slug: b.slug, ean: b.ean },
            reason: sim >= 1 ? "Identyczny tytuł" : "Podobny tytuł",
            score: sim,
          });
        }
        continue;
      }

      if (
        a.publisherId &&
        a.publisherId === b.publisherId &&
        sim >= 0.6
      ) {
        const key = [a.id, b.id].sort().join(":");
        if (!seen.has(key)) {
          seen.add(key);
          results.push({
            gameA: { id: a.id, title: a.title, slug: a.slug, ean: a.ean },
            gameB: { id: b.id, title: b.title, slug: b.slug, ean: b.ean },
            reason: "Tytuł + wydawca",
            score: sim,
          });
        }
      }
    }
  }

  return results.sort((x, y) => y.score - x.score);
}
