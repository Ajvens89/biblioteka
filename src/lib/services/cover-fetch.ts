import type { GameCollectionType } from "@prisma/client";
import { isIsbn13 } from "@/lib/services/ean";
import { isBggConfigured } from "@/lib/services/ean-providers/bgg-auth";
import { lookupBggProvider } from "@/lib/services/ean-providers/bgg-provider";
import {
  lookupUpcitemdbByEan,
  lookupUpcitemdbByTitle,
} from "@/lib/services/ean-providers/upcitemdb-provider";
import {
  isGoogleCseConfigured,
  lookupGoogleCseCoverImages,
} from "@/lib/services/ean-providers/google-cse-provider";
import { lookupGoogleBooksProvider } from "@/lib/services/ean-providers/google-books-provider";
import {
  probeImageUrl,
  resolveOpenLibraryCover,
  validateCoverImageUrl,
} from "@/lib/services/ean-providers/image-utils";
import type { CoverSource } from "@/lib/services/ean-providers/types";
import { isPublicCoverAvailable, normalizeProductBarcode } from "@/lib/services/import-products";

export type CoverFetchInput = {
  title: string;
  ean?: string | null;
  collectionType?: GameCollectionType;
};

export type CoverFetchResult = {
  coverImageUrl: string | null;
  coverImageSource: CoverSource | null;
  message?: string;
};

export { getBggToken, isBggConfigured } from "@/lib/services/ean-providers/bgg-auth";

async function firstWorkingUrl(urls: Array<string | null | undefined>): Promise<string | null> {
  for (const raw of urls) {
    const safe = validateCoverImageUrl(raw);
    if (!safe) continue;
    if (await probeImageUrl(safe)) return safe;
  }
  return null;
}

async function fromUpcitemdb(
  title: string,
  ean: string | null,
): Promise<CoverFetchResult | null> {
  if (ean) {
    const byEan = await lookupUpcitemdbByEan(ean);
    const eanCover = await firstWorkingUrl(byEan.map((c) => c.coverImageUrl ?? c.thumbnailUrl));
    if (eanCover) {
      return { coverImageUrl: eanCover, coverImageSource: "upcitemdb" };
    }
  }

  const byTitle = await lookupUpcitemdbByTitle(title);
  const titleCover = await firstWorkingUrl(byTitle.map((c) => c.coverImageUrl ?? c.thumbnailUrl));
  if (titleCover) {
    return { coverImageUrl: titleCover, coverImageSource: "upcitemdb" };
  }

  return null;
}

async function fromGoogleImages(
  title: string,
  ean: string | null,
): Promise<CoverFetchResult | null> {
  if (!isGoogleCseConfigured()) return null;

  const urls = await lookupGoogleCseCoverImages(title, ean);
  const cover = await firstWorkingUrl(urls);
  if (cover) {
    return { coverImageUrl: cover, coverImageSource: "google_images" };
  }
  return null;
}

async function fromBgg(title: string): Promise<CoverFetchResult | null> {
  if (!isBggConfigured()) return null;

  const bgg = await lookupBggProvider(title);
  if (bgg.error?.includes("401") || bgg.error?.toLowerCase().includes("unauthorized")) {
    return {
      coverImageUrl: null,
      coverImageSource: null,
      message: "BGG odrzucił token — sprawdź BGG_TOKEN w .env.",
    };
  }

  const bggCover = await firstWorkingUrl(
    bgg.candidates.map((c) => c.coverImageUrl ?? c.thumbnailUrl),
  );
  if (bggCover) {
    return { coverImageUrl: bggCover, coverImageSource: "bgg" };
  }

  if (bgg.error && bgg.candidates.length === 0) {
    return { coverImageUrl: null, coverImageSource: null, message: bgg.error };
  }

  return null;
}

/**
 * Pobiera okładkę z zewnętrznych źródeł (bez BGG, jeśli nie ma tokenu):
 * ISBN → Open Library, Google Books
 * EAN/tytuł → UPCitemdb (darmowe — limit 100/dzień)
 * tytuł → Google Custom Search Grafika (GOOGLE_CSE_API_KEY + GOOGLE_CSE_CX)
 * opcjonalnie BGG (BGG_TOKEN)
 */
