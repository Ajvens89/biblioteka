"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { GameSearchSuggestions, type GameSearchSuggestionsHandle } from "@/components/games/game-search-suggestions";
import { EanScannerLazy } from "@/components/barcode/ean-scanner-lazy";
import { SearchQueryShell } from "@/components/search/search-query-shell";
import { SUGGEST_MIN_QUERY_LENGTH } from "@/lib/games/suggest-games.types";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScannerButton } from "@/components/ui/scanner-button";
import { cn } from "@/lib/utils";

type Props = {
  variant?: "hero" | "panel";
};

export function HomeHeroSearch({ variant = "panel" }: Props) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [activeDescendant, setActiveDescendant] = useState<string>();
  const suggestListId = useId();
  const suggestRef = useRef<GameSearchSuggestionsHandle>(null);
  const isHero = variant === "hero";

  const search = (ean?: string) => {
    const params = new URLSearchParams();
    if (ean) params.set("ean", ean);
    else if (q.trim()) params.set("q", q.trim());
    const qs = params.toString();
    router.push(qs ? `/katalog?${qs}` : "/katalog");
  };

  return (
    <SearchQueryShell>
      <div className="w-full" data-testid="home-hero-search">
        <label htmlFor="home-search" className="sr-only">
          Szukaj gry w katalogu
        </label>
        <div className={cn("flex flex-col gap-3 lg:flex-row lg:items-stretch", isHero && "zf-hero-search rounded-lg p-1")}>
          <div className="relative min-w-0 flex-1">
            <Search
              className={cn(
                "absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2",
                isHero ? "text-muted-foreground" : "text-primary",
              )}
              aria-hidden
            />
            <Input
              id="home-search"
              data-testid="home-search-input"
              className={cn(
                "zf-search-input h-12 pl-12 pr-4 text-base",
                isHero ? "rounded-lg border-0" : "h-14 rounded-lg border-2 border-border/80 bg-background shadow-sm",
              )}
              placeholder="Tytuł, autor, wydawca lub EAN z pudełka…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setSuggestOpen(e.target.value.trim().length >= SUGGEST_MIN_QUERY_LENGTH);
              }}
              onKeyDown={(e) => {
                if (suggestRef.current?.handleKeyDown(e)) return;
                if (e.key === "Enter") {
                  setSuggestOpen(false);
                  search();
                }
              }}
              onFocus={() => {
                if (q.trim().length >= SUGGEST_MIN_QUERY_LENGTH) setSuggestOpen(true);
              }}
              onBlur={() => {
                window.setTimeout(() => setSuggestOpen(false), 150);
              }}
              aria-autocomplete="list"
              aria-controls={suggestListId}
              aria-expanded={suggestOpen}
              aria-haspopup="listbox"
              aria-activedescendant={activeDescendant}
            />
            <GameSearchSuggestions
              ref={suggestRef}
              query={q}
              open={suggestOpen}
              onClose={() => setSuggestOpen(false)}
              onSelect={(title) => setQ(title)}
              listId={suggestListId}
              inputId="home-search"
              onActiveDescendantChange={setActiveDescendant}
              linkTarget="catalog"
              onSearchInCatalog={() => search()}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex sm:shrink-0">
            <ScannerButton
              prominent={isHero}
              onClick={() => setScannerOpen(true)}
              className={cn(
                "h-12 min-w-[8.5rem] rounded-lg font-semibold",
                !isHero && "zf-btn-secondary",
                isHero && "border-white/30! bg-white/15! text-white hover:bg-white/25!",
              )}
              variant={isHero ? "outline" : "secondary"}
            />
            <Button
              type="button"
              variant={isHero ? "hero" : "default"}
              className="h-12 min-w-[8.5rem] rounded-md px-6 font-semibold"
              onClick={() => search()}
            >
              <Search className="h-4 w-4" aria-hidden />
              Szukaj
            </Button>
          </div>
        </div>
        <EanScannerLazy open={scannerOpen} onOpenChange={setScannerOpen} onScan={(code) => search(code)} />
      </div>
    </SearchQueryShell>
  );
}
