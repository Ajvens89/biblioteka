/**
 * Usuwa pliki okładek w public/covers/ niepowiązane z żadną grą w bazie.
 *
 *   npx tsx scripts/cleanup-orphan-covers.ts
 *   npx tsx scripts/cleanup-orphan-covers.ts --dry-run
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const COVERS_DIR = join(process.cwd(), "public", "covers");
const dryRun = process.argv.includes("--dry-run");

/** Znane śmieci z importów hurtowych — usuwane nawet jeśli nie w bazie. */
const FORCE_DELETE = new Set([
  "the-army-painter-warpaints-fanatic-afterglow.626cd4310e.jpg",
  "afterglow.626cd4310e.jpg",
  "nemezis-s2p30100-savage-worlds-perfect-paperback-november-1-2013-multi-colored.6bdb0cdd5d.jpg",
  "ashen-stars-hardcover.37e536fc7b.jpg",
  "modern-age-basic-rulebook-hardcover.d1c10858a6.jpg",
]);

async function main() {
  const prisma = new PrismaClient();
  const games = await prisma.game.findMany({
    where: { deletedAt: null },
    select: { coverImageUrl: true },
  });

  const referenced = new Set<string>();
  for (const g of games) {
    const url = g.coverImageUrl?.trim();
    if (url?.startsWith("/covers/")) {
      referenced.add(url.replace("/covers/", ""));
    }
  }

  const files = readdirSync(COVERS_DIR);
  let removed = 0;

  for (const file of files) {
    const orphan = !referenced.has(file);
    const forced = FORCE_DELETE.has(file);
    if (!orphan && !forced) continue;

    if (forced || orphan) {
      const label = forced ? "FORCE" : "ORPHAN";
      console.log(`${dryRun ? "[dry-run] " : ""}${label}: ${file}`);
      if (!dryRun) {
        unlinkSync(join(COVERS_DIR, file));
      }
      removed++;
    }
  }

  console.log(`\n${dryRun ? "Do usunięcia" : "Usunięto"}: ${removed} plików`);
  await prisma.$disconnect();
}

main();
