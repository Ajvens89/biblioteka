import { fetchWithTimeout, validateCoverImageUrl } from "./image-utils";
import { isStrictTitleCoverMatch, scoreTitleMatch } from "./upcitemdb-provider";
import { normalizeEan, validateEanChecksum } from "@/lib/services/ean";

const ORIGIN = "https://aleplanszowki.pl";
const USER_AGENT = "BibliotekaZakatki/1.0 (+cover-lookup; aleplanszowki)";

export type AleplanszowkiHit = {
  ean: string;
  title: string;
  coverUrl: string;
  productUrl: string;
};

/** Wyszukiwanie PrestaShop: /search?s=EAN */
export function aleplanszowkiSearchUrl(query: string): string {
  return `${ORIGIN}/search?s=${encodeURIComponent(query.trim())}`;
}

/**
 * Link produktu często zawiera EAN: …/21690-adele-edycja-polska-5902259207450.html
 */
export function extractAleplanszowkiProductLinks(html: string, ean?: string): string[] {
  const links = new Set<string>();
  const re = /href=["'](https?:\/\/aleplanszowki\.pl\/[^"'#?]+\.html)["']/gi;
  for (const match of html.matchAll(re)) {
    const href = match[1];
    if (!href || href.includes("/content/") || href.includes("/blog/")) continue;
    if (ean && !href.includes(ean)) continue;
    links.add(href.split("#")[0]!);
  }
  return [...links];
}

export function extractAleplanszowkiCoverFromHtml(html: string): string | null {
  const og = html.match(/property=["']og:image["']\s+content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/content=["']([^"']+)["']\s+property=["']og:image["']/i)?.[1];
  if (og) {
    const fixed = og.replace(/^https?:\/\/aleplanszowki\.plhttps?:\/\//i, "https://");
    const safe = validateCoverImageUrl(fixed.startsWith("http") ? fixed : `${ORIGIN}${fixed}`);
    if (safe && !/\/img\/logo/i.test(safe)) return preferLargeDefault(safe);
  }

  const large = html.match(/(\/\d+-large_default\/[^"' ]+\.(?:jpe?g|png|webp))/i)?.[1];
  if (large) {
    return validateCoverImageUrl(`${ORIGIN}${large}`);
  }

  return null;
}

function preferLargeDefault(url: string): string {
  return url.replace(/\/(\d+)-(?:home|medium|small|thickbox)_default\//i, "/$1-large_default/");
}

export function extractAleplanszowkiTitleFromHtml(html: string): string | null {
  const og = html.match(/property=["']og:title["']\s+content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/content=["']([^"']+)["']\s+property=["']og:title["']/i)?.[1];
  if (og?.trim()) return decodeHtmlEntities(og.trim());

  const name = html.match(/itemprop=["']name["'][^>]*content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/content=["']([^"']+)["'][^>]*itemprop=["']name["']/i)?.[1];
  if (name?.trim()) return decodeHtmlEntities(name.trim());

  return null;
}

export function extractAleplanszowkiGtinFromHtml(html: string): string | null {
  const patterns = [
    /itemprop=["']gtin13["'][^>]*content=["'](\d{13})["']/i,
    /content=["'](\d{13})["'][^>]*itemprop=["']gtin13["']/i,
    /"gtin13"\s*:\s*"(\d{13})"/i,
    /"ean13"\s*:\s*"(\d{13})"/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match?.[1]) continue;
    try {
      const normalized = normalizeEan(match[1]);
      if (validateEanChecksum(normalized)) return normalized;
    } catch {
      // next
    }
  }
  return null;
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

async function fetchHtml(url: string): Promise<string | null> {
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

/**
 * EAN → tytuł + okładka z ALEplanszówki (sklep PL, dobrze indeksuje kody Galakta).
 */
export async function lookupAleplanszowkiByEan(ean: string): Promise<AleplanszowkiHit | null> {
  const digits = ean.replace(/\D/g, "");
  if (digits.length !== 13) return null;

  const searchHtml = await fetchHtml(aleplanszowkiSearchUrl(digits));
  if (!searchHtml) return null;

  const links = extractAleplanszowkiProductLinks(searchHtml, digits);
  const productUrl = links[0];
  if (!productUrl) return null;

  const productHtml = await fetchHtml(productUrl);
  if (!productHtml) return null;

  const pageEan = extractAleplanszowkiGtinFromHtml(productHtml);
  if (pageEan && pageEan !== digits) return null;
  if (!pageEan && !productUrl.includes(digits) && !productHtml.includes(digits)) return null;

  const coverUrl = extractAleplanszowkiCoverFromHtml(productHtml);
  const title = extractAleplanszowkiTitleFromHtml(productHtml);
  if (!coverUrl || !title) return null;

  return {
    ean: pageEan ?? digits,
    title,
    coverUrl,
    productUrl,
  };
}

/**
 * Tytuł → EAN + okładka (gdy hurt/Planszeo nie mają polskiego kodu).
 */
export async function lookupAleplanszowkiByTitle(title: string): Promise<AleplanszowkiHit | null> {
  const q = title.trim();
  if (!q) return null;

  const searchHtml = await fetchHtml(aleplanszowkiSearchUrl(q));
  if (!searchHtml) return null;

  const links = extractAleplanszowkiProductLinks(searchHtml);
  let best: AleplanszowkiHit | null = null;
  let bestScore = 0;

  for (const productUrl of links.slice(0, 5)) {
    const productHtml = await fetchHtml(productUrl);
    if (!productHtml) continue;

    const pageTitle = extractAleplanszowkiTitleFromHtml(productHtml);
    if (!pageTitle) continue;
    if (!isStrictTitleCoverMatch(q, pageTitle, 70)) continue;

    const score = scoreTitleMatch(q, pageTitle);
    if (score < bestScore) continue;

    const coverUrl = extractAleplanszowkiCoverFromHtml(productHtml);
    const pageEan = extractAleplanszowkiGtinFromHtml(productHtml);
    if (!coverUrl || !pageEan) continue;

    bestScore = score;
    best = {
      ean: pageEan,
      title: pageTitle,
      coverUrl,
      productUrl,
    };
  }

  return best;
}
