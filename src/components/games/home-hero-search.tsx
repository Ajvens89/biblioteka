"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { GameSearchSuggestions } from "@/components/games/game-search-suggestions";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScannerButton } from "@/components/ui/scanner-button";
import { EanScanner } from "@/components/barcode/ean-scanner";
import { cn } from "@/lib/utils";

type Props = {
  variant?: "hero" | "panel";
};

export function HomeHeroSearch({ variant = "panel" }: Props) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const suggestListId = useId();
  const isHero = variant === "hero";

  const search = (ean?: string) => {
    const params = new URLSearchParams();
    if (ean) params.set("ean", ean);
    else if (q.trim()) params.set("q", q.trim());
    const qs = params.toString();
    router.push(qs ? `/katalog?${qs}` : "/katalog");
  };

  return (
    <div className="w-full" data-testid="home-hero-search">
      <label htmlFor="home-search" className="sr-only">
        Szukaj gry w katalogu
      </label>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
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
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setSuggestOpen(false);
                search();
              }
              if (e.key === "Escape") setSuggestOpen(false);
            }}
            onFocus={() => {
              if (q.trim().length >= 2) setSuggestOpen(true);
            }}
            aria-autocomplete="list"
            aria-controls={suggestListId}
            aria-expanded={suggestOpen}
          />
          <GameSearchSuggestions
            query={q}
            open={suggestOpen}
            onOpenChange={setSuggestOpen}
            onSelect={(title) => setQ(title)}
            listId={suggestListId}
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
            className={cn(
              "h-12 min-w-[8.5rem] rounded-lg px-6 font-semibold",
              isHero ? "zf-btn-primary" : "zf-btn-primary",
            )}
            onClick={() => search()}
          >
            <Search className="h-4 w-4" aria-hidden />
            Szukaj
          </Button>
        </div>
      </div>
      <EanScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScan={(code) => search(code)}
      />
    </div>
  );
}
