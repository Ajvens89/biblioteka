import type { GameCollectionType } from "@prisma/client";
import type { CoverCandidate } from "./types";

/** Plan D — brak automatycznej okładki; propozycja ręczna. */
export function buildManualCandidates(
  normalizedEan: string,
  collectionType: GameCollectionType,
  titleHint?: string,
): CoverCandidate[] {
  const candidates: CoverCandidate[] = [
    {
      source: "manual",
      confidence: "low",
      notes:
        "Nie znaleziono okładki automatycznie. Możesz wkleić własny URL albo skorzystać z ręcznego wyszukiwania w Planszeo/BGG.",
      collectionTypeSuggestion: collectionType,
    },
  ];
  if (titleHint?.trim()) {
    candidates.push({
      source: "manual",
      title: titleHint.trim(),
      confidence: "low",
      notes: "Tytuł podany ręcznie — użyj wyszukiwania pomocniczego.",
      collectionTypeSuggestion: collectionType,
    });
  }
  return candidates;
}
