"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import { toast } from "sonner";
import {
  GameSearchSuggestions,
  type GameSearchSuggestionsHandle,
} from "@/components/games/game-search-suggestions";
import { EanScannerLazy } from "@/components/barcode/ean-scanner-lazy";
import { SearchQueryShell } from "@/components/search/search-query-shell";
import { SUGGEST_MIN_QUERY_LENGTH } from "@/lib/games/suggest-games.types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScannerButton } from "@/components/ui/scanner-button";

const SUGGEST_DEBOUNCE_MS = 300;

export function CatalogSearch({
  defaultQ = "",
  defaultEan = "",
}: {
  defaultQ?: string;
  defaultEan?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(defaultQ || searchParams.get("q") || defaultEan || "");
  const [debouncedQ, setDebouncedQ] = useState(q);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [activeDescendant, setActiveDescendant] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const suggestListId = useId();
  const suggestRef = useRef<GameSearchSuggestionsHandle>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce dla podpowiedzi — wpisywanie pozostaje natychmiastowe, zapytanie nie.
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQ(q), SUGGEST_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [q]);

  const closeSuggestions = useCallback(() => setSuggestOpen(false), []);

  const submit = useCallback(
    (opts?: { ean?: string; query?: string }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (opts?.ean) {
        params.set("ean", opts.ean);
        params.delete("q");
      } else {
        const text = (opts?.query ?? q).trim();
        if (text) params.set("q", text);
        else params.delete("q");
        params.delete("ean");
      }
      params.delete("page");
      startTransition(() => {
        router.push(`/katalog?${params.toString()}`, { scroll: false });
      });
    },
    [q, router, searchParams],
  );

  const clear = () => {
    setQ("");
    setSuggestOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    params.delete("ean");
    params.delete("page");
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `/katalog?${qs}` : "/katalog", { scroll: false });
    });
    inputRef.current?.focus();
  };

  const onScan = (code: string) => {
    setQ(code);
    submit({ ean: code });
    toast.message(`Szukam gry po EAN ${code}`);
  };

  return (
    <SearchQueryShell>
      <div className="zf-catalog-search" data-testid="catalog-toolbar">
        <label htmlFor="catalog-search-input" className="sr-only">
          Szukaj w katalogu po tytule, autorze, wydawcy lub kodzie EAN
        </label>
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary"
              aria-hidden
            />
            <Input
              ref={inputRef}
              id="catalog-search-input"
              data-testid="catalog-search-input"
              className="zf-search-input h-12 rounded-xl pl-12 pr-11 text-base"
              placeholder="Szukaj gry — tytuł, autor, wydawca, EAN…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setSuggestOpen(e.target.value.trim().length >= SUGGEST_MIN_QUERY_LENGTH);
              }}
              onKeyDown={(e) => {
                if (suggestRef.current?.handleKeyDown(e)) return;
                if (e.key === "Enter") {
                  closeSuggestions();
                  submit();
                }
              }}
              onFocus={() => {
                if (q.trim().length >= SUGGEST_MIN_QUERY_LENGTH) setSuggestOpen(true);
              }}
              onBlur={() => window.setTimeout(closeSuggestions, 150)}
              aria-autocomplete="list"
              aria-controls={suggestListId}
              aria-expanded={suggestOpen}
              aria-haspopup="listbox"
              aria-activedescendant={activeDescendant}
              aria-busy={isPending}
            />
            {q && (
              <button
                type="button"
                onClick={clear}
                aria-label="Wyczyść wyszukiwanie"
                data-testid="catalog-search-clear"
                className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            )}
            <GameSearchSuggestions
              ref={suggestRef}
              query={debouncedQ}
              open={suggestOpen}
              onClose={closeSuggestions}
              onSelect={(title) => setQ(title)}
              listId={suggestListId}
              inputId="catalog-search-input"
              onActiveDescendantChange={setActiveDescendant}
              linkTarget="catalog"
              onSearchInCatalog={() => submit()}
            />
          </div>
          <div className="flex gap-2">
            <ScannerButton onClick={() => setScannerOpen(true)} className="h-12 flex-1 sm:flex-none" />
            <Button
              type="button"
              className="zf-btn-primary h-12 flex-1 rounded-xl px-6 sm:flex-none"
              onClick={() => submit()}
              loading={isPending}
            >
              <Search className="h-4 w-4" aria-hidden />
              Szukaj
            </Button>
          </div>
        </div>
        <EanScannerLazy open={scannerOpen} onOpenChange={setScannerOpen} onScan={onScan} />
      </div>
    </SearchQueryShell>
  );
}
