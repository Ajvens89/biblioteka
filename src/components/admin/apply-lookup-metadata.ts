import type { GameType } from "@prisma/client";
import type { CoverCandidate } from "@/lib/services/ean-providers/types";

export type LookupMetadataSetters = {
  onCollectionTypeChange: (value: "BOARD_GAME" | "RPG") => void;
  setTitle: (v: string) => void;
  setDescription: (v: string) => void;
  setShortDescription: (v: string) => void;
  setCoverImageUrl: (v: string) => void;
  setYearPublished: (v: string) => void;
  setCoverSource: (v: string) => void;
  setCoverExternalId: (v: string) => void;
  setGameType: (v: GameType) => void;
  setMinPlayers: (v: number) => void;
  setMaxPlayers: (v: number) => void;
  setMinAge: (v: number) => void;
  setMinPlayTime: (v: number) => void;
  setMaxPlayTime: (v: number) => void;
  setPublisherId: (v: string) => void;
  matchPublisherId: (name?: string) => string;
};

/** Uzupełnia formularz danymi z katalogu / lookup EAN. */
export function applyLookupMetadata(candidate: CoverCandidate, setters: LookupMetadataSetters): void {
  if (candidate.title) setters.setTitle(candidate.title);
  if (candidate.description) setters.setDescription(candidate.description);
  if (candidate.shortDescription) setters.setShortDescription(candidate.shortDescription);
  else if (candidate.authors?.length) setters.setShortDescription(candidate.authors.join(", "));
  if (candidate.coverImageUrl) setters.setCoverImageUrl(candidate.coverImageUrl);
  if (candidate.year) setters.setYearPublished(String(candidate.year));
  setters.setCoverSource(candidate.source);
  setters.setCoverExternalId(candidate.externalId ?? "");

  if (candidate.collectionTypeSuggestion) {
    setters.onCollectionTypeChange(candidate.collectionTypeSuggestion);
  }
  if (candidate.gameTypeSuggestion) {
    setters.setGameType(candidate.gameTypeSuggestion);
  }
  if (candidate.minPlayers != null) setters.setMinPlayers(candidate.minPlayers);
  if (candidate.maxPlayers != null) setters.setMaxPlayers(candidate.maxPlayers);
  if (candidate.minAge != null) setters.setMinAge(candidate.minAge);
  if (candidate.minPlayTime != null) setters.setMinPlayTime(candidate.minPlayTime);
  if (candidate.maxPlayTime != null) setters.setMaxPlayTime(candidate.maxPlayTime);

  if (candidate.publisher) {
    const publisherId = setters.matchPublisherId(candidate.publisher);
    if (publisherId) setters.setPublisherId(publisherId);
  }
}
