import type { Prisma } from "@prisma/client";

/** Presety nastrojów z homepage — mapowane na warunki katalogu. */
export const CATALOG_MOODS = [
  "duo",
  "short",
  "family",
  "coop",
  "rpg",
] as const;

export type CatalogMood = (typeof CATALOG_MOODS)[number];

export const CATALOG_MOOD_LABELS: Record<CatalogMood, string> = {
  duo: "Wieczór we dwoje",
  short: "Mam 30 minut",
  family: "Cała rodzina",
  coop: "Gramy przeciw grze",
  rpg: "Prowadzę sesję",
};

export const FAMILY_CATEGORY_SLUGS = [
  "rodzinne",
  "gry-rodzinne",
  "rebel-gry-planszowe-familijne",
] as const;

export const COOP_CATEGORY_SLUGS = ["kooperacja", "gry-kooperacyjne"] as const;

/** Tytuły / fragmenty tytułów typowych gier kooperacyjnych w katalogu. */
export const COOP_TITLE_FRAGMENTS = [
  "Pandemic",
  "Gloomhaven",
  "Spirit Island",
  "Forbidden",
  "Zakazana",
  "The Crew",
  "Załoga",
  "Hanabi",
  "The Mind",
  "Nemesis",
  "Flash Point",
  "Dead of Winter",
  "Aeon's End",
  "Arkham Horror",
  "Eldritch Horror",
  "Mityczny Wiatr",
  "Bohaterowie Tenefyru",
  "Guardians call",
  "Przewrotne Motylki",
] as const;

/** Tytuły dopasowywane tylko od początku (unikamy „Nowy świt” ⊂ „Circadians: Nowy Świt”). */
export const COOP_TITLE_PREFIXES = ["Nowy świt"] as const;

export function isCatalogMood(value: string | undefined | null): value is CatalogMood {
  return !!value && (CATALOG_MOODS as readonly string[]).includes(value);
}

function coopTitlePrefixClauses(prefix: string): Prisma.GameWhereInput[] {
  return [
    { title: { equals: prefix, mode: "insensitive" } },
    { title: { startsWith: `${prefix} `, mode: "insensitive" } },
    { title: { startsWith: `${prefix}:`, mode: "insensitive" } },
    { title: { startsWith: `${prefix} —`, mode: "insensitive" } },
    { title: { startsWith: `${prefix} -`, mode: "insensitive" } },
  ];
}

/**
 * Warunki Prisma dla presetu nastroju.
 * Celowo szersze niż pojedyncza kategoria — dane kategorii w bazie są niepełne.
 */
export function buildMoodWhere(mood: CatalogMood): Prisma.GameWhereInput {
  switch (mood) {
    case "duo":
      return {
        collectionType: "BOARD_GAME",
        minPlayers: { lte: 2 },
        maxPlayers: { gte: 2 },
        copies: { some: { status: "AVAILABLE" } },
      };
    case "short":
      // „Mam 30 minut” = partia realnie kończy się w ≤30 min (nie minPlayTime ≤ 30).
      return {
        collectionType: "BOARD_GAME",
        maxPlayTime: { lte: 30, gt: 0 },
      };
    case "family":
      return {
        collectionType: "BOARD_GAME",
        OR: [
          { type: { in: ["FAMILY", "EDUCATIONAL"] } },
          {
            categories: {
              some: { category: { slug: { in: [...FAMILY_CATEGORY_SLUGS] } } },
            },
          },
          { title: { contains: "Junior", mode: "insensitive" } },
          { title: { contains: "rodzin", mode: "insensitive" } },
          { title: { contains: "dzieci", mode: "insensitive" } },
          { title: { contains: "Dzieci kontra", mode: "insensitive" } },
          { minAge: { gte: 1, lte: 7 } },
        ],
      };
    case "coop":
      return {
        collectionType: "BOARD_GAME",
        OR: [
          {
            categories: {
              some: { category: { slug: { in: [...COOP_CATEGORY_SLUGS] } } },
            },
          },
          { description: { contains: "kooperacyj", mode: "insensitive" } },
          { shortDescription: { contains: "kooperacyj", mode: "insensitive" } },
          { description: { contains: "cooperative", mode: "insensitive" } },
          { shortDescription: { contains: "cooperative", mode: "insensitive" } },
          ...COOP_TITLE_FRAGMENTS.map(
            (fragment): Prisma.GameWhereInput => ({
              title: { contains: fragment, mode: "insensitive" },
            }),
          ),
          ...COOP_TITLE_PREFIXES.flatMap(coopTitlePrefixClauses),
        ],
      };
    case "rpg":
      return { collectionType: "RPG" };
  }
}
