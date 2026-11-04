"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { Search } from "lucide-react";
import { GameSearchSuggestions, type GameSearchSuggestionsHandle } from "@/components/games/game-search-suggestions";
import { SearchQueryShell } from "@/components/search/search-query-shell";
import { SUGGEST_MIN_QUERY_LENGTH } from "@/lib/games/suggest-games.types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function HomeHeroSearch({ variant = "panel" }: { variant?: "panel" | "hero" }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>();
  const listId = useId();
  const suggestRef = useRef<GameSearchSuggestionsHandle>(null);
  const search = () => {
    setOpen(false);
    router.push(q.trim() ? `/katalog?q=${encodeURIComponent(q.trim())}` : "/katalog");
  };

  return (
    <SearchQueryShell>
      <div data-testid="home-hero-search" className={cn("flex flex-col gap-3 sm:flex-row", variant === "hero" && "zf-hero-search rounded-lg p-1")}>
        <div className="relative min-w-0 flex-1">
          <label htmlFor="home-search" className="sr-only">Tytuł gry lub wydawca</label>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input id="home-search" data-testid="home-search-input" className="zf-search-input h-12 rounded-lg pl-12 pr-4 text-base" placeholder="Wpisz tytuł gry lub wydawcę…" value={q} onChange={(event) => {
            setQ(event.target.value);
            setOpen(event.target.value.trim().length >= SUGGEST_MIN_QUERY_LENGTH);
          }} onKeyDown={(event) => {
            if (suggestRef.current?.handleKeyDown(event)) return;
            if (event.key === "Enter") search();
          }} onFocus={() => q.trim().length >= SUGGEST_MIN_QUERY_LENGTH && setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 150)} role="combobox" aria-autocomplete="list" aria-controls={listId} aria-expanded={open} aria-haspopup="listbox" aria-activedescendant={active} />
          <GameSearchSuggestions ref={suggestRef} query={q} open={open} onClose={() => setOpen(false)} onSelect={setQ} listId={listId} inputId="home-search" onActiveDescendantChange={setActive} linkTarget="game" onSearchInCatalog={search} />
        </div>
        <Button type="button" variant={variant === "hero" ? "hero" : "default"} className="h-12 rounded-lg px-6" onClick={search}><Search className="h-4 w-4" aria-hidden />Szukaj</Button>
      </div>
    </SearchQueryShell>
  );
}
