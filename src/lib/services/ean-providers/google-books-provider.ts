import { fetchWithTimeout, pickGoogleBooksCover } from "./image-utils";
import type { CoverCandidate } from "./types";

/** Plan B — Google Books (ISBN 978/979), tylko serwer. */
export async function lookupGoogleBooksProvider(
  normalizedIsbn: string,
): Promise<CoverCandidate[]> {
  const url = new URL("https://www.googleapis.com/books/v1/volumes");
  url.searchParams.set("q", `isbn:${normalizedIsbn}`);
  url.searchParams.set("maxResults", "1");
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (apiKey) url.searchParams.set("key", apiKey);

  try {
    const res = await fetchWithTimeout(url.toString());
    if (!res.ok) return [];

    const json = (await res.json()) as {
      items?: Array<{
        id?: string;
        volumeInfo?: {
          title?: string;
          description?: string;
          authors?: string[];
          publisher?: string;
          publishedDate?: string;
          imageLinks?: {
            extraLarge?: string;
            large?: string;
            medium?: string;
            small?: string;
            thumbnail?: string;
            smallThumbnail?: string;
          };
        };
      }>;
    };

    const item = json.items?.[0];
    const info = item?.volumeInfo;
    if (!info?.title) return [];

    const year = info.publishedDate ? parseInt(info.publishedDate.slice(0, 4), 10) : undefined;
    const cover = pickGoogleBooksCover(info.imageLinks);

    return [
      {
        source: "google_books",
        title: info.title,
        description: info.description,
        authors: info.authors,
        publisher: info.publisher,
        year: Number.isFinite(year) ? year : undefined,
        coverImageUrl: cover,
        thumbnailUrl: cover,
        sourceUrl: item?.id
          ? `https://books.google.com/books?vid=${item.id}`
          : undefined,
        externalId: item?.id,
        confidence: cover ? "high" : "medium",
        collectionTypeSuggestion: "RPG",
        notes: "Dane pobrane z Google Books — sprawdź przed zapisem.",
      },
    ];
  } catch {
    return [];
  }
}
