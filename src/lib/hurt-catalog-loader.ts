import { existsSync } from "node:fs";
import path from "node:path";
import {
  buildHurtCatalog,
  parseCsvRecords,
  type HurtCatalog,
} from "@/lib/hurt-catalog";
import { readCsvBuffer } from "@/lib/csv-source";

const DEFAULT_PATHS = ["./data/hurt.csv", "./hurt.csv", "../hurt.csv"];

let cachedCatalog: HurtCatalog | null = null;
let cachedCatalogPath: string | null = null;

function scoreCsvEncoding(text: string): number {
  const mojibake = (text.match(/[¶¿]/g) || []).length;
  const polish = (text.match(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g) || []).length;
  return mojibake * 20 - polish * 2;
}

function decodeHurtCsvBuffer(buffer: Buffer): string {
  const candidates: string[] = [buffer.toString("utf8")];
  try {
    candidates.push(new TextDecoder("windows-1250").decode(buffer));
  } catch {
    /* ignore */
  }
  try {
    candidates.push(new TextDecoder("iso-8859-2").decode(buffer));
  } catch {
    /* ignore */
  }
  return candidates.sort((a, b) => scoreCsvEncoding(a) - scoreCsvEncoding(b))[0];
}

export function resolveHurtCsvPath(extraPaths: string[] = []): string | null {
  const env = process.env.HURT_CSV?.trim();
  if (env) {
    const resolved = path.resolve(env);
    if (existsSync(resolved)) return resolved;
  }
  for (const p of [...extraPaths, ...DEFAULT_PATHS]) {
    const resolved = path.resolve(p);
    if (existsSync(resolved)) return resolved;
  }
  return null;
}

export async function loadHurtCatalog(csvPath?: string): Promise<HurtCatalog | null> {
  const resolved = csvPath ? path.resolve(csvPath) : resolveHurtCsvPath();
  const cacheKey = `${process.env.HURT_CSV_URL ?? ""}|${resolved ?? ""}`;
  if (cachedCatalog && cachedCatalogPath === cacheKey) return cachedCatalog;

  const buffer = await readCsvBuffer(
    resolved && existsSync(resolved) ? resolved : null,
    process.env.HURT_CSV_URL,
  );
  if (!buffer) return null;

  const content = decodeHurtCsvBuffer(buffer);
  const records = parseCsvRecords(content);
  cachedCatalog = buildHurtCatalog(resolved ?? process.env.HURT_CSV_URL ?? "remote", records);
  cachedCatalogPath = cacheKey;
  return cachedCatalog;
}

/** Reset cache (testy / ponowne wczytanie pliku). */
export function resetHurtCatalogCache(): void {
  cachedCatalog = null;
  cachedCatalogPath = null;
}
