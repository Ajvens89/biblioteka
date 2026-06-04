"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { ScannerButton } from "@/components/ui/scanner-button";
import { EanScanner } from "@/components/barcode/ean-scanner";

export function CatalogSearch({
  defaultValue = "",
  defaultEan = "",
  action = "/katalog",
}: {
  defaultValue?: string;
  defaultEan?: string;
  action?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(defaultValue || searchParams.get("q") || "");
  const [scannerOpen, setScannerOpen] = useState(false);

  const push = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      params.delete("page");
      router.push(`${action}?${params.toString()}`);
    },
    [router, searchParams, action],
  );

  useEffect(() => {
    const t = setTimeout(() => {
      const currentQ = searchParams.get("q") || "";
      const currentEan = searchParams.get("ean") || "";
      if (q !== currentQ && !currentEan) push({ q: q || null, ean: null });
    }, 400);
    return () => clearTimeout(t);
  }, [q, push, searchParams]);

  useEffect(() => {
    if (defaultEan) {
      push({ ean: defaultEan, q: null });
    }
  }, [defaultEan, push]);

  const onScan = (code: string) => {
    setQ(code);
    push({ ean: code, q: null });
    toast.message(`Wyszukiwanie po kodzie ${code}`);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <div className="relative min-w-[200px] flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-10"
          data-testid="catalog-search-input"
          placeholder="Tytuł, opis, tagi lub EAN produktu (nie kod egzemplarza)…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <ScannerButton onClick={() => setScannerOpen(true)} label="Skanuj EAN" />
      <EanScanner open={scannerOpen} onOpenChange={setScannerOpen} onScan={onScan} />
    </div>
  );
}
