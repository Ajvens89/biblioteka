/**
 * Import katalogu z games.json
 *   npm run import:games
 *   npm run import:games -- ./data/games.json
 *   npm run import:games -- ./data/games.json --dry-run
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import {
  formatGamesImportReport,
  importGamesFromFile,
  resolveGamesJsonPath,
} from "../src/lib/services/games-json";

const dryRun = process.argv.includes("--dry-run");
const filePath = resolveGamesJsonPath(process.argv);

const prisma = new PrismaClient();

async function main() {
  if (!filePath) {
    console.error(
      "❌ Nie znaleziono games.json. Podaj ścieżkę:\n" +
        "   npm run import:games -- ./data/games.json\n" +
        "   lub umieść plik w: ./games.json, ./data/games.json",
    );
    process.exit(1);
  }

  const stats = await importGamesFromFile(prisma, filePath, { dryRun });
  console.log(formatGamesImportReport(stats));
  if (stats.skipped > 0 && stats.created + stats.updated === 0) {
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(`❌ IMPORT FAILED: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
