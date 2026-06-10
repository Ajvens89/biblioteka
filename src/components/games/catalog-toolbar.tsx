"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useId, useState } from "react";
import { GameSearchSuggestions } from "@/components/games/game-search-suggestions";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScannerButton } from "@/components/ui/scanner-button";
import { EanScanner } from "@/components/barcode/ean-scanner";

export function CatalogToolbar({
  defaultQ = "",
  defaultEan = "",
}: {
  defaultQ?: string;
  defaultEan?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(defaultQ || searchParams.get("q") || defaultEan || "");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const suggestListId = useId();

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
      router.push(`/katalog?${params.toString()}`);
    },
    [q, router, searchParams],
  );

  const onScan = (code: string) => {
    setQ(code);
    submit({ ean: code });
    toast.message(`Szukam gry po EAN ${code}`);
  };

  return (
    <div
      className="zf-catalog-toolbar sticky top-16 z-30 -mx-4 px-4 py-4 md:static md:mx-0 md:p-5"
      data-testid="catalog-toolbar"
    >
      <div className="flex flex-col gap-4">
        <div>
          <label htmlFor="catalog-search-input" className="font-display text-base font-semibold text-foreground">
            Szukaj w katalogu
          </label>
          <p className="text-small mt-0.5 text-muted-foreground">
            Tytuł, tag, autor, wydawca lub kod EAN
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" aria-hidden />
            <Input
              id="catalog-search-input"
              data-testid="catalog-search-input"
              className="zf-search-input h-12 rounded-2xl pl-11"
              placeholder="Tytuł, opis, tag, autor, wydawca, EAN…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setSuggestOpen(false);
                  submit();
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
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <ScannerButton
              prominent
              onClick={() => setScannerOpen(true)}
              className="sm:min-w-[9.5rem]"
            />
            <Button type="button" className="zf-btn-primary h-12 flex-1 rounded-2xl sm:min-w-[7rem]" onClick={() => submit()}>
              <Search className="h-4 w-4" aria-hidden />
              Szukaj
            </Button>
          </div>
        </div>
      </div>
      <EanScanner open={scannerOpen} onOpenChange={setScannerOpen} onScan={onScan} />
    </div>
  );
}
