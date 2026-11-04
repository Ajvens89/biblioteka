"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import { useCatalogSearchParams } from "./use-catalog-search-params";
import { GameSearchSuggestions, type GameSearchSuggestionsHandle } from "@/components/games/game-search-suggestions";
import { SearchQueryShell } from "@/components/search/search-query-shell";
import { SUGGEST_MIN_QUERY_LENGTH } from "@/lib/games/suggest-games.types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Props = {
  defaultQ?: string;
  defaultPublisher?: string;
  publishers: { slug: string; name: string }[];
};

export function CatalogSearch({ defaultQ = "", defaultPublisher = "", publishers }: Props) {
  const router = useRouter();
  const searchParams = useCatalogSearchParams();
  const [q, setQ] = useState(defaultQ);
  const [debouncedQ, setDebouncedQ] = useState(q);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [activeDescendant, setActiveDescendant] = useState<string>();
  const [pending, startTransition] = useTransition();
  const listId = useId();
  const suggestRef = useRef<GameSearchSuggestionsHandle>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQ(q), 300);
    return () => window.clearTimeout(timeout);
  }, [q]);

  const closeSuggestions = useCallback(() => setSuggestOpen(false), []);
  const submit = (publisher = defaultPublisher, query = q) => {
    setSuggestOpen(false);
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (publisher) params.set("publisher", publisher);
    const pageSize = searchParams.get("pageSize");
    if (pageSize) params.set("pageSize", pageSize);
    const collectionType = searchParams.get("collectionType");
    if (collectionType) params.set("collectionType", collectionType);
    const qs = params.toString();
    startTransition(() => router.push(qs ? `/katalog?${qs}` : "/katalog", { scroll: false }));
  };

  return (
    <SearchQueryShell>
      <div className="zf-catalog-search space-y-3" data-testid="catalog-toolbar">
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <div className="relative z-10 min-w-0 flex-1">
            <label htmlFor="catalog-search-input" className="sr-only">Tytuł gry lub wydawca</label>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" aria-hidden />
            <Input
              ref={inputRef}
              id="catalog-search-input"
              data-testid="catalog-search-input"
              className="zf-search-input h-12 rounded-xl pl-12 pr-11 text-base"
              placeholder="Wpisz tytuł gry lub wydawcę…"
              value={q}
              onChange={(event) => {
                setQ(event.target.value);
                setSuggestOpen(event.target.value.trim().length >= SUGGEST_MIN_QUERY_LENGTH);
              }}
              onKeyDown={(event) => {
                if (suggestRef.current?.handleKeyDown(event)) return;
                if (event.key === "Enter") submit();
              }}
              onFocus={() => q.trim().length >= SUGGEST_MIN_QUERY_LENGTH && setSuggestOpen(true)}
              onBlur={() => window.setTimeout(closeSuggestions, 150)}
              role="combobox"
              aria-autocomplete="list"
              aria-controls={listId}
              aria-expanded={suggestOpen}
              aria-haspopup="listbox"
              aria-activedescendant={activeDescendant}
              aria-busy={pending}
            />
            {q ? (
              <button type="button" className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted" aria-label="Wyczyść wyszukiwanie" data-testid="catalog-search-clear" onClick={() => {
                setQ("");
                submit(defaultPublisher, "");
                inputRef.current?.focus();
              }}><X className="h-4 w-4" aria-hidden /></button>
            ) : null}
            <GameSearchSuggestions ref={suggestRef} query={debouncedQ} open={suggestOpen} onClose={closeSuggestions} onSelect={setQ} listId={listId} inputId="catalog-search-input" onActiveDescendantChange={setActiveDescendant} linkTarget="game" onSearchInCatalog={() => submit()} />
          </div>
          <Button type="button" className="zf-btn-primary h-12 rounded-xl px-6" loading={pending} onClick={() => submit()}><Search className="h-4 w-4" aria-hidden />Szukaj</Button>
        </div>
        <div className="grid gap-2 sm:grid-cols-[auto_minmax(0,24rem)] sm:items-center">
          <label htmlFor="catalog-publisher" className="text-sm font-medium">Wydawca</label>
          <select id="catalog-publisher" data-testid="catalog-publisher" value={defaultPublisher} disabled={pending} className="h-11 min-w-0 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onChange={(event) => submit(event.target.value)}>
            <option value="">Wszyscy wydawcy</option>
            {defaultPublisher && !publishers.some((publisher) => publisher.slug === defaultPublisher) ? <option value={defaultPublisher}>{defaultPublisher}</option> : null}
            {publishers.map((publisher) => <option key={publisher.slug} value={publisher.slug}>{publisher.name}</option>)}
          </select>
        </div>
      </div>
    </SearchQueryShell>
  );
}
