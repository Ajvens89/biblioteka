"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScannerButton } from "@/components/ui/scanner-button";
import { EanScanner } from "@/components/barcode/ean-scanner";
import { COLLECTION_TYPE_LABELS } from "@/lib/constants";

const selectClass =
  "h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm sm:min-w-[130px] sm:flex-none";

export function AdminGamesToolbar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [ean, setEan] = useState(searchParams.get("ean") || "");
  const [scannerOpen, setScannerOpen] = useState(false);

  const setParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/admin/gry?${params.toString()}`);
  };

  const applySearch = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (q) params.set("q", q);
    else params.delete("q");
    if (ean) params.set("ean", ean);
    else params.delete("ean");
    router.push(`/admin/gry?${params.toString()}`);
  };

  const onScan = (code: string) => {
    setEan(code);
    const params = new URLSearchParams(searchParams.toString());
    params.set("ean", code);
    params.delete("q");
    router.push(`/admin/gry?${params.toString()}`);
    toast.message(`Filtr EAN: ${code}`);
  };

  const toggleFlag = (key: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (params.get(key) === "1") params.delete(key);
    else params.set(key, "1");
    router.push(`/admin/gry?${params.toString()}`);
  };

  return (
    <div className="card-elevated space-y-4 p-4" data-testid="admin-games-toolbar">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[160px] flex-1 space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Szukaj (tytuł)</label>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tytuł…"
            onKeyDown={(e) => e.key === "Enter" && applySearch()}
          />
        </div>
        <div className="min-w-[160px] flex-1 space-y-1">
          <label className="text-xs font-medium text-muted-foreground">EAN produktu</label>
          <Input
            data-testid="ean-input"
            value={ean}
            onChange={(e) => setEan(e.target.value)}
            placeholder="Kod z pudełka"
            onKeyDown={(e) => e.key === "Enter" && applySearch()}
          />
        </div>
        <ScannerButton onClick={() => setScannerOpen(true)} label="Skanuj EAN" />
        <Button type="button" variant="secondary" onClick={applySearch}>
          Szukaj
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          data-testid="collection-type-filter"
          className={selectClass}
          aria-label="Typ zbioru"
          value={searchParams.get("collectionType") ?? ""}
          onChange={(e) => setParam("collectionType", e.target.value || null)}
        >
          <option value="">Wszystkie</option>
          {Object.entries(COLLECTION_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        <select
          className={selectClass}
          aria-label="Dostępność"
          value={searchParams.get("availability") ?? ""}
          onChange={(e) => setParam("availability", e.target.value || null)}
        >
          <option value="">Wszystkie dostępności</option>
          <option value="available">Dostępne</option>
          <option value="unavailable">Niedostępne</option>
        </select>

        <select
          className={selectClass}
          aria-label="Sortowanie"
          value={searchParams.get("sort") ?? "title"}
          onChange={(e) => setParam("sort", e.target.value)}
        >
          <option value="title">Nazwa A–Z</option>
          <option value="newest">Najnowsze</option>
          <option value="missingEan">Brak EAN</option>
          <option value="missingCover">Brak okładki</option>
        </select>

        <Button
          type="button"
          size="sm"
          variant={searchParams.get("missingEan") === "1" ? "default" : "outline"}
          data-testid="admin-filter-no-ean"
          onClick={() => toggleFlag("missingEan")}
        >
          Brak EAN
        </Button>
        <Button
          type="button"
          size="sm"
          variant={searchParams.get("missingCover") === "1" ? "default" : "outline"}
          data-testid="admin-filter-no-cover"
          onClick={() => toggleFlag("missingCover")}
        >
          Brak okładki
        </Button>
        {(searchParams.toString().length > 0) && (
          <Button type="button" size="sm" variant="ghost" asChild>
            <Link href="/admin/gry">Wyczyść</Link>
          </Button>
        )}
      </div>

      <EanScanner open={scannerOpen} onOpenChange={setScannerOpen} onScan={onScan} />
    </div>
  );
}
