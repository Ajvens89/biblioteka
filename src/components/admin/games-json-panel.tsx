"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  importGamesJsonDefaultAction,
  importGamesJsonUploadAction,
} from "@/lib/actions/games-json";
import type { ImportGamesJsonStats } from "@/lib/services/games-json";
import { SectionCard } from "@/components/ui/section-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Props = {
  defaultFilePath: string | null;
};

export function GamesJsonPanel({ defaultFilePath }: Props) {
  const [pending, start] = useTransition();
  const [importReport, setImportReport] = useState<string | null>(null);
  const [importStats, setImportStats] = useState<ImportGamesJsonStats | null>(null);
  const [noOverwrite, setNoOverwrite] = useState(false);
  const localPath = defaultFilePath;

  const runImport = (dryRun: boolean, formData?: FormData) => {
    start(async () => {
      const result = formData
        ? await importGamesJsonUploadAction(formData, dryRun, noOverwrite)
        : await importGamesJsonDefaultAction(dryRun, noOverwrite);
      if (result.success && result.data) {
        setImportReport(result.data.report);
        setImportStats(result.data.stats);
        toast.success(dryRun ? "Dry-run games.json zakończony" : "Import games.json zakończony");
      } else {
        toast.error(result.success ? "Błąd" : result.error);
      }
    });
  };

  return (
    <SectionCard
      title="Import / eksport games.json"
      description="Pełny katalog biblioteki (gry, kategorie, egzemplarze). Eksport pobierzesz przyciskiem poniżej; import dopasowuje po slug lub EAN."
    >
      <div className="space-y-4 text-sm">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild data-testid="export-games-json">
            <a href="/api/admin/games/export-json">Eksportuj games.json</a>
          </Button>
          <Button variant="outline" asChild>
            <a href="/api/admin/games/export">Eksportuj CSV</a>
          </Button>
        </div>

        <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>Eksportuj aktualny katalog lub przygotuj plik według wzoru (pole „games”).</li>
          <li>Uruchom dry-run, potem import na żywo.</li>
          <li>
            Zaznacz „Nie nadpisuj wypełnionych pól”, aby import uzupełniał tylko puste metadane istniejących gier.
          </li>
          <li>Format products.json importuj w sekcji poniżej.</li>
        </ol>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={noOverwrite}
            onChange={(e) => setNoOverwrite(e.target.checked)}
            data-testid="import-games-no-overwrite"
          />
          Nie nadpisuj wypełnionych pól (tylko uzupełnij braki)
        </label>

        {localPath ? (
          <p className="rounded-md bg-muted/50 p-3 font-mono text-xs">Lokalny plik: {localPath}</p>
        ) : (
          <p className="text-warning">Brak ./data/games.json — prześlij plik lub najpierw wyeksportuj katalog.</p>
        )}

        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            runImport(false, new FormData(e.currentTarget));
          }}
        >
          <div className="space-y-1">
            <label htmlFor="games-json-file" className="text-xs font-medium">
              Plik games.json
            </label>
            <input
              id="games-json-file"
              name="file"
              type="file"
              accept=".json,application/json"
              className="block text-sm"
              data-testid="import-games-json-file"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            data-testid="import-games-json-dry-run"
            onClick={() => {
              const input = document.getElementById("games-json-file") as HTMLInputElement | null;
              if (input?.files?.[0]) {
                const fd = new FormData();
                fd.set("file", input.files[0]);
                runImport(true, fd);
              } else if (localPath) {
                runImport(true);
              } else {
                toast.error("Wybierz plik lub umieść games.json w ./data/");
              }
            }}
          >
            Dry-run
          </Button>
          <Button type="submit" disabled={pending} data-testid="import-games-json-run">
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
            data-testid="import-games-json-result"
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
            <Badge variant="outline">Egz. nowe: {importStats.copiesCreated}</Badge>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
