"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { Search } from "lucide-react";
import { GameSearchSuggestions, type GameSearchSuggestionsHandle } from "@/components/games/game-search-suggestions";
import { SearchQueryShell } from "@/components/search/search-query-shell";
import { SUGGEST_MIN_QUERY_LENGTH } from "@/lib/games/suggest-games.types";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function HeaderSearch({ className }: { className?: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [activeDescendant, setActiveDescendant] = useState<string>();
  const suggestListId = useId();
  const inputId = useId();
  const suggestRef = useRef<GameSearchSuggestionsHandle>(null);

  const submit = () => {
    const text = q.trim();
    router.push(text ? `/katalog?q=${encodeURIComponent(text)}` : "/katalog");
    setSuggestOpen(false);
  };

  return (
    <SearchQueryShell>
      <div className={cn("relative min-w-0 flex-1 max-w-md", className)} data-testid="header-search">
        <label htmlFor={inputId} className="sr-only">
          Szukaj w katalogu
        </label>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          id={inputId}
          data-testid="header-search-input"
          className="h-9 rounded-lg border-border/80 bg-secondary/40 pl-9 text-sm"
          placeholder="Szukaj gry…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setSuggestOpen(e.target.value.trim().length >= SUGGEST_MIN_QUERY_LENGTH);
          }}
          onKeyDown={(e) => {
            if (suggestRef.current?.handleKeyDown(e)) return;
            if (e.key === "Enter") submit();
          }}
          onFocus={() => {
            if (q.trim().length >= SUGGEST_MIN_QUERY_LENGTH) setSuggestOpen(true);
          }}
          onBlur={() => window.setTimeout(() => setSuggestOpen(false), 150)}
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
          inputId={inputId}
          onActiveDescendantChange={setActiveDescendant}
          linkTarget="catalog"
          onSearchInCatalog={submit}
        />
      </div>
    </SearchQueryShell>
  );
}
