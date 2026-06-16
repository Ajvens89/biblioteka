/**
 * Dodaje brakujące egzemplarze (domyślnie 1 szt.) dla gier po EAN.
 *   npx tsx scripts/add-copies-by-ean.ts
 *   npx tsx scripts/add-copies-by-ean.ts --dry-run
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { ensureCopiesForGame } from "../src/lib/services/import-products";

const EANS = [
  "9788395409523",
  "9788395802034",
  "9788395409592",
  "9788395802027",
  "9788395409547",
  "9788396103109",
  "9788393057122",
  "9788364198045",
  "9788364198175",
  "9788364198342",
  "9788364198892",
  "9788367619028",
  "9788364198533",
  "9788364198144",
  "9788364198496",
  "9788364198410",
  "9788395672002",
  "9788397264588",
  "9788396134837",
  "9788396566362",
];

const dryRun = process.argv.includes("--dry-run");
const targetCount = 1;

async function main() {
  const prisma = new PrismaClient();
  let added = 0;
  let skipped = 0;
  let missing = 0;

  try {
    for (const ean of EANS) {
      const game = await prisma.game.findFirst({
        where: { ean, deletedAt: null },
        include: { copies: true },
      });

      if (!game) {
        console.log(`✗ brak gry: EAN ${ean}`);
        missing += 1;
        continue;
      }

      const current = game.copies.length;
      if (current >= targetCount) {
        console.log(`○ ${game.title} — już ${current} egz.`);
        skipped += 1;
        continue;
      }

      const copiesAdded = await ensureCopiesForGame(
        prisma,
        game.id,
        targetCount,
        targetCount,
        dryRun,
      );

      if (copiesAdded > 0) {
        console.log(`+ ${game.title} — dodano ${copiesAdded} egz.`);
        added += copiesAdded;
      } else {
        console.log(`○ ${game.title} — bez zmian`);
        skipped += 1;
      }
    }

    console.log(
      `\n${dryRun ? "[dry-run] " : ""}Dodano: ${added}, pominięto: ${skipped}, brak gry: ${missing}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
