"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  exportCatalogQualityCsvAction,
  fixGameSlugAction,
} from "@/lib/actions/catalog-quality";
import type { CatalogQualityReport } from "@/lib/services/catalog-quality";

type Props = { report: CatalogQualityReport };

const SECTIONS: Array<{ key: keyof CatalogQualityReport; label: string }> = [
  { key: "missingEan", label: "Brak EAN" },
  { key: "invalidEan", label: "Błędny EAN" },
  { key: "slugMismatch", label: "Niespójny slug" },
  { key: "noCopies", label: "Bez egzemplarzy" },
  { key: "typeMismatch", label: "Niespójny typ" },
  { key: "missingAuthor", label: "Brak autora" },
  { key: "missingPublisher", label: "Brak wydawcy" },
  { key: "missingCover", label: "Brak okładki" },
  { key: "missingDescription", label: "Brak opisu" },
];

export function DataQualityPanel({ report }: Props) {
  const [filter, setFilter] = useState<string>("missingEan");
  const [pending, startTransition] = useTransition();

  function exportCsv() {
    startTransition(async () => {
      const result = await exportCatalogQualityCsvAction();
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      const blob = new Blob([result.data!.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "raport-jakosci-katalogu.csv";
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  function fixSlug(gameId: string) {
    startTransition(async () => {
      const result = await fixGameSlugAction(gameId);
      if (!result.success) toast.error(result.error);
      else toast.success(`Slug zmieniony na: ${result.data?.newSlug}`);
    });
  }

  const items = (report[filter as keyof CatalogQualityReport] ?? []) as CatalogQualityReport["missingEan"];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {SECTIONS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={`rounded-full border px-3 py-1 text-xs ${filter === key ? "border-primary bg-primary/10" : "border-border"}`}
            onClick={() => setFilter(key)}
          >
            {label} ({report.totals[key] ?? 0})
          </button>
        ))}
        <Button size="sm" variant="outline" onClick={exportCsv} disabled={pending} data-testid="catalog-quality-export">
          Eksport CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pozycje ({items.length})</CardTitle>
        </CardHeader>
        <CardContent className="max-h-[60vh] overflow-y-auto">
          <ul className="space-y-2 text-sm">
            {items.slice(0, 100).map((item) => (
              <li
                key={`${item.id}-${item.issue}`}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2"
              >
                <div>
                  <Link href={`/admin/gry/${item.id}`} className="font-medium text-primary hover:underline">
                    {item.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">{item.issue}</p>
                </div>
                {item.category === "slug" && (
                  <Button size="sm" variant="outline" onClick={() => fixSlug(item.id)} disabled={pending}>
                    Napraw slug
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
