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
    <div className="mx-auto w-full max-w-3xl" data-testid="home-hero-search">
      <label htmlFor="home-search" className="sr-only">
        Szukaj gry w katalogu
      </label>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
        <div className="relative min-w-0 flex-1">
          <Search
            className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary/80"
            aria-hidden
          />
          <Input
            id="home-search"
            data-testid="home-search-input"
            className="landing-search-input h-14 rounded-xl border-2 border-primary/20 bg-background pl-12 pr-4 text-base shadow-sm"
            placeholder="Np. Azul, Catan lub kod EAN…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex sm:shrink-0">
          <ScannerButton
            onClick={() => setScannerOpen(true)}
            className="h-14 min-w-[8.5rem] rounded-xl font-semibold shadow-sm"
            variant="secondary"
          />
          <Button
            type="button"
            className="h-14 min-w-[8.5rem] rounded-xl px-6 text-base font-semibold shadow-md"
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
