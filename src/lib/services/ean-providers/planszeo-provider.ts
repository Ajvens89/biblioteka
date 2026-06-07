import { fetchWithTimeout, validateCoverImageUrl } from "./image-utils";
import { scoreTitleMatch, isStrictTitleCoverMatch } from "./upcitemdb-provider";
import { extractGtinFromHtml } from "./planszeo-ean";

const PLANSZEO_ORIGIN = "https://planszeo.pl";
const USER_AGENT = "BibliotekaZakatki/1.0 (+cover-backfill; planszeo-licensed)";

const GAME_SLUG_RE = /\/gry-planszowe\/([^/"']+)\/oferty/gi;
const OG_IMAGE_RE = /property=["']og:image["']\s+content=["']([^"']+)["']/i;

export function isPlanszeoCoversEnabled(): boolean {
  const flag = process.env.PLANSZEO_COVERS?.trim().toLowerCase();
  if (flag === "false" || flag === "0" || flag === "off") return false;
  return true;
}

function slugToTitle(slug: string): string {
  return slug.replace(/-/g, " ").trim();
}

export function extractPlanszeoSlugs(html: string): string[] {
  const slugs: string[] = [];
  for (const match of html.matchAll(GAME_SLUG_RE)) {
    const slug = match[1]?.trim();
    if (slug && !slugs.includes(slug)) slugs.push(slug);
  }
  return slugs;
}

export function pickBestPlanszeoSlug(title: string, slugs: string[]): string | null {
  if (!slugs.length) return null;
  let best = slugs[0];
  let bestScore = scoreTitleMatch(title, slugToTitle(best));
  for (const slug of slugs.slice(1)) {
    const score = scoreTitleMatch(title, slugToTitle(slug));
    if (score > bestScore) {
      best = slug;
      bestScore = score;
    }
  }
  const candidateTitle = slugToTitle(best);
  if (!isStrictTitleCoverMatch(title, candidateTitle, 70)) return null;
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
} | null> {
  const trimmed = title.trim();
  if (!trimmed) return null;

  const searchHtml = await fetchPlanszeoHtml(`/szukaj?q=${encodeURIComponent(trimmed)}`);
  if (!searchHtml) return null;

  const slug = pickBestPlanszeoSlug(trimmed, extractPlanszeoSlugs(searchHtml));
  if (!slug) return null;

  const gameHtml = await fetchPlanszeoHtml(`/gry-planszowe/${slug}/oferty`);
  if (!gameHtml) return null;

  const pageEan = extractGtinFromHtml(gameHtml);
  const normalizedQueryEan = ean?.replace(/\D/g, "") ?? "";
  if (normalizedQueryEan.length === 13 && pageEan && pageEan !== normalizedQueryEan) {
    return null;
  }

  const ogMatch = OG_IMAGE_RE.exec(gameHtml);
  const coverUrl = ogMatch?.[1] ? validateCoverImageUrl(ogMatch[1]) : null;
  if (!coverUrl) return null;

  return { coverUrl, slug };
}
