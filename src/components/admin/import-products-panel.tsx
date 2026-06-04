"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  importProductsDefaultAction,
  importProductsUploadAction,
  runEanAuditAction,
} from "@/lib/actions/products-import";
import type { EanAuditReport } from "@/lib/services/ean-audit";
import type { ImportProductsStats } from "@/lib/services/import-products";
import { SectionCard } from "@/components/ui/section-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Props = {
  defaultFilePath: string | null;
};

export function ImportProductsPanel({ defaultFilePath }: Props) {
  const [pending, start] = useTransition();
  const [importReport, setImportReport] = useState<string | null>(null);
  const [importStats, setImportStats] = useState<ImportProductsStats | null>(null);
  const [auditText, setAuditText] = useState<string | null>(null);
  const [auditReport, setAuditReport] = useState<EanAuditReport | null>(null);
  const localPath = defaultFilePath;

  const runImport = (dryRun: boolean, formData?: FormData) => {
    start(async () => {
      const result = formData
        ? await importProductsUploadAction(formData, dryRun)
        : await importProductsDefaultAction(dryRun);
      if (result.success && result.data) {
        setImportReport(result.data.report);
        setImportStats(result.data.stats);
        toast.success(dryRun ? "Dry-run zakończony" : "Import zakończony");
      } else {
        toast.error(result.success ? "Błąd" : result.error);
      }
    });
  };

  const runAudit = () => {
    start(async () => {
      const result = await runEanAuditAction();
      if (result.success && result.data) {
        setAuditText(result.data.text);
        setAuditReport(result.data.report);
        toast.success(result.data.report.ok ? "Audyt OK" : "Audyt — wymaga uwagi");
      } else {
        toast.error(result.success ? "Błąd" : result.error);
      }
    });
  };

  return (
    <div className="space-y-8">
      <SectionCard
        title="Import products.json"
        description="Import nie scala automatycznie duplikatów — każdy rekord jest dodawany lub aktualizowany według EAN."
      >
        <div className="space-y-4 text-sm">
          <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>Przygotuj plik JSON z tablicą „collection” (pole barcode → EAN produktu).</li>
            <li>Najpierw uruchom dry-run, aby zobaczyć podsumowanie bez zapisu.</li>
            <li>Po weryfikacji uruchom import na żywo.</li>
          </ol>
          {localPath ? (
            <p className="rounded-md bg-muted/50 p-3 font-mono text-xs">
              Lokalny plik: {localPath}
            </p>
          ) : (
            <p className="text-warning">Brak domyślnego pliku — prześlij products.json poniżej.</p>
          )}
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              runImport(false, new FormData(e.currentTarget));
            }}
          >
            <div className="space-y-1">
              <label htmlFor="products-file" className="text-xs font-medium">
                Plik JSON
              </label>
              <input
                id="products-file"
                name="file"
                type="file"
                accept=".json,application/json"
                className="block text-sm"
                data-testid="import-products-file"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              data-testid="import-products-dry-run"
              onClick={() => {
                const input = document.getElementById("products-file") as HTMLInputElement | null;
                if (input?.files?.[0]) {
                  const fd = new FormData();
                  fd.set("file", input.files[0]);
                  runImport(true, fd);
                } else if (localPath) {
                  runImport(true);
                } else {
                  toast.error("Wybierz plik lub umieść products.json w ./data/");
                }
              }}
            >
              Dry-run
            </Button>
            <Button type="submit" disabled={pending} data-testid="import-products-run">
              Importuj
            </Button>
            {localPath && (
              <Button
                type="button"
                variant="secondary"
                disabled={pending}
                onClick={() => runImport(true)}
              >
                Dry-run (lokalny)
              </Button>
            )}
          </form>
          {importReport && (
            <pre
              className="max-h-80 overflow-auto rounded-lg border bg-muted/30 p-4 text-xs"
              data-testid="import-products-result"
            >
              {importReport}
            </pre>
          )}
          {importStats && (
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Odczytano: {importStats.read}</Badge>
              <Badge variant="success">Utworzono: {importStats.created}</Badge>
              <Badge variant="outline">Zaktualizowano: {importStats.updated}</Badge>
              <Badge variant="warning">Pominięto: {importStats.skipped}</Badge>
            </div>
          )}
          <p className="text-muted-foreground">
            Dokumentacja: plik README w repozytorium (sekcje Import products.json i Audyt EAN).
          </p>
        </div>
      </SectionCard>

      <SectionCard
        id="audit"
        title="Audyt EAN"
        description="Raport duplikatów, błędnych kodów i EAN w polu barcode egzemplarza. Bez automatycznego scalania."
      >
        <div className="space-y-4">
          <Button
            type="button"
            onClick={runAudit}
            disabled={pending}
            data-testid="run-ean-audit"
          >
            Uruchom audyt EAN
          </Button>
          {auditReport && (
            <div className="flex flex-wrap gap-2">
              <Badge variant={auditReport.ok ? "success" : "warning"}>
                {auditReport.ok ? "OK" : "Ostrzeżenia"}
              </Badge>
              <Badge variant="outline">Duplikaty EAN: {auditReport.stats.duplicateActiveEan}</Badge>
              <Badge variant="outline">EAN jako barcode: {auditReport.stats.eanAsCopyBarcode}</Badge>
              <Badge variant="outline">Błędne EAN: {auditReport.stats.invalidEanGames}</Badge>
            </div>
          )}
          {auditText && (
            <pre
              className="max-h-96 overflow-auto rounded-lg border bg-muted/30 p-4 text-xs whitespace-pre-wrap"
              data-testid="ean-audit-result"
            >
              {auditText}
            </pre>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
