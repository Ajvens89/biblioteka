import type { CoverConfidence } from "./types";

export type TitleEanSource = "local" | "hurt" | "planszeo" | "upcitemdb" | "gemini";

export type TitleToEanCandidate = {
  source: TitleEanSource;
  ean: string;
  title?: string;
  publisher?: string;
  confidence: CoverConfidence;
  checksumValid: boolean;
  notes?: string;
};

export type TitleToEanStatus = "found" | "candidates" | "not_found" | "exists";

export type TitleToEanResult = {
  status: TitleToEanStatus;
  queryTitle: string;
  candidates: TitleToEanCandidate[];
  selectedCandidate?: TitleToEanCandidate;
  message: string;
  game?: {
    id: string;
    title: string;
    slug: string;
    ean: string | null;
  };
};

export const TITLE_EAN_SOURCE_LABELS: Record<TitleEanSource, string> = {
  local: "Biblioteka lokalna",
  hurt: "hurt.csv",
  planszeo: "Planszeo",
  upcitemdb: "UPCitemdb",
  gemini: "Gemini (Google AI + wyszukiwanie)",
};
