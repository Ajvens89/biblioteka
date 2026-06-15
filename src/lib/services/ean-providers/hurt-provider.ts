import {
  findHurtProductByEan,
  findHurtProductByTitle,
  mapHurtProductToGameData,
} from "@/lib/hurt-catalog";
import { inferGameType } from "@/lib/services/game-type-infer";
import { validateCoverImageUrl } from "./image-utils";
import type { CoverCandidate } from "./types";

import { isHurtCatalogEnabled } from "./hurt-catalog-config";

export { isHurtCatalogEnabled };

/** Plan B — lokalny katalog hurt.csv (po sprawdzeniu bazy). */
export async function lookupHurtProvider(
  normalizedEan: string,
  titleHint?: string,
): Promise<{ candidate?: CoverCandidate }> {
  if (!isHurtCatalogEnabled()) return {};

  const { loadHurtCatalog } = await import("@/lib/hurt-catalog-loader");
  const catalog = await loadHurtCatalog();
  if (!catalog) return {};

  let product = findHurtProductByEan(normalizedEan, catalog);
  if (!product && titleHint?.trim()) {
    const byTitle = findHurtProductByTitle(titleHint, catalog);
    product = byTitle?.product ?? null;
  }
  if (!product) return {};

  const mapped = mapHurtProductToGameData(product);
  const cover = validateCoverImageUrl(mapped.imageUrl ?? mapped.thumbnailUrl);
  const categoryHint = `${product.category} ${product.label}`;

  return {
    candidate: {
      source: "hurt",
      title: mapped.title,
      description: mapped.description ?? mapped.shortDescription ?? undefined,
      shortDescription: mapped.shortDescription ?? undefined,
      publisher: mapped.publisherName ?? undefined,
      year: mapped.yearPublished ?? undefined,
      coverImageUrl: cover ?? undefined,
      thumbnailUrl: validateCoverImageUrl(mapped.thumbnailUrl) ?? cover ?? undefined,
      externalId: mapped.idProduct,
      confidence: "high",
      collectionTypeSuggestion: mapped.collectionType,
      gameTypeSuggestion: inferGameType(mapped.collectionType, categoryHint),
      minPlayers: mapped.minPlayers ?? undefined,
      maxPlayers: mapped.maxPlayers ?? undefined,
      minAge: mapped.minAge ?? undefined,
      minPlayTime: mapped.minPlayTime ?? undefined,
      maxPlayTime: mapped.maxPlayTime ?? undefined,
      notes: "Dane z lokalnego katalogu hurt.csv (bez cen i stanów magazynowych).",
    },
  };
}
