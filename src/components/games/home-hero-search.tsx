"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScannerButton } from "@/components/ui/scanner-button";
import { EanScanner } from "@/components/barcode/ean-scanner";

export function HomeHeroSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);

  const search = (ean?: string) => {
    const params = new URLSearchParams();
    if (ean) params.set("ean", ean);
    else if (q.trim()) params.set("q", q.trim());
    router.push(`/katalog?${params.toString()}`);
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-3" data-testid="home-hero-search">
      <label htmlFor="home-search" className="sr-only">
        Szukaj gry w katalogu
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            id="home-search"
            data-testid="home-search-input"
            className="h-12 border-0 bg-card pl-11 text-base shadow-soft"
            placeholder="Tytuł, autor, wydawca lub EAN…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
          />
        </div>
        <div className="flex gap-2">
          <ScannerButton
            onClick={() => setScannerOpen(true)}
            className="h-12 flex-1 sm:flex-none"
            variant="secondary"
          />
          <Button type="button" className="h-12 flex-1 sm:flex-none" onClick={() => search()}>
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
