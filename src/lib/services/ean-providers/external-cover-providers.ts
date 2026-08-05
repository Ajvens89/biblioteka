import { validateCoverImageUrl } from "./image-utils";
import { isPlanszeoCoversEnabled, lookupPlanszeoCoverUrl } from "./planszeo-provider";
import { isRebelImagesEnabled, lookupRebelCoverUrl } from "./rebel-images-provider";
import { lookupUpcitemdbByEan, lookupUpcitemdbByTitle } from "./upcitemdb-provider";
import { lookupAleplanszowkiByEan, lookupAleplanszowkiByTitle } from "./aleplanszowki-provider";
import {
  isGoogleCseConfigured,
  lookupGoogleCseCoverImages,
} from "./google-cse-provider";
import { COVER_SOURCE_LABELS, type CoverCandidate, type CoverSource } from "./types";

export type CoverProviderAttempt = {
  provider: CoverSource | "google_cse";
  status: "hit" | "miss" | "skipped" | "error";
  detail?: string;
};

function rebelHitToCandidate(
  hit: { coverUrl: string; productId: string },
  title?: string,
): CoverCandidate {
  const cover = validateCoverImageUrl(hit.coverUrl);
  return {
    source: "rebel",
    title,
    coverImageUrl: cover ?? undefined,
    thumbnailUrl: cover ?? undefined,
    externalId: hit.productId,
    confidence: "high",
    notes: COVER_SOURCE_LABELS.rebel,
  };
}

function aleHitToCandidate(hit: {
  coverUrl: string;
  title: string;
  ean: string;
  productUrl: string;
  description?: string;
}): CoverCandidate {
  const cover = validateCoverImageUrl(hit.coverUrl);
  const description = hit.description?.trim() || undefined;
  return {
    source: "aleplanszowki",
    title: hit.title,
    coverImageUrl: cover ?? undefined,
    thumbnailUrl: cover ?? undefined,
    externalId: hit.ean,
    sourceUrl: hit.productUrl,
    confidence: "high",
    notes: COVER_SOURCE_LABELS.aleplanszowki,
    collectionTypeSuggestion: "BOARD_GAME",
    description,
    shortDescription: description,
  };
}

