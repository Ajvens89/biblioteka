import { normalizeEan, validateEanChecksum } from "@/lib/services/ean";
import {
  extractPlanszeoSlugs,
  fetchPlanszeoHtml,
  pickBestPlanszeoSlug,
} from "./planszeo-provider";

const GTIN_PATTERNS = [
  /"gtin13"\s*:\s*"(\d{13})"/i,
  /"gtin"\s*:\s*"(\d{13})"/i,
  /itemprop=["']gtin13["'][^>]*content=["'](\d{13})["']/i,
  /content=["'](\d{13})["'][^>]*itemprop=["']gtin13["']/i,
  /EAN[:\s]*<[^>]*>(\d{13})</i,
  /GTIN[:\s]*(\d{13})/i,
];

/** Wyciąga pierwszy poprawny EAN-13 z HTML strony produktu. */
export function extractGtinFromHtml(html: string): string | null {
  const seen = new Set<string>();

  for (const pattern of GTIN_PATTERNS) {
    for (const match of html.matchAll(new RegExp(pattern.source, pattern.flags + "g"))) {
      const raw = match[1];
      if (!raw || seen.has(raw)) continue;
      seen.add(raw);
      try {
        const normalized = normalizeEan(raw);
        if (validateEanChecksum(normalized)) return normalized;
      } catch {
        // kolejny kandydat
      }
    }
  }

  return null;
}

export async function lookupPlanszeoEanByTitle(title: string): Promise<{
  ean: string;
  title?: string;
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

  const ean = extractGtinFromHtml(gameHtml);
  if (!ean) return null;

  const titleMatch = gameHtml.match(/<title>([^<]+)<\/title>/i);
  const pageTitle = titleMatch?.[1]?.split("|")[0]?.trim();

  return { ean, title: pageTitle || undefined, slug };
}