export async function fetchCoverForGame(input: CoverFetchInput): Promise<CoverFetchResult> {
  const title = input.title?.trim();
  if (!title) {
    return { coverImageUrl: null, coverImageSource: null, message: "Brak tytułu gry." };
  }

  const ean = normalizeProductBarcode(input.ean);

  if (ean && isIsbn13(ean)) {
    const openLib = await resolveOpenLibraryCover(ean);
    if (openLib) {
      return { coverImageUrl: openLib, coverImageSource: "open_library" };
    }

    const google = await lookupGoogleBooksProvider(ean);
    const googleCover = await firstWorkingUrl(
      google.map((c) => c.coverImageUrl ?? c.thumbnailUrl),
    );
    if (googleCover) {
      return { coverImageUrl: googleCover, coverImageSource: "google_books" };
    }
  }

  const upc = await fromUpcitemdb(title, ean);
  if (upc?.coverImageUrl) return upc;

  const googleImg = await fromGoogleImages(title, ean);
  if (googleImg?.coverImageUrl) return googleImg;

  const bgg = await fromBgg(title);
  if (bgg?.coverImageUrl) return bgg;
  if (bgg?.message && !isBggConfigured()) {
    /* fall through to final message */
  } else if (bgg?.message) {
    return bgg;
  }

  return {
    coverImageUrl: null,
    coverImageSource: null,
    message: isBggConfigured() || isGoogleCseConfigured()
      ? `Nie znaleziono okładki dla: ${title}`
      : `Nie znaleziono okładki. Dodaj GOOGLE_CSE_* lub BGG_TOKEN w .env.`,
  };
}

export type CoverBackfillStats = {
  checked: number;
  updated: number;
  notFound: number;
  skipped: number;
  issues: string[];
};

const DEFAULT_BACKFILL_DELAY_MS = 700;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function formatCoverBackfillReport(stats: CoverBackfillStats, dryRun: boolean): string {
  const lines = [
    dryRun ? "=== DRY RUN — pobieranie okładek ===" : "=== Pobieranie okładek ===",
    `Sprawdzono: ${stats.checked}`,
    `Zaktualizowano: ${stats.updated}`,
    `Bez okładki: ${stats.notFound}`,
    `Pominięto (już OK): ${stats.skipped}`,
  ];
  lines.push(
    "",
    "Źródła: UPCitemdb, Google CSE (Grafika), Open Library, BGG.",
    isGoogleCseConfigured() ? "Google Grafika: skonfigurowane." : "Google: ustaw GOOGLE_CSE_API_KEY + GOOGLE_CSE_CX.",
    isBggConfigured() ? "BGG: skonfigurowane." : "BGG: opcjonalnie BGG_TOKEN.",
  );
  if (stats.issues.length > 0) {
    lines.push("", "Problemy:");
    for (const issue of stats.issues.slice(0, 10)) lines.push(`  • ${issue}`);
  }
  return lines.join("\n");
}

export async function backfillMissingCovers(
  games: Array<{
    id: string;
    title: string;
    coverImageUrl: string | null;
    ean: string | null;
    collectionType: GameCollectionType;
  }>,
  options?: {
    limit?: number;
    dryRun?: boolean;
    delayMs?: number;
    update?: (id: string, coverImageUrl: string, source: CoverSource) => Promise<void>;
    onProgress?: (current: number, total: number, title: string, ok: boolean) => void;
  },
): Promise<CoverBackfillStats> {
  const limit = options?.limit ?? 50;
  const dryRun = options?.dryRun ?? false;
  const delayMs = options?.delayMs ?? DEFAULT_BACKFILL_DELAY_MS;

  const targets = games.filter((g) => gameNeedsCoverFetch(g.coverImageUrl)).slice(0, limit);
  const stats: CoverBackfillStats = {
    checked: targets.length,
    updated: 0,
    notFound: 0,
    skipped: games.length - targets.length,
    issues: [],
  };

  for (let i = 0; i < targets.length; i++) {
    const game = targets[i];
    const result = await fetchCoverForGame({
      title: game.title,
      ean: game.ean,
      collectionType: game.collectionType,
    });

    if (!result.coverImageUrl || !result.coverImageSource) {
      stats.notFound += 1;
      if (stats.issues.length < 10) {
        stats.issues.push(`${game.title}: ${result.message ?? "brak okładki"}`);
      }
      if (options?.onProgress) {
        options.onProgress(i + 1, targets.length, game.title, false);
      }
      await sleep(delayMs);
      continue;
    }

    if (!dryRun && options?.update) {
      await options.update(game.id, result.coverImageUrl, result.coverImageSource);
    }
    stats.updated += 1;
    if (options?.onProgress) {
      options.onProgress(i + 1, targets.length, game.title, true);
    }
    await sleep(delayMs);
  }

  return stats;
}

export function gameNeedsCoverFetch(coverImageUrl: string | null | undefined): boolean {
  if (!coverImageUrl?.trim()) return true;
  const url = coverImageUrl.trim();
  if (/^https?:\/\//i.test(url)) return false;
  if (url.startsWith("/")) return !isPublicCoverAvailable(url);
  return true;
}
