import type { GameCollectionType, PrismaClient } from "@prisma/client";
import { EanError, isIsbn13, normalizeEan, validateEanChecksum } from "@/lib/services/ean";
import { lookupBggProvider } from "./bgg-provider";
import { isHurtCatalogEnabled } from "./hurt-catalog-config";
import { lookupGoogleBooksProvider } from "./google-books-provider";
import { lookupLocalProvider } from "./local-provider";
import { buildManualCandidates } from "./manual-provider";
import { lookupOpenLibraryProvider } from "./open-library-provider";
import {
  COVER_SOURCE_LABELS,
  type CoverCandidate,
  type EanLookupOptions,
  type EanLookupResult,
} from "./types";

export type {
  CoverCandidate,
  CoverSource,
  CoverConfidence,
  EanLookupResult,
  EanLookupOptions,
  EanLookupStatus,
} from "./types";
export { COVER_SOURCE_LABELS } from "./types";
export { validateCoverImageUrl, planszeoSearchUrl, bggSearchUrl, googleImagesSearchUrl } from "./image-utils";

function mergeCandidates(existing: CoverCandidate[], incoming: CoverCandidate[]): CoverCandidate[] {
  const key = (c: CoverCandidate) =>
    `${c.source}:${c.externalId ?? c.title ?? c.coverImageUrl ?? ""}`;
  const map = new Map<string, CoverCandidate>();
  for (const c of [...existing, ...incoming]) {
    const k = key(c);
    const prev = map.get(k);
    if (!prev) {
      map.set(k, c);
      continue;
    }
    map.set(k, {
      ...prev,
      ...c,
      coverImageUrl: c.coverImageUrl ?? prev.coverImageUrl,
      thumbnailUrl: c.thumbnailUrl ?? prev.thumbnailUrl,
      description: c.description ?? prev.description,
      confidence:
        c.confidence === "high" || prev.confidence === "high"
          ? "high"
          : c.confidence === "medium" || prev.confidence === "medium"
            ? "medium"
            : "low",
    });
  }
  return [...map.values()];
}

/** Auto-wybór tylko przy jednym kandydacie high (nie BGG). */
export function pickAutoSelectedCandidate(candidates: CoverCandidate[]): CoverCandidate | undefined {
  if (candidates.length !== 1) return undefined;
  const only = candidates[0];
  if (only.source === "bgg") return undefined;
  if (only.confidence === "high") return only;
  return undefined;
}

function resolveCollectionDefault(
  normalized: string,
  options?: EanLookupOptions,
): GameCollectionType {
  if (options?.collectionType) return options.collectionType;
  return isIsbn13(normalized) ? "RPG" : "BOARD_GAME";
}

/**
 * Plan A → B → C → D: lokalna baza, ISBN (Google + Open Library), BGG po tytule, ręcznie.
 */
