/**
 * Import gier z products.json
 *
 *   npm run import:products
 *   npm run import:products -- ./data/products.json
 *   npm run import:products -- ./products.json --dry-run
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import {
  formatImportReport,
  importProductsFromFile,
  resolveProductsFilePath,
} from "../src/lib/services/import-products";

function createPrisma() {
  const url = process.env.DATABASE_URL?.replace(/[?&]pgbouncer=true/gi, "") ?? process.env.DATABASE_URL;
  return url && url !== process.env.DATABASE_URL
    ? new PrismaClient({ datasources: { db: { url } } })
    : new PrismaClient();
}

const prisma = createPrisma();

async function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");

  const filePath = resolveProductsFilePath(argv);
  if (!filePath) {
    console.error(
      "❌ Nie znaleziono products.json. Podaj ścieżkę:\n" +
        "   npm run import:products -- ./products.json\n" +
        "   lub umieść plik w: ./products.json, ./data/products.json, ./public/products.json",
    );
    process.exit(1);
  }

  if (!process.env.DATABASE_URL && !dryRun) {
    console.error("❌ Brak DATABASE_URL w .env");
    process.exit(1);
  }

  if (!dryRun) {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      console.error("❌ PostgreSQL niedostępny — uruchom bazę lub użyj --dry-run");
      process.exit(1);
    }
  }

  const stats = await importProductsFromFile(prisma, filePath, { dryRun });
  console.log(formatImportReport(stats));
  if (stats.dryRun) {
    console.log("\n(Uruchom bez --dry-run, aby zapisać do bazy.)");
  }
}

main()
  .catch((e) => {
    console.error(`\n❌ IMPORT FAILED: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
