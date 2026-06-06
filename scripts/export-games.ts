/**
 * Eksport katalogu do games.json
 *   npm run export:games
 *   npm run export:games -- ./data/games.json
 */
import "dotenv/config";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  buildGamesExportFile,
  fetchGamesForExport,
  serializeGamesExport,
} from "../src/lib/services/games-json";

const outArg = process.argv.find((a) => !a.startsWith("-") && a.endsWith(".json"));
const outPath = path.resolve(outArg ?? "./data/games.json");

const prisma = new PrismaClient();

async function main() {
  const games = await fetchGamesForExport(prisma);
  const file = buildGamesExportFile(games);
  const json = serializeGamesExport(file);
  await writeFile(outPath, json, "utf8");
  console.log(`✅ Zapisano ${games.length} gier → ${outPath}`);
}

main()
  .catch((e) => {
    console.error(`❌ EXPORT FAILED: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
