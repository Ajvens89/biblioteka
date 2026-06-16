import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const BATCH2_SLUGS = [
  "afterglow",
  "savage-worlds-edycja-polska-2015",
  "savage-worlds-nemezis",
  "savage-worlds-horror-companion",
  "dungeon-world-podziemia-i-potwory",
  "kult-boskosc-utracona",
  "armie-apokalipsy",
  "klanarchia",
  "modern-age-podrecznik-podstawowy",
  "ashen-stars",
  "blades-in-the-dark",
  "monster-of-the-week-druga-edycja",
  "dune-adventures-in-the-imperium",
];

async function main() {
  const prisma = new PrismaClient();
  let ok = 0;
  let issues = 0;

  console.log("=== Audyt RPG batch 2 ===\n");

  for (const slug of BATCH2_SLUGS) {
    const g = await prisma.game.findFirst({
      where: { slug, deletedAt: null },
      select: {
        title: true,
        ean: true,
        collectionType: true,
        type: true,
        coverImageUrl: true,
        description: true,
        _count: { select: { copies: true } },
      },
    });

    if (!g) {
      console.log(`✗ BRAK: ${slug}`);
      issues++;
      continue;
    }

    const problems: string[] = [];
    if (g.collectionType !== "RPG") problems.push(`typ=${g.collectionType}`);
    if (g.type !== "RPG") problems.push(`gameType=${g.type}`);
    if (!g.coverImageUrl?.trim()) problems.push("brak okładki");
    if (!g.description?.trim()) problems.push("brak opisu");
    if (g._count.copies === 0) problems.push("0 egzemplarzy");

    if (problems.length === 0) {
      console.log(`✓ ${g.title} | EAN: ${g.ean ?? "-"} | egz.: ${g._count.copies}`);
      ok++;
    } else {
      console.log(`⚠ ${g.title} | ${problems.join(", ")}`);
      issues++;
    }
  }

  console.log(`\nOK: ${ok}/${BATCH2_SLUGS.length}, problemy: ${issues}`);
  await prisma.$disconnect();
  process.exit(issues > 0 ? 1 : 0);
}

main();
