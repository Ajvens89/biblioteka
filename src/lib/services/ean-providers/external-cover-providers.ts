import { validateCoverImageUrl } from "./image-utils";
import { isPlanszeoCoversEnabled, lookupPlanszeoCoverUrl } from "./planszeo-provider";
import { isRebelImagesEnabled, lookupRebelCoverUrl } from "./rebel-images-provider";
import { lookupUpcitemdbByEan, lookupUpcitemdbByTitle } from "./upcitemdb-provider";
import { COVER_SOURCE_LABELS, type CoverCandidate } from "./types";

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

/** Rebel → Planszeo → UPCitemdb (jak w cover-fetch, bez pobierania pliku). */
export async function lookupExternalCoverCandidates(
  normalizedEan: string,
  titleHint?: string,
): Promise<CoverCandidate[]> {
  const out: CoverCandidate[] = [];
  const title = titleHint?.trim() ?? "";

  if (isRebelImagesEnabled()) {
    const rebel = await lookupRebelCoverUrl(title || " ", normalizedEan);
    if (rebel?.coverUrl) {
      out.push(rebelHitToCandidate(rebel, title || undefined));
    }
  }

  if (isPlanszeoCoversEnabled()) {
    const planszeo = await lookupPlanszeoCoverUrl(title || " ", normalizedEan);
    if (planszeo?.coverUrl) {
      const cover = validateCoverImageUrl(planszeo.coverUrl);
      out.push({
        source: "planszeo",
        title: title || undefined,
        coverImageUrl: cover ?? undefined,
        thumbnailUrl: cover ?? undefined,
        externalId: planszeo.slug,
        confidence: "medium",
        notes: COVER_SOURCE_LABELS.planszeo,
      });
    }
  }

  const upcByEan = await lookupUpcitemdbByEan(normalizedEan);
  if (upcByEan.length > 0) {
    out.push(...upcByEan);
  } else if (title) {
    const upcByTitle = await lookupUpcitemdbByTitle(title);
    out.push(...upcByTitle);
  }

  return out;
}

/** Zwraca pierwszego kandydata high z okładką (do auto-wyboru w kreatorze). */
export function pickHighCoverCandidate(candidates: CoverCandidate[]): CoverCandidate | undefined {
  return candidates.find((c) => c.confidence === "high" && c.coverImageUrl);
}
