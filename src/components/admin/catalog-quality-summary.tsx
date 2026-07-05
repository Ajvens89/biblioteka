import Link from "next/link";
import type { WeeklyReportRow } from "@/lib/services/reports";
import { Button } from "@/components/ui/button";

type Props = {
  rows: WeeklyReportRow[];
  generatedAt: string;
  showActions?: boolean;
};

export function CatalogQualitySummary({ rows, generatedAt, showActions = true }: Props) {
  const totalIssues = rows.reduce((sum, r) => sum + r.count, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Wygenerowano: {new Date(generatedAt).toLocaleString("pl-PL")}
          {totalIssues > 0 && (
            <span className="ml-2 font-medium text-foreground">
              · {totalIssues} problemów w {rows.length} kategoriach
            </span>
          )}
        </p>
        {showActions && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/duplikaty">Duplikaty</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/import">Import</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/gry?missingCover=1">Gry bez okładki</Link>
            </Button>
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-sm text-muted-foreground">
          Brak wykrytych problemów w katalogu — dane wyglądają kompletnie.
        </p>
      ) : (
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((row) => (
            <div key={row.category} className="rounded-lg border border-border/80 p-3">
              <dt className="text-sm text-muted-foreground">{row.category}</dt>
              <dd className="text-xl font-semibold">{row.count}</dd>
              {row.sampleTitle && (
                <p className="mt-1 truncate text-xs text-muted-foreground">np. {row.sampleTitle}</p>
              )}
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
