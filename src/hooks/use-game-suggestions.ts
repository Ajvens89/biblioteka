"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchWithRetry } from "@/lib/http/fetch-with-retry";
import {
  SUGGEST_MIN_QUERY_LENGTH,
  type GameSuggestItem,
} from "@/lib/games/suggest-games.types";

async function fetchSuggestions(query: string): Promise<GameSuggestItem[]> {
  const res = await fetchWithRetry(
    `/api/games/suggest?q=${encodeURIComponent(query)}`,
    { retries: 2 },
  );
  if (!res.ok) {
    throw new Error(`Suggest API ${res.status}`);
  }
  const data = (await res.json()) as { items: GameSuggestItem[] };
  return data.items;
}

export function useGameSuggestions(query: string, enabled: boolean) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ["game-suggest", trimmed],
    queryFn: () => fetchSuggestions(trimmed),
    enabled: enabled && trimmed.length >= SUGGEST_MIN_QUERY_LENGTH,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
}

const MATCH_LABELS: Record<NonNullable<GameSuggestItem["matchKind"]>, string> = {
  title: "Tytuł",
  ean: "EAN",
  tag: "Tag",
  publisher: "Wydawca",
  designer: "Autor",
};

export function suggestMatchLabel(kind?: GameSuggestItem["matchKind"]): string | null {
  if (!kind || kind === "title") return null;
  return MATCH_LABELS[kind];
}
