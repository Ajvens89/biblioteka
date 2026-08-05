import { fetchWithTimeout, validateCoverImageUrl } from "./image-utils";
import { scoreTitleMatch, isStrictTitleCoverMatch } from "./upcitemdb-provider";
import { extractGtinFromHtml } from "./planszeo-ean";

const PLANSZEO_ORIGIN = "https://planszeo.pl";
const USER_AGENT = "BibliotekaZakatki/1.0 (+cover-backfill; planszeo-licensed)";

const GAME_SLUG_RE = /\/gry-planszowe\/([^/"']+)\/oferty/gi;
const OG_IMAGE_RE = /property=["']og:image["']\s+content=["']([^"']+)["']/i;
const HREF_ALT_RE =
  /href=["']\/gry-planszowe\/([^/"']+)\/oferty["'][\s\S]{0,900}?alt=["']([^"']+)["']/gi;

export type PlanszeoSearchHit = {
  slug: string;
  /** Tytuł z alt obrazka (często PL), fallback: slug ze spacjami. */
  displayTitle: string;
};

export function isPlanszeoCoversEnabled(): boolean {
  const flag = process.env.PLANSZEO_COVERS?.trim().toLowerCase();
  if (flag === "false" || flag === "0" || flag === "off") return false;
  return true;
}

function slugToTitle(slug: string): string {
  return slug.replace(/-/g, " ").trim();
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function extractPlanszeoSlugs(html: string): string[] {
  const slugs: string[] = [];
  for (const match of html.matchAll(GAME_SLUG_RE)) {
    const slug = match[1]?.trim();
    if (slug && !slugs.includes(slug)) slugs.push(slug);
  }
  return slugs;
}

/** Karty wyników: slug + polski tytuł z `alt` (np. heroes-of-tenefyr → Bohaterowie Tenefyru). */
export function extractPlanszeoSearchHits(html: string): PlanszeoSearchHit[] {
  const bySlug = new Map<string, PlanszeoSearchHit>();

  for (const match of html.matchAll(HREF_ALT_RE)) {
    const slug = match[1]?.trim();
    const alt = match[2] ? decodeHtmlEntities(match[2].trim()) : "";
    if (!slug) continue;
    if (!bySlug.has(slug)) {
      bySlug.set(slug, { slug, displayTitle: alt || slugToTitle(slug) });
    }
  }

  for (const slug of extractPlanszeoSlugs(html)) {
    if (!bySlug.has(slug)) {
      bySlug.set(slug, { slug, displayTitle: slugToTitle(slug) });
    }
  }

  return [...bySlug.values()];
}

function scorePlanszeoHit(queryTitle: string, hit: PlanszeoSearchHit): number {
  return Math.max(
    scoreTitleMatch(queryTitle, hit.displayTitle),
    scoreTitleMatch(queryTitle, slugToTitle(hit.slug)),
  );
}

function isPlanszeoHitMatch(queryTitle: string, hit: PlanszeoSearchHit, minScore = 70): boolean {
  return (
    isStrictTitleCoverMatch(queryTitle, hit.displayTitle, minScore) ||
    isStrictTitleCoverMatch(queryTitle, slugToTitle(hit.slug), minScore)
  );
}

export function pickBestPlanszeoSlug(title: string, slugs: string[]): string | null {
  const hits = slugs.map((slug) => ({ slug, displayTitle: slugToTitle(slug) }));
  return pickBestPlanszeoHit(title, hits)?.slug ?? null;
}

export function pickBestPlanszeoHit(
  title: string,
  hits: PlanszeoSearchHit[],
): PlanszeoSearchHit | null {
  if (!hits.length) return null;

  let best = hits[0]!;
  let bestScore = scorePlanszeoHit(title, best);
  for (const hit of hits.slice(1)) {
    const score = scorePlanszeoHit(title, hit);
    if (score > bestScore) {
      best = hit;
      bestScore = score;
    }
  }

  if (!isPlanszeoHitMatch(title, best, 70)) return null;
  return bestScore >= 55 ? best : null;
}

export async function fetchPlanszeoHtml(path: string): Promise<string | null> {
  const url = `${PLANSZEO_ORIGIN}${path}`;
  try {
    const res = await fetchWithTimeout(
      url,
      { headers: { Accept: "text/html", "User-Agent": USER_AGENT } },
      12_000,
    );
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function lookupPlanszeoCoverUrl(
  title: string,
  ean?: string | null,
): Promise<{
  coverUrl: string;
  slug: string;
  title?: string;
} | null> {
  const trimmed = title.trim();
  if (!trimmed) return null;

  const searchHtml = await fetchPlanszeoHtml(`/szukaj?q=${encodeURIComponent(trimmed)}`);
  if (!searchHtml) return null;

  const hit = pickBestPlanszeoHit(trimmed, extractPlanszeoSearchHits(searchHtml));
  if (!hit) return null;

  const gameHtml = await fetchPlanszeoHtml(`/gry-planszowe/${hit.slug}/oferty`);
  if (!gameHtml) return null;

  const pageEan = extractGtinFromHtml(gameHtml);
  const normalizedQueryEan = ean?.replace(/\D/g, "") ?? "";
  // EAN z Gemini bywa błędny — przy mocnym dopasowaniu tytułu nie odrzucamy okładki.
  if (
    normalizedQueryEan.length === 13 &&
    pageEan &&
    pageEan !== normalizedQueryEan &&
    !isPlanszeoHitMatch(trimmed, hit, 85)
  ) {
    return null;
  }

  const ogMatch = OG_IMAGE_RE.exec(gameHtml);
  const coverUrl = ogMatch?.[1] ? validateCoverImageUrl(ogMatch[1]) : null;
  if (!coverUrl) return null;

  return { coverUrl, slug: hit.slug, title: hit.displayTitle };
}
