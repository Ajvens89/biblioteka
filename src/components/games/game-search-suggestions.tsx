"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { CATALOG_COLLECTION_LABELS } from "@/lib/constants";
import { SUGGEST_MIN_QUERY_LENGTH } from "@/lib/games/suggest-games.types";
import type { GameSuggestItem } from "@/lib/games/suggest-games.types";
import { suggestMatchLabel, useGameSuggestions } from "@/hooks/use-game-suggestions";
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
  /** Domyślnie szczegóły gry; catalog = wyniki w katalogu. */
  linkTarget?: "game" | "catalog";
  onSearchInCatalog?: () => void;
};

export const GameSearchSuggestions = forwardRef<GameSearchSuggestionsHandle, Props>(
  function GameSearchSuggestions(
    {
      query,
      open,
      onClose,
      onSelect,
      listId,
      inputId,
      onActiveDescendantChange,
      linkTarget = "game",
      onSearchInCatalog,
    },
    ref,
  ) {
    const router = useRouter();
    const [activeIndex, setActiveIndex] = useState(-1);

    const trimmed = query.trim();
    const panelOpen = open && trimmed.length >= SUGGEST_MIN_QUERY_LENGTH;
    const { data: items = [], isFetching, isError } = useGameSuggestions(query, panelOpen);

    useEffect(() => {
      setActiveIndex(-1);
    }, [query]);

    useEffect(() => {
      onActiveDescendantChange?.(
        activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined,
      );
    }, [activeIndex, listId, onActiveDescendantChange]);

    const navigateToItem = (item: GameSuggestItem) => {
      onSelect(item.title);
      onClose();
      if (linkTarget === "catalog") {
        router.push(`/katalog?q=${encodeURIComponent(item.title)}`);
      } else {
        router.push(`/gry/${item.slug}`);
      }
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
          navigateToItem(items[activeIndex]);
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

    const loading = isFetching && items.length === 0;
    const showEmpty = !loading && !isError && items.length === 0;
    const listboxVisible = loading || items.length > 0 || showEmpty || isError;

    if (!listboxVisible) return null;

    return (
      <ul
        id={listId}
        role="listbox"
        aria-label="Podpowiedzi wyszukiwania"
        aria-labelledby={inputId}
        aria-busy={isFetching}
        className="zf-search-suggestions absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border border-border bg-popover py-1 shadow-lg"
        data-testid="game-search-suggestions"
      >
        {loading ? (
          <li className="px-4 py-2 text-sm text-muted-foreground" role="presentation">
            Szukam…
          </li>
        ) : null}
        {isError ? (
          <li className="px-4 py-2 text-sm text-destructive" role="presentation">
            Błąd połączenia — spróbuj ponownie
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
          const matchLabel = suggestMatchLabel(item.matchKind);
          const href =
            linkTarget === "catalog"
              ? `/katalog?q=${encodeURIComponent(item.title)}`
              : `/gry/${item.slug}`;

          return (
            <li key={item.slug} id={optionId} role="option" aria-selected={active}>
              <Link
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm transition-[background-color,transform] duration-[var(--motion-fast)] hover:bg-muted",
                  active && "bg-muted translate-x-0.5",
                )}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => navigateToItem(item)}
              >
                {item.coverImageUrl ? (
                  <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded">
                    <Image
                      src={item.coverImageUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="36px"
                      loading="lazy"
                      unoptimized={/^https?:\/\//i.test(item.coverImageUrl)}
                    />
                  </span>
                ) : (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-muted text-xs">
                    ?
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-foreground">{item.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {CATALOG_COLLECTION_LABELS[item.collectionType]}
                    {matchLabel ? ` · ${matchLabel}` : ""}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
        {items.length > 0 && onSearchInCatalog ? (
          <li role="presentation" className="border-t border-border">
            <button
              type="button"
              className="w-full px-4 py-2.5 text-left text-sm font-medium text-primary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onClose();
                onSearchInCatalog();
              }}
              data-testid="suggest-search-catalog"
            >
              Szukaj „{trimmed}” w katalogu
            </button>
          </li>
        ) : null}
      </ul>
    );
  },
);
