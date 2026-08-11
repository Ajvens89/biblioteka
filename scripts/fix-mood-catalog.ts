/**
 * Korekta katalogu pod filtry nastrojów:
 * - usuwa błędne tagi kooperacji
 * - dopina kategorie rodzinna / kooperacja
 * - uzupełnia realistyczne czasy gry dla znanych krótkich tytułów
 *
 * Uruchomienie: npx tsx scripts/fix-mood-catalog.ts
 */
import { PrismaClient, type GameType } from "@prisma/client";
import {
  COOP_TITLE_FRAGMENTS,
  COOP_TITLE_PREFIXES,
  FAMILY_CATEGORY_SLUGS,
} from "../src/lib/games/mood-filters";

const prisma = new PrismaClient();

/** Tytuły błędnie oznaczone jako kooperacja (nie są pure coop). */
const FALSE_COOP_TITLE_FRAGMENTS = [
  "Carcassonne",
  "Wingspan",
  "Dungeons & Dragons Starter",
  "Biblioteka Zakątka",
  "Circadians",
] as const;

/** Tytuły błędnie oznaczone jako rodzinne. */
const FALSE_FAMILY_TITLE_FRAGMENTS = [
  "Root",
  "Cytadela",
  "Survive the Island",
] as const;

/** Znane krótkie partie — uzupełnij tylko gdy wygląda na domyślne 30/60. */
const SHORT_PLAYTIMES: Record<string, { min: number; max: number }> = {
  Klask: { min: 10, max: 15 },
  Codenames: { min: 15, max: 15 },
  "King of Tokyo": { min: 20, max: 30 },
  Dixit: { min: 30, max: 30 },
  Splendor: { min: 30, max: 30 },
  "7 Wonders": { min: 30, max: 30 },
  "Cash-a-Catch": { min: 20, max: 30 },
  "Owocowe Opowieści": { min: 20, max: 25 },
  Azul: { min: 30, max: 45 },
  "Just One": { min: 20, max: 20 },
  Hanabi: { min: 25, max: 25 },
  "The Mind": { min: 20, max: 20 },
};

const FAMILY_TITLE_FRAGMENTS = [
  "Junior",
  "rodzin",
  "dzieci",
  "Dzieci kontra",
  "Hello Kitty",
  "Monopoly Konie",
  "Owocowe Opowieści",
  "CzuCzu",
  "Memory",
] as const;

async function ensureCategory(slug: string, name: string) {
  return prisma.category.upsert({
    where: { slug },
    create: { slug, name },
    update: { name },
  });
}

async function unlinkCategory(gameId: string, categoryId: string) {
  await prisma.gameCategory.deleteMany({ where: { gameId, categoryId } });
}

async function linkCategory(gameId: string, categoryId: string) {
  await prisma.gameCategory.upsert({
    where: { gameId_categoryId: { gameId, categoryId } },
    create: { gameId, categoryId },
    update: {},
  });
}

function matchesFragment(title: string, fragment: string) {
  return title.toLowerCase().includes(fragment.toLowerCase());
}