export async function lookupGameByEanWithFallback(
  prisma: PrismaClient,
  rawEan: string,
  options?: EanLookupOptions,
): Promise<EanLookupResult> {
  let normalized: string;
  try {
    normalized = normalizeEan(rawEan);
  } catch (e) {
    const message = e instanceof EanError ? e.message : "Nieprawidłowy kod EAN.";
    return {
      status: "invalid",
      normalizedEan: "",
      checksumValid: false,
      candidates: [],
      message,
    };
  }

  const checksumValid = validateEanChecksum(normalized);
  const collectionDefault = resolveCollectionDefault(normalized, options);
  let candidates: CoverCandidate[] = [];

  const local = await lookupLocalProvider(prisma, normalized);
  if (local.candidate && local.game) {
    return {
      status: "exists",
      normalizedEan: normalized,
      checksumValid,
      collectionTypeSuggestion: local.game.collectionType,
      selectedCandidate: local.candidate,
      candidates: [local.candidate],
      message:
        "Ta gra już jest w bibliotece. Możesz dodać kolejny egzemplarz.",
      game: {
        id: local.game.id,
        title: local.game.title,
        slug: local.game.slug,
        coverImageUrl: local.game.coverImageUrl,
        collectionType: local.game.collectionType,
        ean: local.game.ean,
      },
    };
  }

  const { lookupHurtProvider } = await import("./hurt-provider");
  const hurt = await lookupHurtProvider(normalized, options?.titleHint);
  if (hurt.candidate) {
    candidates = mergeCandidates(candidates, [hurt.candidate]);
    if (hurt.candidate.confidence === "high") {
      return {
        status: "found_external",
        normalizedEan: normalized,
        checksumValid,
        collectionTypeSuggestion:
          hurt.candidate.collectionTypeSuggestion ?? collectionDefault,
        selectedCandidate: hurt.candidate,
        candidates,
        message: hurt.candidate.notes ?? COVER_SOURCE_LABELS.hurt,
      };
    }
  }

  let googleHadCover = false;

  if (isIsbn13(normalized)) {
    const google = await lookupGoogleBooksProvider(normalized);
    if (google.length > 0) {
      googleHadCover = Boolean(google[0]?.coverImageUrl);
      candidates = mergeCandidates(candidates, google);
    }

    const openLib = await lookupOpenLibraryProvider(normalized, { googleHadCover });
    if (openLib.length > 0) {
      candidates = mergeCandidates(candidates, openLib);
    }
  }

  const titleHint = options?.titleHint?.trim();
  const needsBgg =
    !isHurtCatalogEnabled() ||
    !candidates.some((c) => c.source === "hurt") ||
    (!isIsbn13(normalized) &&
      (candidates.length === 0 || !candidates.some((c) => c.coverImageUrl)));

  if (titleHint && needsBgg && !candidates.some((c) => c.source === "hurt")) {
    const bgg = await lookupBggProvider(titleHint);
    if (bgg.candidates.length > 0) {
      candidates = mergeCandidates(candidates, bgg.candidates);
    }
  }

  if (candidates.length === 0) {
    candidates = buildManualCandidates(normalized, collectionDefault, titleHint);
  }

  const selected = pickAutoSelectedCandidate(candidates);
  const hasBgg = candidates.some((c) => c.source === "bgg");
  const bggCount = candidates.filter((c) => c.source === "bgg").length;

  if (isIsbn13(normalized) && candidates.some((c) => c.source === "google_books" || c.source === "open_library")) {
    if (hasBgg && bggCount > 1) {
      return {
        status: "candidates",
        normalizedEan: normalized,
        checksumValid,
        collectionTypeSuggestion: collectionDefault,
        candidates,
        message: "Znaleziono dane książki/RPG. Sprawdź tytuł i okładkę przed zapisem.",
        needsTitleHintForBgg: false,
      };
    }
    if (selected) {
      return {
        status: "found_external",
        normalizedEan: normalized,
        checksumValid,
        collectionTypeSuggestion: selected.collectionTypeSuggestion ?? "RPG",
        selectedCandidate: selected,
        candidates,
        message: selected.notes ?? COVER_SOURCE_LABELS.google_books,
      };
    }
    return {
      status: "candidates",
      normalizedEan: normalized,
      checksumValid,
      collectionTypeSuggestion: "RPG",
      candidates,
      message: "Znaleziono dane książki/RPG. Sprawdź tytuł i okładkę przed zapisem.",
    };
  }

  if (hasBgg && bggCount >= 1) {
    return {
      status: "candidates",
      normalizedEan: normalized,
      checksumValid,
      collectionTypeSuggestion: collectionDefault,
      candidates,
      message:
        bggCount > 1
          ? "Znaleziono kilka możliwych gier. Wybierz poprawną okładkę."
          : COVER_SOURCE_LABELS.bgg,
    };
  }

  if (!titleHint && needsBgg && !isIsbn13(normalized)) {
    return {
      status: "not_found",
      normalizedEan: normalized,
      checksumValid,
      collectionTypeSuggestion: collectionDefault,
      candidates: buildManualCandidates(normalized, collectionDefault),
      message:
        "Nie znaleziono danych po EAN. Wpisz tytuł, a spróbujemy znaleźć okładkę w BGG.",
      needsTitleHintForBgg: true,
    };
  }

  return {
    status: "not_found",
    normalizedEan: normalized,
    checksumValid,
    collectionTypeSuggestion: collectionDefault,
    candidates,
    selectedCandidate: selected,
    message: COVER_SOURCE_LABELS.manual,
    needsTitleHintForBgg: !titleHint && collectionDefault === "BOARD_GAME",
  };
}

/** Alias zgodny z wcześniejszym API. */
export async function lookupEan(
  prisma: PrismaClient,
  rawEan: string,
  options?: EanLookupOptions,
): Promise<EanLookupResult> {
  return lookupGameByEanWithFallback(prisma, rawEan, options);
}

export const lookupEanByProviders = lookupEan;
