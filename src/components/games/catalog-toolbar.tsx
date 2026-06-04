"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
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
      className="sticky top-16 z-30 -mx-4 border-b border-border/80 bg-background/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:rounded-xl md:border md:p-4"
      data-testid="catalog-toolbar"
    >
      <div className="flex flex-col gap-3">
        <label htmlFor="catalog-search-input" className="text-sm font-medium">
          Szukaj w katalogu
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              id="catalog-search-input"
              data-testid="catalog-search-input"
              className="h-11 pl-10"
              placeholder="Tytuł, opis, tag, autor, wydawca, EAN…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>
          <div className="flex gap-2">
            <ScannerButton onClick={() => setScannerOpen(true)} className="h-11" />
            <Button type="button" className="h-11 flex-1 sm:flex-none" onClick={() => submit()}>
              Szukaj
            </Button>
          </div>
        </div>
      </div>
      <EanScanner open={scannerOpen} onOpenChange={setScannerOpen} onScan={onScan} />
    </div>
  );
}
