import { readFile } from "node:fs/promises";

const FETCH_TIMEOUT_MS = 120_000;

/** Wczytuje CSV z pliku lokalnego lub z publicznego URL (np. Firebase Storage na produkcji). */
export async function readCsvBuffer(
  localPath: string | null,
  remoteUrlEnv?: string,
): Promise<Buffer | null> {
  const url = remoteUrlEnv?.trim();
  if (url) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (!res.ok) {
        console.error(`[csv] HTTP ${res.status} dla ${url}`);
        return null;
      }
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      console.error("[csv] Pobieranie z URL nie powiodło się:", err);
      return null;
    }
  }

  if (!localPath) return null;
  return readFile(localPath);
}
