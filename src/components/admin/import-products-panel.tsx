"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  importProductsDefaultAction,
  importProductsPasteAction,
  importProductsUploadAction,
  runEanAuditAction,
  saveProductsJsonToProjectAction,
} from "@/lib/actions/products-import";
import { fetchMissingCoversAction } from "@/lib/actions/covers";
import type { EanAuditReport } from "@/lib/services/ean-audit";
import type { ImportProductsStats } from "@/lib/services/import-products";
import { SectionCard } from "@/components/ui/section-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type Props = {
  defaultFilePath: string | null;
  productsFileInfo: { path: string; sizeBytes: number; sizeLabel: string } | null;
};

export function ImportProductsPanel({ defaultFilePath, productsFileInfo }: Props) {
  const [pending, start] = useTransition();
  const [importReport, setImportReport] = useState<string | null>(null);
  const [importStats, setImportStats] = useState<ImportProductsStats | null>(null);
  const [auditText, setAuditText] = useState<string | null>(null);
  const [auditReport, setAuditReport] = useState<EanAuditReport | null>(null);
  const [pastedJson, setPastedJson] = useState("");
  const [coverReport, setCoverReport] = useState<string | null>(null);
  const localPath = defaultFilePath;

  const applyImportResult = (
    result: Awaited<ReturnType<typeof importProductsPasteAction>>,
    dryRun: boolean,
  ) => {
    if (result.success && result.data) {
      setImportReport(result.data.report);
      setImportStats(result.data.stats);
      toast.success(dryRun ? "Dry-run zakończony" : "Import zakończony");
    } else {
      toast.error(result.success ? "Błąd" : result.error);
    }
  };

  const runImport = (dryRun: boolean, formData?: FormData) => {
    start(async () => {
      const result = formData
        ? await importProductsUploadAction(formData, dryRun)
        : await importProductsDefaultAction(dryRun);
      applyImportResult(result, dryRun);
    });
  };

  const runPasteImport = (dryRun: boolean) => {
    if (!pastedJson.trim()) {
      toast.error("Wklej JSON do pola poniżej (instrukcja w sekcji „Wklej plik”).");
      return;
    }
    start(async () => {
      const result = await importProductsPasteAction(pastedJson, dryRun);
      applyImportResult(result, dryRun);
    });
  };

  const saveToProject = () => {
    if (!pastedJson.trim()) {
      toast.error("Najpierw wklej JSON.");
      return;
    }
    start(async () => {
      const result = await saveProductsJsonToProjectAction(pastedJson);
      if (result.success && result.data) {
        toast.success(`Zapisano: ${result.data.path}`);
      } else {
        toast.error(result.success ? "Błąd" : result.error);
      }
    });
  };

  const runCoverFetch = (dryRun: boolean) => {
    start(async () => {
      const result = await fetchMissingCoversAction(30, dryRun);
      if (result.success && result.data) {
        setCoverReport(result.data.report);
        if (!result.data.bggConfigured) {
          toast.message("Bez BGG_TOKEN — używany jest UPCitemdb + Open Library.");
        }
        toast.success(
          dryRun
            ? `Dry-run: ${result.data.stats.updated} okładek do pobrania`
            : `Pobrano ${result.data.stats.updated} okładek`,
        );
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

  const resultBlock = (
    <>
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
    </>
  );

  return (
    <div className="space-y-8">
      <SectionCard
        title="Wklej products.json (zalecane)"
        description="Bez przycisku „Wybierz plik” — skopiuj cały plik z Notatnika lub edytora."
      >
        <div className="space-y-4 text-sm">
          <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
            <li>Na pulpicie kliknij prawym na <strong>products.json</strong> → Otwórz za pomocą → Notatnik.</li>
            <li>
              Zaznacz wszystko: <kbd className="rounded border px-1">Ctrl+A</kbd>, skopiuj:{" "}
              <kbd className="rounded border px-1">Ctrl+C</kbd>.
            </li>
            <li>Wklej w pole poniżej: <kbd className="rounded border px-1">Ctrl+V</kbd>.</li>
            <li>Najpierw <strong>Dry-run</strong>, potem <strong>Importuj</strong>.</li>
          </ol>

          <div className="space-y-2">
            <Label htmlFor="products-paste">Zawartość pliku JSON</Label>
            <Textarea
              id="products-paste"
              value={pastedJson}
              onChange={(e) => setPastedJson(e.target.value)}
              rows={12}
              placeholder='{"collection":[...],"result":"success"}'
              className="font-mono text-xs"
              data-testid="import-products-paste"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              data-testid="import-products-paste-dry-run"
              onClick={() => runPasteImport(true)}
            >
              Dry-run (wklejony)
            </Button>
            <Button
              type="button"
              disabled={pending}
              data-testid="import-products-paste-run"
              onClick={() => runPasteImport(false)}
            >
              Importuj (wklejony)
            </Button>
            <Button type="button" variant="secondary" disabled={pending} onClick={saveToProject}>
              Zapisz w projekcie (data/products.json)
            </Button>
          </div>

          {resultBlock}
        </div>
      </SectionCard>

      <SectionCard
        title="Plik w folderze projektu"
        description="Przeciągnij products.json z pulpitu do folderu data w projekcie."
      >
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            Otwórz w Eksploratorze plików folder{" "}
            <span className="font-mono text-foreground">biblioteka\data</span> i upuść tam swój{" "}
            <strong>products.json</strong> z pulpitu (przeciągnij myszką). Odśwież tę stronę.
          </p>
          {localPath ? (
            <div className="space-y-2 rounded-md bg-muted/50 p-3 font-mono text-xs">
              <p>Wykryty plik: {localPath}</p>
              {productsFileInfo && (
                <p className={productsFileInfo.sizeBytes === 0 ? "text-destructive" : "text-muted-foreground"}>
                  Rozmiar: {productsFileInfo.sizeLabel}
                  {productsFileInfo.sizeBytes === 0 &&
                    " — plik pusty! Użyj sekcji „Wklej products.json” u góry."}
                </p>
              )}
            </div>
          ) : (
            <p className="text-warning">Jeszcze brak pliku w ./data/products.json</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending || !localPath || productsFileInfo?.sizeBytes === 0}
              onClick={() => runImport(true)}
            >
              Dry-run (plik w projekcie)
            </Button>
            <Button
              type="button"
              disabled={pending || !localPath || productsFileInfo?.sizeBytes === 0}
              onClick={() => runImport(false)}
            >
              Importuj (plik w projekcie)
            </Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Wybór pliku z komputera (opcjonalnie)"
        description="Jeśli przeglądarka pozwala — standardowy upload."
      >
        <div className="space-y-4 text-sm">
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.querySelector('input[type="file"]') as HTMLInputElement | null;
              if (!input?.files?.[0]?.size) {
                toast.error("Nie wybrano pliku — użyj sekcji „Wklej products.json” u góry strony.");
                return;
              }
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
              onClick={() => {
                const input = document.getElementById("products-file") as HTMLInputElement | null;
                if (input?.files?.[0]) {
                  const fd = new FormData();
                  fd.set("file", input.files[0]);
                  runImport(true, fd);
                } else {
                  toast.error("Wybierz plik albo użyj wklejania powyżej.");
                }
              }}
            >
              Dry-run
            </Button>
            <Button type="submit" disabled={pending}>
              Importuj
            </Button>
          </form>
        </div>
      </SectionCard>

      <SectionCard
        title="Pobierz okładki z internetu"
        description="Automatycznie: UPCitemdb (EAN/tytuł, darmowe) + ISBN (Open Library). Opcjonalnie BGG_TOKEN."
      >
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            Uzupełnia brakujące okładki dla gier bez pliku w{" "}
            <span className="font-mono">public/covers/</span>. Darmowy limit UPCitemdb: ~100 zapytań/dzień
            (wolniejsze — ~10 s na grę). Uruchamiaj partiami po 30.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              data-testid="fetch-covers-dry-run"
              onClick={() => runCoverFetch(true)}
            >
              Dry-run (30 gier)
            </Button>
            <Button
              type="button"
              disabled={pending}
              data-testid="fetch-covers-run"
              onClick={() => runCoverFetch(false)}
            >
              Pobierz okładki (30 gier)
            </Button>
          </div>
          {coverReport && (
            <pre className="max-h-64 overflow-auto rounded-lg border bg-muted/30 p-4 text-xs whitespace-pre-wrap">
              {coverReport}
            </pre>
          )}
        </div>
      </SectionCard>

      <SectionCard
        id="audit"
        title="Audyt EAN"
        description="Raport duplikatów, błędnych kodów i EAN w polu barcode egzemplarza."
      >
        <div className="space-y-4">
          <Button type="button" onClick={runAudit} disabled={pending} data-testid="run-ean-audit">
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
