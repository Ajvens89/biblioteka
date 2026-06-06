import { fetchWithTimeout, validateCoverImageUrl } from "./image-utils";

const CSE_ENDPOINT = "https://www.googleapis.com/customsearch/v1";

export function isGoogleCseConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CSE_API_KEY?.trim() && process.env.GOOGLE_CSE_CX?.trim(),
  );
}

let cseHealth: boolean | null = null;

/** Jednorazowy test API — cache na czas procesu (np. backfill). */
export async function isGoogleCseHealthy(): Promise<boolean> {
  if (!isGoogleCseConfigured()) return false;
  if (cseHealth !== null) return cseHealth;

  const apiKey = process.env.GOOGLE_CSE_API_KEY!.trim();
  const cx = process.env.GOOGLE_CSE_CX!.trim();
  const url = new URL(CSE_ENDPOINT);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("cx", cx);
  url.searchParams.set("q", "test");
  url.searchParams.set("searchType", "image");
  url.searchParams.set("num", "1");

  try {
    const res = await fetchWithTimeout(url.toString(), {}, 10_000);
    cseHealth = res.ok;
    return res.ok;
  } catch {
    cseHealth = false;
    return false;
  }
}

/** Zapytanie pod polskie gry planszowe — okładka pudełka. */
export function buildGoogleCseCoverQuery(title: string, ean?: string | null): string {
  const t = title.trim();
  const parts = [`"${t}"`, "gra planszowa", "okładka", "box"];
  if (ean?.trim()) parts.push(ean.trim());
  return parts.join(" ");
}

type CseImageItem = {
  link?: string;
  image?: {
    thumbnailLink?: string;
    width?: number;
    height?: number;
  };
};

/**
 * Oficjalne Google Custom Search API (Programmable Search Engine) — wyszukiwanie obrazów.
 * Nie jest to scraping google.com/images. Wymaga GOOGLE_CSE_API_KEY + GOOGLE_CSE_CX.
 * Limit darmowy: ~100 zapytań/dzień.
 */
export async function lookupGoogleCseCoverImages(
  title: string,
  ean?: string | null,
): Promise<string[]> {
  const apiKey = process.env.GOOGLE_CSE_API_KEY?.trim();
  const cx = process.env.GOOGLE_CSE_CX?.trim();
  if (!apiKey || !cx) return [];
  if (!(await isGoogleCseHealthy())) return [];

  const url = new URL(CSE_ENDPOINT);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("cx", cx);
  url.searchParams.set("q", buildGoogleCseCoverQuery(title, ean));
  url.searchParams.set("searchType", "image");
  url.searchParams.set("num", "5");
  url.searchParams.set("safe", "active");
  url.searchParams.set("imgSize", "large");
  url.searchParams.set("imgType", "photo");

  try {
    const res = await fetchWithTimeout(url.toString(), {}, 12_000);
    if (!res.ok) return [];

    const json = (await res.json()) as { items?: CseImageItem[] };
    const urls: string[] = [];

    for (const item of json.items ?? []) {
      const w = item.image?.width ?? 0;
      const h = item.image?.height ?? 0;
      if (w > 0 && h > 0 && (w < 120 || h < 120)) continue;

      const candidates = [item.link, item.image?.thumbnailLink];
      for (const raw of candidates) {
        const safe = validateCoverImageUrl(raw);
        if (safe && !urls.includes(safe)) urls.push(safe);
      }
    }

    return urls;
  } catch {
    return [];
  }
}
