import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseGamesJson } from "./games-json";

// Keep each filesystem call tied to a literal candidate, including its read (not only path resolution).
const ROOT_FILE = path.join(process.cwd(), "games.json");
const DATA_FILE = path.join(process.cwd(), "data", "games.json");
const PUBLIC_FILE = path.join(process.cwd(), "public", "games.json");
const DEFAULT_FILES = [
  { filePath: ROOT_FILE, exists: () => existsSync(ROOT_FILE), read: () => readFile(ROOT_FILE, "utf8") },
  { filePath: DATA_FILE, exists: () => existsSync(DATA_FILE), read: () => readFile(DATA_FILE, "utf8") },
  { filePath: PUBLIC_FILE, exists: () => existsSync(PUBLIC_FILE), read: () => readFile(PUBLIC_FILE, "utf8") },
];

export function resolveDefaultGamesJsonPath(): string | null {
  return DEFAULT_FILES.find((candidate) => candidate.exists())?.filePath ?? null;
}

export async function loadDefaultGamesJsonFile() {
  const source = DEFAULT_FILES.find((candidate) => candidate.exists());
  if (!source) return null;
  return { filePath: source.filePath, data: parseGamesJson(await source.read()) };
}
