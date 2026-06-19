import { requireAdmin } from "@/lib/auth/guards";
import { getWeeklyReportAction } from "@/lib/actions/reports";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { ReportCsvExportButton } from "@/components/admin/report-csv-export-button";

export const metadata = { title: "Raporty" };

export default async function AdminReportsPage() {
  await requireAdmin();
  const report = await getWeeklyReportAction();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Raporty"
        description="Tygodniowy przegląd braków danych w katalogu — eksport do CSV."
        actions={<ReportCsvExportButton />}
      />

      <SectionCard title="Podsumowanie" description={`Wygenerowano: ${new Date(report.generatedAt).toLocaleString("pl-PL")}`}>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {report.rows.map((row) => (
            <div key={row.category} className="rounded-lg border border-border/80 p-3">
              <dt className="text-sm text-muted-foreground">{row.category}</dt>
              <dd className="text-xl font-semibold">{row.count}</dd>
              {row.sampleTitle && (
                <p className="text-xs text-muted-foreground mt-1 truncate">np. {row.sampleTitle}</p>
              )}
            </div>
          ))}
        </dl>
        {report.rows.length === 0 && (
          <p className="text-sm text-muted-foreground">Brak wykrytych problemów w katalogu.</p>
        )}
      </SectionCard>
    </div>
  );
}
