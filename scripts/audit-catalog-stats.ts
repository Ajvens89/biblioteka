/**
 * Audyt spójności liczników katalogu (strona główna vs typ zbioru).
 *
 *   npm run audit:catalog-stats
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { ACTIVE_CATALOG_GAME_WHERE } from "../src/lib/games/catalog-scope";

async function main() {
  const prisma = new PrismaClient();

  const [total, board, rpg, inactive, typeMismatch] = await Promise.all([
    prisma.game.count({ where: ACTIVE_CATALOG_GAME_WHERE }),
    prisma.game.count({
      where: { ...ACTIVE_CATALOG_GAME_WHERE, collectionType: "BOARD_GAME" },
    }),
    prisma.game.count({
      where: { ...ACTIVE_CATALOG_GAME_WHERE, collectionType: "RPG" },
    }),
    prisma.game.count({
      where: { deletedAt: null, isActive: false },
    }),
    prisma.game.findMany({
      where: {
        ...ACTIVE_CATALOG_GAME_WHERE,
        type: "RPG",
        collectionType: { not: "RPG" },
      },
      select: { title: true, slug: true, collectionType: true, type: true },
      orderBy: { title: "asc" },
      take: 25,
    }),
  ]);

  const sum = board + rpg;
  const delta = total - sum;

  console.log("=== Audyt liczników katalogu ===\n");
  console.log(`Aktywne w katalogu (łącznie):     ${total}`);
  console.log(`  → gry planszowe (BOARD_GAME):    ${board}`);
  console.log(`  → podręczniki RPG:               ${rpg}`);
  console.log(`  → suma typów:                    ${sum} (różnica: ${delta})`);
  console.log(`Nieaktywne (poza katalogiem):    ${inactive}`);

  if (delta !== 0) {
    console.log(`\n⚠ board + RPG ≠ total — sprawdź collectionType w bazie`);
  } else {
    console.log("\n✓ Suma typów zgadza się z łączną liczbą aktywnych gier");
  }

  if (typeMismatch.length > 0) {
    console.log(`\n⚠ type=RPG ale collectionType≠RPG (${typeMismatch.length}):`);
    for (const g of typeMismatch) {
      console.log(`  ${g.collectionType} | ${g.title}`);
    }
  } else {
    console.log("✓ Brak oczywistych niespójności type vs collectionType");
  }

  await prisma.$disconnect();
  process.exit(delta !== 0 || typeMismatch.length > 0 ? 1 : 0);
}

main();
