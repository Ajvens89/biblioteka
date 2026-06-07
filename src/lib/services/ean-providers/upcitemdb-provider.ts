import { fetchWithTimeout, validateCoverImageUrl } from "./image-utils";
import type { CoverCandidate } from "./types";

const TRIAL_BASE = "https://api.upcitemdb.com/prod/trial";
const PAID_BASE = "https://api.upcitemdb.com/prod/v1";

type UpcItem = {
  ean?: string;
  upc?: string;
  title?: string;
  brand?: string;
  description?: string;
  images?: string[];
  category?: string;
};

type UpcResponse = {
  code?: string;
  items?: UpcItem[];
};

let lastRequestAt = 0;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function minGapMs(): number {
  return process.env.UPCITEMDB_USER_KEY?.trim() ? 2000 : 10_000;
}

async function throttle(): Promise<void> {
  const gap = minGapMs();
  const wait = gap - (Date.now() - lastRequestAt);
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
}

function apiBase(): string {
  return process.env.UPCITEMDB_USER_KEY?.trim() ? PAID_BASE : TRIAL_BASE;
}

function requestHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  const userKey = process.env.UPCITEMDB_USER_KEY?.trim();
  const keyType = process.env.UPCITEMDB_KEY_TYPE?.trim() || "3";
  if (userKey) {
    headers.user_key = userKey;
    headers.key_type = keyType;
  }
  return headers;
}

function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Im wyżej, tym lepsze dopasowanie tytułu. */
export function scoreTitleMatch(query: string, candidate: string): number {
  const q = normalizeTitle(query);
  const c = normalizeTitle(candidate);
  if (!q || !c) return 0;
  if (c === q) return 100;
  if (c.includes(q) || q.includes(c)) return 90;

  const qWords = q.split(" ").filter((w) => w.length > 2);
  if (!qWords.length) return 0;
  const matched = qWords.filter((w) => c.includes(w)).length;
  return Math.round((matched / qWords.length) * 75);
}

function pickImages(item: UpcItem): string[] {
  const out: string[] = [];
  for (const raw of item.images ?? []) {
    const safe = validateCoverImageUrl(raw);
    if (safe && !out.includes(safe)) out.push(safe);
  }
  return out;
}

function itemToCandidate(item: UpcItem, matchScore: number): CoverCandidate | null {
  const images = pickImages(item);
  if (!images.length) return null;
  const confidence = matchScore >= 85 ? "high" : matchScore >= 50 ? "medium" : "low";
  return {
    source: "upcitemdb",
    title: item.title,
    description: item.description?.slice(0, 500),
    publisher: item.brand,
    coverImageUrl: images[0],
    thumbnailUrl: images[0],
    externalId: item.ean ?? item.upc,
    confidence,
    collectionTypeSuggestion: "BOARD_GAME",
    notes: `Katalog produktów UPCitemdb (dopasowanie ${matchScore}%).`,
  };
}

async function fetchUpcJson(path: string, query: Record<string, string>): Promise<UpcResponse | null> {
  await throttle();
  const url = new URL(`${apiBase()}${path}`);
  for (const [k, v] of Object.entries(query)) {
    if (v) url.searchParams.set(k, v);
  }
  try {
    const res = await fetchWithTimeout(url.toString(), { headers: requestHeaders() }, 12_000);
    if (!res.ok) return null;
    return (await res.json()) as UpcResponse;
  } catch {
    return null;
  }
}

/** Plan B — lookup po EAN/UPC (darmowy trial: 100 zapytań/dzień). */
export async function lookupUpcitemdbByEan(ean: string): Promise<CoverCandidate[]> {
  const data = await fetchUpcJson("/lookup", { upc: ean });
  if (!data?.items?.length) return [];

  const out: CoverCandidate[] = [];
  for (const item of data.items) {
    const candidate = itemToCandidate(item, 95);
    if (candidate) out.push(candidate);
  }
  return out;
}

/** EAN po tytule (bez wymagania okładki). */
export async function lookupUpcitemdbEanByTitle(title: string): Promise<{
  ean: string;
  title?: string;
  publisher?: string;
  score: number;
} | null> {
  const q = title.trim();
  if (!q) return null;

  const data = await fetchUpcJson("/search", { s: q });
  if (!data?.items?.length) return null;

  const ranked = data.items
    .map((item) => ({
      item,
      score: scoreTitleMatch(q, item.title ?? ""),
    }))
    .filter((row) => row.score >= 35 && (row.item.ean || row.item.upc))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  if (!best) return null;

  const raw = best.item.ean ?? best.item.upc ?? "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 13 && digits.length !== 8) return null;

  return {
    ean: digits,
    title: best.item.title,
    publisher: best.item.brand,
    score: best.score,
  };
}

/** Plan C — wyszukiwanie po tytule (gdy lookup po EAN nie ma zdjęcia). */
export async function lookupUpcitemdbByTitle(title: string): Promise<CoverCandidate[]> {
  const q = title.trim();
  if (!q) return [];

  const data = await fetchUpcJson("/search", { s: q });
  if (!data?.items?.length) return [];

  const ranked = data.items
    .map((item) => ({
      item,
      score: scoreTitleMatch(q, item.title ?? ""),
      candidate: itemToCandidate(item, scoreTitleMatch(q, item.title ?? "")),
    }))
    .filter((row) => row.candidate && row.score >= 35)
    .sort((a, b) => b.score - a.score);

  return ranked.slice(0, 3).map((row) => row.candidate!);
}