async function main() {
  const rodzinne = await ensureCategory("rodzinne", "Rodzinne");
  const kooperacja = await ensureCategory("kooperacja", "Kooperacja");

  const coopCats = await prisma.category.findMany({
    where: { slug: { in: ["kooperacja", "gry-kooperacyjne"] } },
  });
  const familyCats = await prisma.category.findMany({
    where: { slug: { in: [...FAMILY_CATEGORY_SLUGS] } },
  });

  const boardGames = await prisma.game.findMany({
    where: { deletedAt: null, isActive: true, collectionType: "BOARD_GAME" },
    select: {
      id: true,
      title: true,
      type: true,
      minAge: true,
      minPlayTime: true,
      maxPlayTime: true,
      description: true,
      shortDescription: true,
      categories: { select: { categoryId: true, category: { select: { slug: true } } } },
    },
  });

  let removedFalseCoop = 0;
  let removedFalseFamily = 0;
  let addedCoop = 0;
  let addedFamily = 0;
  let setFamilyType = 0;
  let fixedPlaytime = 0;

  for (const game of boardGames) {
    const hasCoopCat = game.categories.some((c) =>
      coopCats.some((cc) => cc.id === c.categoryId),
    );
    const hasFamilyCat = game.categories.some((c) =>
      familyCats.some((fc) => fc.id === c.categoryId),
    );
    const text = `${game.title} ${game.shortDescription ?? ""} ${game.description ?? ""}`;

    const isFalseCoop = FALSE_COOP_TITLE_FRAGMENTS.some((f) =>
      matchesFragment(game.title, f),
    );
    if (isFalseCoop && hasCoopCat) {
      for (const cat of coopCats) {
        await unlinkCategory(game.id, cat.id);
      }
      removedFalseCoop++;
    }

    const isFalseFamily = FALSE_FAMILY_TITLE_FRAGMENTS.some((f) =>
      matchesFragment(game.title, f),
    );
    if (isFalseFamily && hasFamilyCat) {
      for (const cat of familyCats) {
        await unlinkCategory(game.id, cat.id);
      }
      removedFalseFamily++;
    }

    const looksCoop =
      !isFalseCoop &&
      (COOP_TITLE_FRAGMENTS.some((f) => matchesFragment(game.title, f)) ||
        COOP_TITLE_PREFIXES.some((prefix) => {
          const t = game.title.toLowerCase();
          const p = prefix.toLowerCase();
          return (
            t === p ||
            t.startsWith(`${p} `) ||
            t.startsWith(`${p}:`) ||
            t.startsWith(`${p} —`) ||
            t.startsWith(`${p} -`)
          );
        }) ||
        /kooperacyj/i.test(text) ||
        /cooperative/i.test(text));

    if (looksCoop) {
      await linkCategory(game.id, kooperacja.id);
      addedCoop++;
    }

    const looksFamily =
      !isFalseFamily &&
      (game.type === "FAMILY" ||
        game.type === "EDUCATIONAL" ||
        (game.minAge >= 1 && game.minAge <= 7) ||
        FAMILY_TITLE_FRAGMENTS.some((f) => matchesFragment(game.title, f)));

    if (looksFamily) {
      await linkCategory(game.id, rodzinne.id);
      addedFamily++;
      if (game.type === "BOARD" && game.minAge > 0 && game.minAge <= 8) {
        await prisma.game.update({
          where: { id: game.id },
          data: { type: "FAMILY" satisfies GameType },
        });
        setFamilyType++;
      }
    }

    for (const [titleKey, times] of Object.entries(SHORT_PLAYTIMES)) {
      if (!matchesFragment(game.title, titleKey)) continue;
      const looksDefault = game.minPlayTime === 30 && game.maxPlayTime === 60;
      const longerThanKnown = game.maxPlayTime > times.max;
      if (looksDefault || longerThanKnown) {
        await prisma.game.update({
          where: { id: game.id },
          data: { minPlayTime: times.min, maxPlayTime: times.max },
        });
        fixedPlaytime++;
      }
    }
  }

  // Podsumowanie po korekcie
  const { buildMoodWhere } = await import("../src/lib/games/mood-filters");
  const counts: Record<string, number> = {};
  for (const mood of ["duo", "short", "family", "coop", "rpg"] as const) {
    counts[mood] = await prisma.game.count({
      where: { deletedAt: null, isActive: true, ...buildMoodWhere(mood) },
    });
  }

  console.log(
    JSON.stringify(
      {
        removedFalseCoop,
        removedFalseFamily,
        addedCoop,
        addedFamily,
        setFamilyType,
        fixedPlaytime,
        moodCounts: counts,
        familyCats: familyCats.map((c) => c.slug),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
