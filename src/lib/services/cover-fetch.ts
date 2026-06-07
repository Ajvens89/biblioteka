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
import { downloadCoverToPublic } from "@/lib/services/cover-download";
import {
  probeImageUrl,
  resolveOpenLibraryCover,
  validateCoverImageUrl,
} from "@/lib/services/ean-providers/image-utils";
import {
  isPlanszeoCoversEnabled,
  lookupPlanszeoCoverUrl,
} from "@/lib/services/ean-providers/planszeo-provider";
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

async function persistCoverOnServer(
  result: CoverFetchResult,
  fileBaseName: string,
): Promise<CoverFetchResult> {
  if (!result.coverImageUrl || !result.coverImageSource) return result;
  if (!/^https?:\/\//i.test(result.coverImageUrl)) return result;

  const local = await downloadCoverToPublic(result.coverImageUrl, fileBaseName);
  if (!local) return result;

  return { ...result, coverImageUrl: local };
}

async function fromPlanszeo(title: string): Promise<CoverFetchResult | null> {
  if (!isPlanszeoCoversEnabled()) return null;

  const hit = await lookupPlanszeoCoverUrl(title);
  if (!hit) return null;

  const local = await downloadCoverToPublic(hit.coverUrl, hit.slug);
  if (!local) {
    return {
      coverImageUrl: null,
      coverImageSource: null,
      message: "Planszeo: znaleziono okładkę, ale zapis na serwer się nie powiódł.",
    };
  }

  return { coverImageUrl: local, coverImageSource: "planszeo" };
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
 * Pobiera okładkę i zapisuje plik w public/covers/ (gdy źródło zwraca URL http/https).
 * Kolejność: Planszeo → ISBN (OL/Books) → UPCitemdb → Google CSE → BGG.
 */
export async function fetchCoverForGame(input: CoverFetchInput): Promise<CoverFetchResult> {
  const title = input.title?.trim();
  if (!title) {
    return { coverImageUrl: null, coverImageSource: null, message: "Brak tytułu gry." };
  }

  const ean = normalizeProductBarcode(input.ean);

  const planszeo = await fromPlanszeo(title);
  if (planszeo?.coverImageUrl) return planszeo;

  if (ean && isIsbn13(ean)) {
    const openLib = await resolveOpenLibraryCover(ean);
    if (openLib) {
      return persistCoverOnServer(
        { coverImageUrl: openLib, coverImageSource: "open_library" },
        title,
      );
    }

    const google = await lookupGoogleBooksProvider(ean);
    const googleCover = await firstWorkingUrl(
      google.map((c) => c.coverImageUrl ?? c.thumbnailUrl),
    );
    if (googleCover) {
      return persistCoverOnServer(
        { coverImageUrl: googleCover, coverImageSource: "google_books" },
        title,
      );
    }
  }

  const upc = await fromUpcitemdb(title, ean);
  if (upc?.coverImageUrl) return persistCoverOnServer(upc, title);

  const googleImg = await fromGoogleImages(title, ean);
  if (googleImg?.coverImageUrl) return persistCoverOnServer(googleImg, title);

  const bgg = await fromBgg(title);
  if (bgg?.coverImageUrl) return persistCoverOnServer(bgg, title);
  if (bgg?.message && !isBggConfigured()) {
    /* fall through to final message */
  } else if (bgg?.message) {
    return bgg;
  }

  return {
    coverImageUrl: null,
    coverImageSource: null,
    message: isPlanszeoCoversEnabled()
      ? `Nie znaleziono okładki dla: ${title}`
      : `Nie znaleziono okładki. Włącz Planszeo (domyślnie) lub dodaj BGG_TOKEN / GOOGLE_CSE_*.`,
  };
}

export type CoverBackfillStats = {
  checked: number;
  updated: number;
  notFound: number;
  skipped: number;
  issues: string[];
};

const DEFAULT_BACKFILL_DELAY_MS = 1500;

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
    "Źródła: Planszeo (zapis do public/covers/), UPCitemdb, Google CSE, Open Library, BGG.",
    isPlanszeoCoversEnabled()
      ? "Planszeo: włączone — okładki pobierane na serwer."
      : "Planszeo: wyłączone (PLANSZEO_COVERS=false).",
    isGoogleCseConfigured() ? "Google Grafika: skonfigurowane." : "Google CSE: opcjonalnie.",
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
    let result: CoverFetchResult;
    try {
      result = await fetchCoverForGame({
        title: game.title,
        ean: game.ean,
        collectionType: game.collectionType,
      });
    } catch (error) {
      stats.notFound += 1;
      const msg = error instanceof Error ? error.message : String(error);
      if (stats.issues.length < 10) {
        stats.issues.push(`${game.title}: błąd pobierania (${msg})`);
      }
      if (options?.onProgress) {
        options.onProgress(i + 1, targets.length, game.title, false);
      }
      await sleep(delayMs);
      continue;
    }

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
  if (url.startsWith("/")) return !isPublicCoverAvailable(url);
  if (/^https?:\/\//i.test(url)) return true;
  return true;
}
