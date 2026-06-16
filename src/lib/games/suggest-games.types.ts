export const SUGGEST_MIN_QUERY_LENGTH = 2;
export const SUGGEST_MAX_QUERY_LENGTH = 80;
export const SUGGEST_DEFAULT_LIMIT = 8;
export const SUGGEST_MAX_LIMIT = 12;

export type GameSuggestItem = {
  title: string;
  slug: string;
  coverImageUrl: string | null;
  collectionType: "BOARD_GAME" | "RPG";
  matchKind?: "title" | "ean" | "tag" | "publisher" | "designer";
};

export function normalizeSuggestQuery(raw: string): string {
  return raw.trim().slice(0, SUGGEST_MAX_QUERY_LENGTH);
}
