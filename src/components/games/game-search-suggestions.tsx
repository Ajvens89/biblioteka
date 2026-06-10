"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CATALOG_COLLECTION_LABELS } from "@/lib/constants";
import type { GameSuggestItem } from "@/lib/games/suggest-games";

type Props = {
  query: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (title: string) => void;
  listId: string;
};

export function GameSearchSuggestions({
  query,
  open,
  onOpenChange,
  onSelect,
  listId,
}: Props) {
  const [items, setItems] = useState<GameSuggestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setItems([]);
      onOpenChange(false);
      return;
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);

      try {
        const res = await fetch(
          `/api/games/suggest?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );
        if (!res.ok) return;
        const data = (await res.json()) as { items: GameSuggestItem[] };
        setItems(data.items);
        onOpenChange(data.items.length > 0);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setItems([]);
          onOpenChange(false);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [query, onOpenChange]);

  if (!open || items.length === 0) return null;

  return (
    <ul
      id={listId}
      role="listbox"
      className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-border bg-popover py-1 shadow-lg"
      data-testid="game-search-suggestions"
    >
      {loading ? (
        <li className="px-4 py-2 text-sm text-muted-foreground">Szukam…</li>
      ) : null}
      {items.map((item) => (
        <li key={item.slug} role="option">
          <Link
            href={`/gry/${item.slug}`}
            className="flex items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-muted"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onSelect(item.title);
              onOpenChange(false);
            }}
          >
            {item.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.coverImageUrl}
                alt=""
                className="h-9 w-9 shrink-0 rounded object-cover"
              />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-muted text-xs">
                ?
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-foreground">{item.title}</span>
              <span className="text-xs text-muted-foreground">
                {CATALOG_COLLECTION_LABELS[item.collectionType]}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