/** Rebel → Planszeo → ALEplanszówki → UPCitemdb → Google CSE (jak cover-fetch, bez pobierania pliku). */
export async function lookupExternalCoverCandidates(
  normalizedEan: string,
  titleHint?: string,
): Promise<{ candidates: CoverCandidate[]; attempts: CoverProviderAttempt[] }> {
  const out: CoverCandidate[] = [];
  const attempts: CoverProviderAttempt[] = [];
  const title = titleHint?.trim() ?? "";

  if (isRebelImagesEnabled()) {
    try {
      const rebel = await lookupRebelCoverUrl(title || " ", normalizedEan);
      if (rebel?.coverUrl) {
        out.push(rebelHitToCandidate(rebel, title || undefined));
        attempts.push({ provider: "rebel", status: "hit" });
      } else {
        attempts.push({ provider: "rebel", status: "miss" });
      }
    } catch (e) {
      attempts.push({
        provider: "rebel",
        status: "error",
        detail: e instanceof Error ? e.message : "błąd",
      });
    }
  } else {
    attempts.push({ provider: "rebel", status: "skipped", detail: "brak images.csv" });
  }

  if (isPlanszeoCoversEnabled()) {
    if (title) {
      try {
        const planszeo = await lookupPlanszeoCoverUrl(title, normalizedEan);
        if (planszeo?.coverUrl) {
          const cover = validateCoverImageUrl(planszeo.coverUrl);
          out.push({
            source: "planszeo",
            title: planszeo.title || title,
            coverImageUrl: cover ?? undefined,
            thumbnailUrl: cover ?? undefined,
            externalId: planszeo.slug,
            confidence: "medium",
            notes: COVER_SOURCE_LABELS.planszeo,
          });
          attempts.push({ provider: "planszeo", status: "hit", detail: planszeo.slug });
        } else {
          attempts.push({
            provider: "planszeo",
            status: "miss",
            detail: "brak dopasowania tytułu / EAN",
          });
        }
      } catch (e) {
        attempts.push({
          provider: "planszeo",
          status: "error",
          detail: e instanceof Error ? e.message : "błąd",
        });
      }
    } else {
      attempts.push({
        provider: "planszeo",
        status: "skipped",
        detail: "wymaga tytułu (Planszeo nie szuka po EAN)",
      });
    }
  } else {
    attempts.push({ provider: "planszeo", status: "skipped", detail: "PLANSZEO_COVERS=off" });
  }

  try {
    const aleByEan = await lookupAleplanszowkiByEan(normalizedEan);
    if (aleByEan) {
      out.push(aleHitToCandidate(aleByEan));
      attempts.push({ provider: "aleplanszowki", status: "hit", detail: aleByEan.title });
    } else if (title) {
      const aleByTitle = await lookupAleplanszowkiByTitle(title);
      if (aleByTitle) {
        out.push(aleHitToCandidate(aleByTitle));
        attempts.push({
          provider: "aleplanszowki",
          status: "hit",
          detail: `po tytule → ${aleByTitle.ean}`,
        });
      } else {
        attempts.push({ provider: "aleplanszowki", status: "miss" });
      }
    } else {
      attempts.push({ provider: "aleplanszowki", status: "miss" });
    }
  } catch (e) {
    attempts.push({
      provider: "aleplanszowki",
      status: "error",
      detail: e instanceof Error ? e.message : "błąd",
    });
  }

  try {
    const upcByEan = await lookupUpcitemdbByEan(normalizedEan);
    if (upcByEan.length > 0) {
      out.push(...upcByEan);
      attempts.push({ provider: "upcitemdb", status: "hit", detail: `${upcByEan.length} wynik(ów)` });
    } else if (title) {
      const upcByTitle = await lookupUpcitemdbByTitle(title);
      if (upcByTitle.length > 0) {
        out.push(...upcByTitle);
        attempts.push({
          provider: "upcitemdb",
          status: "hit",
          detail: `po tytule: ${upcByTitle.length}`,
        });
      } else {
        attempts.push({ provider: "upcitemdb", status: "miss" });
      }
    } else {
      attempts.push({ provider: "upcitemdb", status: "miss" });
    }
  } catch (e) {
    attempts.push({
      provider: "upcitemdb",
      status: "error",
      detail: e instanceof Error ? e.message : "błąd",
    });
  }

  if (title && isGoogleCseConfigured()) {
    try {
      const urls = await lookupGoogleCseCoverImages(title, normalizedEan);
      if (urls.length > 0) {
        out.push({
          source: "google_images",
          title,
          coverImageUrl: urls[0],
          thumbnailUrl: urls[0],
          confidence: "medium",
          notes: COVER_SOURCE_LABELS.google_images,
        });
        attempts.push({ provider: "google_images", status: "hit", detail: `${urls.length} URL` });
      } else {
        attempts.push({
          provider: "google_images",
          status: "miss",
          detail: "CSE niedostępne lub brak wyników",
        });
      }
    } catch (e) {
      attempts.push({
        provider: "google_images",
        status: "error",
        detail: e instanceof Error ? e.message : "błąd",
      });
    }
  } else if (!isGoogleCseConfigured()) {
    attempts.push({ provider: "google_images", status: "skipped", detail: "brak GOOGLE_CSE_*" });
  }

  return { candidates: out, attempts };
}

/** Zwraca pierwszego kandydata high z okładką (do auto-wyboru w kreatorze). */
export function pickHighCoverCandidate(candidates: CoverCandidate[]): CoverCandidate | undefined {
  return candidates.find((c) => c.confidence === "high" && c.coverImageUrl);
}

export function formatProviderAttempts(attempts: CoverProviderAttempt[]): string {
  if (!attempts.length) return "";
  return attempts
    .map((a) => {
      const label =
        a.provider === "google_cse"
          ? "Google CSE"
          : a.provider === "aleplanszowki"
            ? "ALEplanszówki"
            : a.provider;
      const status =
        a.status === "hit"
          ? "OK"
          : a.status === "miss"
            ? "brak"
            : a.status === "skipped"
              ? "pominięto"
              : "błąd";
      return a.detail ? `${label}: ${status} (${a.detail})` : `${label}: ${status}`;
    })
    .join(" · ");
}
