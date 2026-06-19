import { prisma } from "@/lib/db";
import { classifyEan } from "@/lib/services/ean-validation";
import { fixSlugMismatch } from "@/lib/services/merge-games";

const dryRun = process.argv.includes("--dry-run");

/** Poprawki ETAP 2: slug Filmomaniak, status EAN, type dla 3 gier planszowych. */
async function main() {
  console.log(dryRun ? "=== DRY RUN ===" : "=== BACKFILL ETAP 2 ===");

  const typeFixes: Record<string, "BOARD" | "CARD"> = {
    "Dungeons & Dragons Starter Set": "BOARD",
    Gloomhaven: "BOARD",
    "Wiedźmin: Ścieżka Przeznaczenia": "BOARD",
  };

  for (const [title, newType] of Object.entries(typeFixes)) {
    const game = await prisma.game.findFirst({ where: { title, deletedAt: null } });
    if (!game) {
      console.log(`[type] Pominięto — nie znaleziono: ${title}`);
      continue;
    }
    if (game.type === newType) {
      console.log(`[type] OK: ${title}`);
      continue;
    }
    console.log(`[type] ${title}: ${game.type} → ${newType}`);
    if (!dryRun) {
      await prisma.game.update({ where: { id: game.id }, data: { type: newType } });
    }
  }

  const filmomaniak = await prisma.game.findFirst({
    where: { OR: [{ slug: "catan", title: { contains: "Filmomaniak", mode: "insensitive" } }, { title: "Filmomaniak" }] },
  });
  if (filmomaniak && filmomaniak.slug === "catan") {
    console.log(`[slug] Filmomaniak: catan → filmomaniak (alias catan)`);
    if (!dryRun) {
      await fixSlugMismatch(prisma, filmomaniak.id, "filmomaniak");
    }
  } else if (filmomaniak) {
    console.log(`[slug] Filmomaniak slug=${filmomaniak.slug} — bez zmian`);
  }

  const games = await prisma.game.findMany({ where: { deletedAt: null, isActive: true } });
  let eanUpdated = 0;
  for (const g of games) {
    const result = classifyEan(g.ean);
    const status = result.ok ? "VALID" : result.status;
    if (g.eanValidationStatus === status) continue;
    eanUpdated++;
    if (!dryRun) {
      await prisma.game.update({
        where: { id: g.id },
        data: {
          eanValidationStatus: status,
          ...(result.ok && result.normalized ? { ean: result.normalized } : {}),
        },
      });
    }
  }
  console.log(`[ean] Zaktualizowano status dla ${eanUpdated} gier`);

  console.log("Gotowe.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
