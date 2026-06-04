import {
  fetchWithTimeout,
  resolveOpenLibraryCover,
  validateCoverImageUrl,
} from "./image-utils";
import type { CoverCandidate } from "./types";

type OpenLibraryEntry = {
  title?: string;
  subtitle?: string;
  authors?: Array<{ name?: string }>;
  publishers?: Array<{ name?: string }>;
  publish_date?: string;
  covers?: { large?: string; medium?: string; small?: string };
};

/** Metadane książki z Open Library API. */
async function fetchOpenLibraryMetadata(
  normalizedIsbn: string,
): Promise<OpenLibraryEntry | null> {
  const bibkey = `ISBN:${normalizedIsbn}`;
  const url = new URL("https://openlibrary.org/api/books");
  url.searchParams.set("bibkeys", bibkey);
  url.searchParams.set("format", "json");
  url.searchParams.set("jscmd", "data");

  try {
    const res = await fetchWithTimeout(url.toString());
    if (!res.ok) return null;
    const json = (await res.json()) as Record<string, OpenLibraryEntry | undefined>;
    return json[bibkey] ?? null;
  } catch {
    return null;
  }
}

/** Plan B — Open Library (metadane + Covers API L/M/S). */
export async function lookupOpenLibraryProvider(
  normalizedIsbn: string,
  options?: { googleHadCover?: boolean },
): Promise<CoverCandidate[]> {
  const entry = await fetchOpenLibraryMetadata(normalizedIsbn);
  let cover =
    entry?.covers?.large ??
    entry?.covers?.medium ??
    entry?.covers?.small;
  cover = validateCoverImageUrl(cover) ?? undefined;

  if (!cover) {
    cover = await resolveOpenLibraryCover(normalizedIsbn);
  }

  if (!entry?.title && !cover) return [];

  const title = entry?.title
    ? entry.subtitle
      ? `${entry.title}: ${entry.subtitle}`
      : entry.title
    : undefined;
  const year = entry?.publish_date
    ? parseInt(entry.publish_date.slice(0, 4), 10)
    : undefined;

  const hasMeta = Boolean(title || entry?.authors?.length);
  if (!hasMeta && !cover) return [];

  return [
    {
      source: "open_library",
      title,
      authors: entry?.authors?.map((a) => a.name).filter(Boolean) as string[] | undefined,
      publisher: entry?.publishers?.[0]?.name,
      year: Number.isFinite(year) ? year : undefined,
      coverImageUrl: cover,
      thumbnailUrl: cover,
      sourceUrl: `https://openlibrary.org/isbn/${normalizedIsbn}`,
      externalId: normalizedIsbn,
      confidence: cover ? (options?.googleHadCover ? "medium" : "high") : "medium",
      collectionTypeSuggestion: "RPG",
      notes: cover
        ? "Okładka pobrana z Open Library — sprawdź przed zapisem."
        : "Metadane z Open Library — uzupełnij okładkę ręcznie.",
    },
  ];
}
