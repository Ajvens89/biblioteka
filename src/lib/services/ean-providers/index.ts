import type { GameCollectionType, PrismaClient } from "@prisma/client";
import { EanError, isIsbn13, normalizeEan, validateEanChecksum } from "@/lib/services/ean";
import { lookupBggProvider } from "./bgg-provider";
import { isHurtCatalogEnabled } from "./hurt-catalog-config";
import { lookupGoogleBooksProvider } from "./google-books-provider";
import { lookupLocalProvider } from "./local-provider";
import { buildManualCandidates } from "./manual-provider";
import { lookupOpenLibraryProvider } from "./open-library-provider";
import {
  formatProviderAttempts,
  lookupExternalCoverCandidates,
  pickHighCoverCandidate,
  type CoverProviderAttempt,
} from "./external-cover-providers";
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
      shortDescription: c.shortDescription ?? prev.shortDescription,
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

function hasText(value?: string): boolean {
  return Boolean(value?.trim());
}

/** Prefer sources that typically carry catalog blurbs. */
const DESCRIPTION_SOURCE_PRIORITY: CoverCandidate["source"][] = [
  "hurt",
  "bgg",
  "google_books",
  "open_library",
  "upcitemdb",
  "planszeo",
  "aleplanszowki",
  "local",
];

function deriveShortDescription(description?: string): string | undefined {
  const trimmed = description?.trim();
  if (!trimmed) return undefined;
  const sentence = trimmed.split(/(?<=[.!?])\s+/)[0] ?? trimmed;
  if (sentence.length <= 280) return sentence;
  return `${sentence.slice(0, 277)}…`;
}

/**
 * Keep cover/title from `target`, fill missing description fields from the pool.
 * Used after a high-confidence cover hit (e.g. ALE/Rebel) so BGG/hurt can still supply opis.
 * Longer catalog blurbs (hurt/BGG) can replace a short shop teaser.
 */
