"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CATALOG_COLLECTION_LABELS } from "@/lib/constants";
import { SUGGEST_MIN_QUERY_LENGTH } from "@/lib/games/suggest-games";
import type { GameSuggestItem } from "@/lib/games/suggest-games";
import { cn } from "@/lib/utils";

export type GameSearchSuggestionsHandle = {
  handleKeyDown: (e: React.KeyboardEvent) => boolean;
};

type Props = {
  query: string;
  open: boolean;
  onClose: () => void;
  onSelect: (title: string) => void;
  listId: string;
  inputId: string;
  onActiveDescendantChange?: (optionId: string | undefined) => void;
};

export const GameSearchSuggestions = forwardRef<GameSearchSuggestionsHandle, Props>(
  function GameSearchSuggestions(
    { query, open, onClose, onSelect, listId, inputId, onActiveDescendantChange },
    ref,
  ) {
    const router = useRouter();
    const [items, setItems] = useState<GameSuggestItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const abortRef = useRef<AbortController | null>(null);
    const requestSeqRef = useRef(0);

    const trimmed = query.trim();
    const panelOpen = open && trimmed.length >= SUGGEST_MIN_QUERY_LENGTH;

    useEffect(() => {
      setActiveIndex(-1);
    }, [query]);

    useEffect(() => {
      onActiveDescendantChange?.(
        activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined,
      );
    }, [activeIndex, listId, onActiveDescendantChange]);

    useEffect(() => {
      if (trimmed.length < SUGGEST_MIN_QUERY_LENGTH) {
        setItems([]);
        setLoading(false);
        return;
      }

      const timer = setTimeout(async () => {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        const seq = ++requestSeqRef.current;
        setLoading(true);

        try {
          const res = await fetch(
            `/api/games/suggest?q=${encodeURIComponent(trimmed)}`,
            { signal: controller.signal },
          );
          if (seq !== requestSeqRef.current) return;
          if (!res.ok) {
            setItems([]);
            return;
          }
          const data = (await res.json()) as { items: GameSuggestItem[] };
          if (seq !== requestSeqRef.current) return;
          setItems(data.items);
        } catch (err) {
          if ((err as Error).name === "AbortError") return;
          if (seq !== requestSeqRef.current) return;
          setItems([]);
        } finally {
          if (seq === requestSeqRef.current) setLoading(false);
        }
      }, 250);

      return () => {
        clearTimeout(timer);
        abortRef.current?.abort();
      };
    }, [trimmed]);

    const activateItem = (item: GameSuggestItem) => {
      onSelect(item.title);
      onClose();
      router.push(`/gry/${item.slug}`);
    };

    useImperativeHandle(ref, () => ({
      handleKeyDown(e: React.KeyboardEvent) {
        if (!panelOpen) return false;

        if (e.key === "ArrowDown") {
          e.preventDefault();
          if (items.length === 0) return true;
          setActiveIndex((i) => (i + 1) % items.length);
          return true;
        }

        if (e.key === "ArrowUp") {
          e.preventDefault();
          if (items.length === 0) return true;
          setActiveIndex((i) => (i <= 0 ? items.length - 1 : i - 1));
          return true;
        }

        if (e.key === "Enter" && activeIndex >= 0 && items[activeIndex]) {
          e.preventDefault();
          activateItem(items[activeIndex]);
          return true;
        }

        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
          return true;
        }

        return false;
      },
    }));

    if (!panelOpen) return null;

    const showEmpty = !loading && items.length === 0;
    const listboxVisible = loading || items.length > 0 || showEmpty;

    if (!listboxVisible) return null;

    return (
      <ul
        id={listId}
        role="listbox"
        aria-label="Podpowiedzi wyszukiwania"
        aria-labelledby={inputId}
        aria-busy={loading}
        className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-border bg-popover py-1 shadow-lg"
        data-testid="game-search-suggestions"
      >
        {loading && items.length === 0 ? (
          <li className="px-4 py-2 text-sm text-muted-foreground" role="presentation">
            Szukam…
          </li>
        ) : null}
        {showEmpty ? (
          <li className="px-4 py-2 text-sm text-muted-foreground" role="presentation">
            Brak podpowiedzi
          </li>
        ) : null}
        {items.map((item, index) => {
          const active = index === activeIndex;
          const optionId = `${listId}-option-${index}`;
          return (
            <li
              key={item.slug}
              id={optionId}
              role="option"
              aria-selected={active}
            >
              <Link
                href={`/gry/${item.slug}`}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-muted",
                  active && "bg-muted",
                )}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => activateItem(item)}
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
          );
        })}
      </ul>
    );
  },
);
