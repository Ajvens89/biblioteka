/** CLI-only arbitrary path handling. Web routes import the filesystem-free core service instead. */
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import {
  importGamesData, parseGamesJson, type GamesJsonFile, type ImportGamesJsonStats,
} from "../../src/lib/services/games-json";

const DEFAULT_PATHS = ["./games.json", "./data/games.json", "./public/games.json"];

export function resolveGamesJsonPath(argv: string[]): string | null {
  const pathArg = argv.find((arg) =>
    !arg.startsWith("-") && arg.toLowerCase().endsWith(".json") && existsSync(path.resolve(arg)),
  );
  if (pathArg) return path.resolve(pathArg);
  for (const candidate of DEFAULT_PATHS) {
    const resolved = path.resolve(candidate);
    if (existsSync(resolved)) return resolved;
  }
  return null;
}

export async function loadGamesJsonFile(filePath: string): Promise<GamesJsonFile> {
  return parseGamesJson(await readFile(filePath, "utf8"));
}

export async function importGamesFromFile(
  prisma: PrismaClient,
  filePath: string,
  options?: { dryRun?: boolean; noOverwrite?: boolean },
): Promise<ImportGamesJsonStats> {
  return importGamesData(prisma, await loadGamesJsonFile(filePath), { ...options, sourceName: filePath });
}
