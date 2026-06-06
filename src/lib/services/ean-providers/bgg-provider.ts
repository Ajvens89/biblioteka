import { getBggRequestHeaders, getBggToken, isBggConfigured } from "./bgg-auth";
import { fetchWithTimeout, validateCoverImageUrl } from "./image-utils";
import type { CoverCandidate } from "./types";

const BGG_BASE = "https://boardgamegeek.com/xmlapi2";
const CACHE_TTL_MS = 1000 * 60 * 60;
const MAX_CANDIDATES = 5;

type CacheEntry = { xml: string; expires: number };
const bggCache = new Map<string, CacheEntry>();

function cacheKey(path: string) {
  return path;
}

async function fetchBggXml(path: string): Promise<string | null> {
  const key = cacheKey(path);
  const hit = bggCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.xml;

  const url = `${BGG_BASE}${path}`;
  const headers = getBggRequestHeaders();
  try {
    const res = await fetchWithTimeout(url, { headers });
    if (res.status === 202) {
      await new Promise((r) => setTimeout(r, 1500));
      const retry = await fetchWithTimeout(url, { headers });
      if (!retry.ok) return null;
      const xml = await retry.text();
      bggCache.set(key, { xml, expires: Date.now() + CACHE_TTL_MS });
      return xml;
    }
    if (res.status === 401 || res.status === 403) return null;
    if (!res.ok || res.status >= 500) return null;
    const xml = await res.text();
    bggCache.set(key, { xml, expires: Date.now() + CACHE_TTL_MS });
    return xml;
  } catch {
    return null;
  }
}

function decodeXmlText(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractAttr(xml: string, tag: string, attr: string): string[] {
  const re = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, "gi");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    out.push(decodeXmlText(m[1]));
  }
  return out;
}

function extractTagCdata(xml: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, "i");
  const m = re.exec(xml);
  if (m?.[1]) return m[1].trim();
  const simple = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i").exec(xml);
  return simple?.[1]?.trim();
}

type BggSearchHit = { id: string; title: string; year?: number };

function parseSearch(xml: string): BggSearchHit[] {
  const ids = extractAttr(xml, "item", "id");
  const names = extractAttr(xml, "name", "value");
  const years = extractAttr(xml, "yearpublished", "value");
  const hits: BggSearchHit[] = [];
  for (let i = 0; i < Math.min(ids.length, MAX_CANDIDATES); i++) {
    hits.push({
      id: ids[i],
      title: names[i] ?? `BGG #${ids[i]}`,
      year: years[i] ? parseInt(years[i], 10) : undefined,
    });
  }
  return hits;
}

async function fetchThing(id: string): Promise<CoverCandidate | null> {
  const xml = await fetchBggXml(`/thing?id=${id}&stats=0`);
  if (!xml) return null;

  const title =
    extractAttr(xml, "name", "value").find((_, i, arr) => {
      const types = extractAttr(xml, "name", "type");
      return types[i] === "primary" || arr.length === 1;
    }) ?? extractAttr(xml, "name", "value")[0];

  const yearStr = extractAttr(xml, "yearpublished", "value")[0];
  const image = validateCoverImageUrl(extractTagCdata(xml, "image"));
  const thumb = validateCoverImageUrl(extractTagCdata(xml, "thumbnail"));
  const description = extractTagCdata(xml, "description");

  if (!title && !image && !thumb) return null;

  return {
    source: "bgg",
    title,
    year: yearStr ? parseInt(yearStr, 10) : undefined,
    description: description?.slice(0, 2000),
    coverImageUrl: image ?? thumb ?? undefined,
    thumbnailUrl: thumb ?? image ?? undefined,
    sourceUrl: `https://boardgamegeek.com/boardgame/${id}`,
    externalId: id,
    confidence: image ? "medium" : "low",
    collectionTypeSuggestion: "BOARD_GAME",
    notes: "Propozycja z BoardGameGeek — wybierz poprawną okładkę.",
  };
}

/** Plan C — BGG po tytule (nie po EAN). */
export async function lookupBggProvider(titleHint: string): Promise<{
  candidates: CoverCandidate[];
  error?: string;
}> {
  const q = titleHint.trim();
  if (!q) return { candidates: [] };

  if (!isBggConfigured()) {
    return {
      candidates: [],
      error:
        "Brak BGG_TOKEN — zarejestruj aplikację na boardgamegeek.com/applications i dodaj token do .env.",
    };
  }

  const searchXml = await fetchBggXml(
    `/search?query=${encodeURIComponent(q)}&type=boardgame,boardgameexpansion,rpgitem`,
  );
  if (!searchXml) {
    const token = getBggToken();
    return {
      candidates: [],
      error: token
        ? "BGG nie odpowiada lub odrzucił token (401) — sprawdź BGG_TOKEN."
        : "BGG wymaga tokenu API — ustaw BGG_TOKEN w .env.",
    };
  }

  const hits = parseSearch(searchXml);
  if (hits.length === 0) return { candidates: [] };

  const candidates: CoverCandidate[] = [];
  for (const hit of hits) {
    const detail = await fetchThing(hit.id);
    if (detail) {
      candidates.push({
        ...detail,
        title: detail.title ?? hit.title,
        year: detail.year ?? hit.year,
      });
    } else {
      candidates.push({
        source: "bgg",
        title: hit.title,
        year: hit.year,
        externalId: hit.id,
        sourceUrl: `https://boardgamegeek.com/boardgame/${hit.id}`,
        confidence: "low",
        collectionTypeSuggestion: "BOARD_GAME",
        notes: "Brak podglądu okładki — otwórz BGG.",
      });
    }
  }

  return { candidates };
}
