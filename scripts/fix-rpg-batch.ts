/**
 * Poprawia typ zbioru, kategorię i parametry RPG dla gier dodanych hurtowo po EAN.
 *   npx tsx scripts/fix-rpg-batch.ts
 *   npx tsx scripts/fix-rpg-batch.ts --dry-run
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import slugify from "slugify";

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

function makeSlug(name: string) {
  return slugify(name, { lower: true, strict: true, locale: "pl" });
}

async function main() {
  const prisma = new PrismaClient();

  const rpgCategory = await prisma.category.upsert({
    where: { slug: "rpg" },
    create: { name: "RPG", slug: "rpg" },
    update: {},
  });

  let fixed = 0;
  let missing = 0;

  try {
    for (const ean of EANS) {
      const game = await prisma.game.findFirst({
        where: { ean, deletedAt: null },
        include: { categories: { include: { category: true } } },
      });

      if (!game) {
        console.log(`✗ brak gry: ${ean}`);
        missing += 1;
        continue;
      }

      const wrongType = game.collectionType !== "RPG" || game.type !== "RPG";
      const wrongCategory = !game.categories.some((gc) => gc.categoryId === rpgCategory.id);
      const wrongTimes = game.minPlayTime !== 0 || game.maxPlayTime !== 0;

      if (!wrongType && !wrongCategory && !wrongTimes) {
        console.log(`○ ${game.title} — OK`);
        continue;
      }

      const parts: string[] = [];
      if (wrongType) parts.push("typ→RPG");
      if (wrongCategory) {
        const old = game.categories.map((gc) => gc.category.name).join(", ") || "brak";
        parts.push(`kategoria: ${old}→RPG`);
      }
      if (wrongTimes) parts.push("czas→0");

      console.log(`+ ${game.title} — ${parts.join(", ")}`);

      if (dryRun) {
        fixed += 1;
        continue;
      }

      await prisma.$transaction(async (tx) => {
        await tx.gameCategory.deleteMany({ where: { gameId: game.id } });
        await tx.game.update({
          where: { id: game.id },
          data: {
            collectionType: "RPG",
            type: "RPG",
            minPlayTime: 0,
            maxPlayTime: 0,
            categories: { create: { categoryId: rpgCategory.id } },
          },
        });
      });
      fixed += 1;
    }

    console.log(`\n${dryRun ? "[dry-run] " : ""}Poprawiono: ${fixed}, brak gry: ${missing}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