export function enrichCandidateDescriptions(
  target: CoverCandidate,
  pool: CoverCandidate[],
): CoverCandidate {
  let description = target.description?.trim() || undefined;
  let shortDescription = target.shortDescription?.trim() || undefined;

  const ordered = [...pool].sort((a, b) => {
    const ai = DESCRIPTION_SOURCE_PRIORITY.indexOf(a.source);
    const bi = DESCRIPTION_SOURCE_PRIORITY.indexOf(b.source);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  for (const c of ordered) {
    if (c === target) continue;
    const incomingDesc = c.description?.trim();
    const incomingShort = c.shortDescription?.trim();
    if (incomingDesc) {
      if (!description || incomingDesc.length > description.length + 40) {
        description = incomingDesc;
      }
    }
    if (incomingShort && !shortDescription) {
      shortDescription = incomingShort;
    }
  }

  if (!shortDescription && description) {
    shortDescription = deriveShortDescription(description);
  }
  if (!description && shortDescription) {
    description = shortDescription;
  }

  if (description === target.description && shortDescription === target.shortDescription) {
    return target;
  }
  return { ...target, description, shortDescription };
}

function replaceCandidate(
  candidates: CoverCandidate[],
  previous: CoverCandidate,
  next: CoverCandidate,
): CoverCandidate[] {
  return candidates.map((c) => (c === previous ? next : c));
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
 * Plan A → hurt.csv → Rebel/Planszeo/UPC → ISBN (Google + Open Library) → BGG → ręcznie.
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
  const providerAttempts: CoverProviderAttempt[] = [];

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
      providerAttempts: [{ provider: "local", status: "hit" }],
    };
  }
  providerAttempts.push({ provider: "local", status: "miss" });

  const { lookupHurtProvider } = await import("./hurt-provider");
  const hurt = await lookupHurtProvider(normalized, options?.titleHint);
  if (hurt.candidate) {
    candidates = mergeCandidates(candidates, [hurt.candidate]);
    providerAttempts.push({ provider: "hurt", status: "hit" });
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
        providerAttempts,
      };
    }
  } else {
    providerAttempts.push({ provider: "hurt", status: "miss" });
  }

  const external = await lookupExternalCoverCandidates(normalized, options?.titleHint);
  providerAttempts.push(...external.attempts);
  if (external.candidates.length > 0) {
    candidates = mergeCandidates(candidates, external.candidates);
  }

  // Keep high-cover candidate for title/enrichment; do NOT early-return here —
  // BGG/ISBN may still supply a fuller description after ALE/Rebel cover hit.
  const earlyHighCover = pickHighCoverCandidate(candidates);

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

  const titleHint =
    options?.titleHint?.trim() ||
    earlyHighCover?.title?.trim() ||
    candidates.find((c) => hasText(c.title))?.title?.trim();
  // Prefer BGG when cover hit left a thin/missing description (e.g. ALE shop teaser).
  const needsDescriptionEnrichment =
    Boolean(earlyHighCover) ||
    !candidates.some((c) => hasText(c.description) && hasText(c.shortDescription));
  const needsBgg =
    needsDescriptionEnrichment ||
    !isHurtCatalogEnabled() ||
    !candidates.some((c) => c.source === "hurt") ||
    (!isIsbn13(normalized) &&
      (candidates.length === 0 || !candidates.some((c) => c.coverImageUrl)));

  if (titleHint && needsBgg && !candidates.some((c) => c.source === "hurt")) {
    const bgg = await lookupBggProvider(titleHint);
    if (bgg.candidates.length > 0) {
      candidates = mergeCandidates(candidates, bgg.candidates);
      providerAttempts.push({
        provider: "bgg",
        status: "hit",
        detail: `${bgg.candidates.length} kandydat(ów)`,
      });
    } else {
      providerAttempts.push({
        provider: "bgg",
        status: "miss",
        detail: bgg.error ?? undefined,
      });
    }
  } else if (!titleHint) {
    providerAttempts.push({
      provider: "bgg",
      status: "skipped",
      detail: "wymaga tytułu",
    });
  } else if (!needsBgg) {
    providerAttempts.push({
      provider: "bgg",
      status: "skipped",
      detail: "niepotrzebne",
    });
  }

  if (candidates.length === 0) {
    candidates = buildManualCandidates(normalized, collectionDefault, titleHint);
  }

  // After enrichment providers ran, merge opis into the high-confidence cover pick.
  const highCoverAfterEnrichment = pickHighCoverCandidate(candidates);
  if (highCoverAfterEnrichment) {
    const enriched = enrichCandidateDescriptions(highCoverAfterEnrichment, candidates);
    candidates = replaceCandidate(candidates, highCoverAfterEnrichment, enriched);
  }

  const selected = pickAutoSelectedCandidate(candidates);
  const hasBgg = candidates.some((c) => c.source === "bgg");
  const bggCount = candidates.filter((c) => c.source === "bgg").length;

  const attemptsNote = formatProviderAttempts(providerAttempts);

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
        providerAttempts,
      };
    }
    if (selected) {
      const enrichedSelected = enrichCandidateDescriptions(selected, candidates);
      candidates = replaceCandidate(candidates, selected, enrichedSelected);
      return {
        status: "found_external",
        normalizedEan: normalized,
        checksumValid,
        collectionTypeSuggestion: enrichedSelected.collectionTypeSuggestion ?? "RPG",
        selectedCandidate: enrichedSelected,
        candidates,
        message: enrichedSelected.notes ?? COVER_SOURCE_LABELS.google_books,
        providerAttempts,
      };
    }
    return {
      status: "candidates",
      normalizedEan: normalized,
      checksumValid,
      collectionTypeSuggestion: "RPG",
      candidates,
      message: "Znaleziono dane książki/RPG. Sprawdź tytuł i okładkę przed zapisem.",
      providerAttempts,
    };
  }

  // High cover (ALE/Rebel/…) wins even if BGG added description-only candidates.
  const preferredHigh = pickHighCoverCandidate(candidates);
  if (preferredHigh) {
    return {
      status: "found_external",
      normalizedEan: normalized,
      checksumValid,
      collectionTypeSuggestion:
        preferredHigh.collectionTypeSuggestion ?? collectionDefault,
      selectedCandidate: preferredHigh,
      candidates,
      message: preferredHigh.notes ?? COVER_SOURCE_LABELS[preferredHigh.source],
      providerAttempts,
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
      providerAttempts,
    };
  }

  // Kandydat z okładką (np. medium Planszeo) — nie kończ na „not_found”.
  const withCover = candidates.find((c) => c.coverImageUrl && c.source !== "manual");
  if (withCover) {
    const auto = pickAutoSelectedCandidate(candidates.filter((c) => c.coverImageUrl)) ?? withCover;
    const enrichedAuto = enrichCandidateDescriptions(auto, candidates);
    candidates = replaceCandidate(candidates, auto, enrichedAuto);
    return {
      status: candidates.filter((c) => c.coverImageUrl).length > 1 ? "candidates" : "found_external",
      normalizedEan: normalized,
      checksumValid,
      collectionTypeSuggestion: enrichedAuto.collectionTypeSuggestion ?? collectionDefault,
      selectedCandidate: enrichedAuto.confidence === "high" || candidates.filter((c) => c.coverImageUrl).length === 1
        ? enrichedAuto
        : undefined,
      candidates,
      message: enrichedAuto.notes ?? COVER_SOURCE_LABELS[enrichedAuto.source],
      providerAttempts,
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
        `Nie znaleziono danych po EAN. Wpisz tytuł (pole „Tytuł do wyszukania okładki”), a spróbujemy Planszeo/BGG.` +
        (attemptsNote ? ` Sprawdzono: ${attemptsNote}` : ""),
      needsTitleHintForBgg: true,
      providerAttempts,
    };
  }

  return {
    status: "not_found",
    normalizedEan: normalized,
    checksumValid,
    collectionTypeSuggestion: collectionDefault,
    candidates,
    selectedCandidate: selected,
    message:
      COVER_SOURCE_LABELS.manual +
      (attemptsNote ? ` Sprawdzono: ${attemptsNote}` : ""),
    needsTitleHintForBgg: !titleHint && collectionDefault === "BOARD_GAME",
    providerAttempts,
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
