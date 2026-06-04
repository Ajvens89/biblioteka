"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ScannerButton } from "@/components/ui/scanner-button";
import { EanScanner } from "@/components/barcode/ean-scanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ScanMode = "product_ean" | "copy_barcode";

export function CopiesScanPanel({ defaultScan = "" }: { defaultScan?: string }) {
  const router = useRouter();
  const [scan, setScan] = useState(defaultScan);
  const [mode, setMode] = useState<ScanMode>("copy_barcode");
  const [scannerOpen, setScannerOpen] = useState(false);

  const submit = () => {
    if (!scan.trim()) {
      toast.error("Wpisz lub zeskanuj kod.");
      return;
    }
    const params = new URLSearchParams();
    params.set("scan", scan.trim());
    params.set("scanMode", mode);
    router.push(`/admin/egzemplarze?${params.toString()}`);
  };

  const onScan = (code: string) => {
    setScan(code);
    toast.message(`Zeskanowano: ${code} (${mode === "product_ean" ? "EAN produktu" : "kod egzemplarza"})`);
  };

  return (
    <div className="card-elevated space-y-4 p-4" data-testid="copies-scan-panel">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "product_ean" ? "default" : "outline"}
          onClick={() => setMode("product_ean")}
        >
          EAN produktu (gra)
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "copy_barcode" ? "default" : "outline"}
          onClick={() => setMode("copy_barcode")}
        >
          Kod egzemplarza
        </Button>
      </div>
      <p className="text-small text-muted-foreground">
        Tryb:{" "}
        <strong>
          {mode === "product_ean"
            ? "szukam gry po EAN produktu z pudełka"
            : "szukam egzemplarza po numerze inwentarzowym lub naklejce"}
        </strong>
      </p>
      <div className="space-y-2">
        <Label htmlFor="copy-scan-input">Kod</Label>
        <div className="flex flex-wrap gap-2">
          <Input
            id="copy-scan-input"
            data-testid="copy-scan-input"
            className="min-w-[200px] flex-1"
            value={scan}
            onChange={(e) => setScan(e.target.value)}
            placeholder={
              mode === "product_ean" ? "EAN / ISBN produktu" : "Nr inwentarzowy lub barcode egzemplarza"
            }
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          <ScannerButton onClick={() => setScannerOpen(true)} label="Skanuj" />
          <Button type="button" onClick={submit}>
            Szukaj
          </Button>
        </div>
      </div>
      <EanScanner open={scannerOpen} onOpenChange={setScannerOpen} onScan={onScan} />
    </div>
  );
}
