/**
 * Weryfikacja importu products.json
 *
 *   npm run verify:products-import
 */
import "dotenv/config";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import path from "node:path";
import {
  loadProductsFile,
  normalizeProductBarcode,
  importProductsFromFile,
  formatImportReport,
} from "../src/lib/services/import-products";
import { findGameByEan } from "../src/lib/services/game-by-ean";

const VERIFY_FILE = path.resolve("data/products-verify.json");
const PREFIX = "verify-import-";

function createPrisma() {
  const url = process.env.DATABASE_URL?.replace(/[?&]pgbouncer=true/gi, "") ?? process.env.DATABASE_URL;
  return url && url !== process.env.DATABASE_URL
    ? new PrismaClient({ datasources: { db: { url } } })
    : new PrismaClient();
}

const prisma = createPrisma();

async function cleanup() {
  await prisma.gameCopy.deleteMany({
    where: {
      OR: [
        { game: { slug: { startsWith: PREFIX } } },
        { inventoryNumber: { startsWith: "ZF-EGZ-IMP-" }, notes: { contains: "Import products.json" } },
      ],
    },
  });
  await prisma.game.deleteMany({
    where: {
      OR: [
        { slug: { startsWith: PREFIX } },
        { title: { startsWith: "Verify Import" } },
      ],
    },
  });
}

async function main() {
  const { data } = await loadProductsFile(VERIFY_FILE);
  assert.ok(Array.isArray(data.collection), "collection musi być tablicą");
  assert.ok(data.collection.length > 0, "collection jest pusta");

  const sample = data.collection[0];
  assert.ok(sample?.name?.trim(), "Pierwszy rekord musi mieć name");
  const ean = normalizeProductBarcode(sample.barcode);
  assert.ok(ean, "Przykładowy rekord musi mieć poprawny barcode/EAN");

  const dryStats = await importProductsFromFile(prisma, VERIFY_FILE, { dryRun: true });
  assert.ok(dryStats.read > 0, "Dry-run powinien odczytać rekordy");
  console.log(formatImportReport(dryStats));

  if (!process.env.DATABASE_URL) {
    throw new Error("Brak DATABASE_URL");
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (e) {
    throw new Error(
      `PostgreSQL niedostępny — uruchom: npx prisma dev --detach (${e instanceof Error ? e.message : e})`,
    );
  }

  await cleanup();

  const importStats = await importProductsFromFile(prisma, VERIFY_FILE, { dryRun: false });
  console.log(formatImportReport(importStats));
  assert.ok(importStats.created + importStats.updated >= 1, "Import powinien utworzyć lub zaktualizować grę");

  const game = await prisma.game.findFirst({
    where: { ean, deletedAt: null },
    include: { copies: true },
  });
  if (!game) throw new Error(`Brak gry z EAN ${ean} po imporcie`);

  assert.equal(game.collectionType, "BOARD_GAME");
  assert.ok(game.copies.length >= 1, "Powinien być co najmniej 1 egzemplarz");

  const badBarcode = game.copies.some((c) => c.barcode && c.barcode === game.ean);
  if (badBarcode) throw new Error("EAN produktu trafił do game_copies.barcode");

  const found = await findGameByEan(prisma, ean);
  assert.equal(found?.id, game.id, "findGameByEan powinien znaleźć zaimportowaną grę");

  const reimport = await importProductsFromFile(prisma, VERIFY_FILE, { dryRun: false });
  assert.equal(reimport.created, 0, "Ponowny import nie powinien tworzyć duplikatu gry");
  assert.ok(reimport.updated >= 0);

  const dupCount = await prisma.game.count({
    where: { ean, deletedAt: null },
  });
  assert.equal(dupCount, 1, "Dokładnie jedna aktywna gra na EAN");

  await cleanup();
  console.log("\n✅ PRODUCTS IMPORT OK");
}

main()
  .catch((e) => {
    console.error(`\n❌ PRODUCTS IMPORT FAILED: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
