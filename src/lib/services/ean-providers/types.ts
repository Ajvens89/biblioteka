import type { GameCollectionType } from "@prisma/client";

export type CoverSource =
  | "local"
  | "google_books"
  | "google_images"
  | "open_library"
  | "upcitemdb"
  | "planszeo"
  | "rebel"
  | "hurt"
  | "bgg"
  | "manual";

export type CoverConfidence = "high" | "medium" | "low";

export type CoverCandidate = {
  source: CoverSource;
  title?: string;
  year?: number;
  publisher?: string;
  authors?: string[];
  description?: string;
  coverImageUrl?: string;
  thumbnailUrl?: string;
  sourceUrl?: string;
  externalId?: string;
  confidence: CoverConfidence;
  notes?: string;
  collectionTypeSuggestion?: GameCollectionType;
};

export type EanLookupStatus =
  | "exists"
  | "found_external"
  | "candidates"
  | "not_found"
  | "invalid";

export type EanLookupOptions = {
  titleHint?: string;
  collectionType?: GameCollectionType;
};

export type EanLookupResult = {
  status: EanLookupStatus;
  normalizedEan: string;
  checksumValid: boolean;
  collectionTypeSuggestion?: GameCollectionType;
  selectedCandidate?: CoverCandidate;
  candidates: CoverCandidate[];
  message: string;
  /** Gra z Planu A (status exists). */
  game?: {
    id: string;
    title: string;
    slug: string;
    coverImageUrl: string | null;
    collectionType: GameCollectionType;
    ean: string | null;
  };
  /** Czy potrzebny tytuł do Planu C (BGG). */
  needsTitleHintForBgg?: boolean;
};

export const COVER_SOURCE_LABELS: Record<CoverSource, string> = {
  local: "Okładka z biblioteki lokalnej.",
  google_books: "Dane pobrane z Google Books — sprawdź przed zapisem.",
  google_images: "Okładka z Google (Custom Search — Grafika) — sprawdź przed zapisem.",
  open_library: "Okładka pobrana z Open Library — sprawdź przed zapisem.",
  upcitemdb: "Okładka z katalogu produktów (UPCitemdb) — sprawdź przed zapisem.",
  planszeo: "Okładka pobrana z Planszeo i zapisana lokalnie na serwerze.",
  rebel: "Okładka z licencjonowanego katalogu Rebel (images.csv) — zapisana na serwerze.",
  hurt: "Dane i okładka z lokalnego katalogu hurt.csv.",
  bgg: "Propozycja z BoardGameGeek — wybierz poprawną okładkę.",
  manual:
    "Nie znaleziono okładki automatycznie. Możesz wkleić własny URL albo skorzystać z ręcznego wyszukiwania w Planszeo/BGG.",
};

/** @deprecated Stary format providera */
export type EanProviderSource = CoverSource;
export type EanProviderConfidence = CoverConfidence;
export type EanProviderData = {
  title?: string;
  description?: string;
  authors?: string[];
  publisher?: string;
  publishedYear?: number;
  coverImageUrl?: string;
  typeSuggestion?: GameCollectionType;
};
export type EanProviderResult = {
  source: CoverSource;
  found: boolean;
  confidence: CoverConfidence;
  data?: EanProviderData;
};
export const EAN_SOURCE_UI_LABELS = COVER_SOURCE_LABELS;
