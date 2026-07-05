import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guards";
import { getCatalogQualityReportAction } from "@/lib/actions/catalog-quality";
import { getWeeklyReportAction } from "@/lib/actions/reports";
import { CatalogQualitySummary } from "@/components/admin/catalog-quality-summary";
import { DataQualityPanel } from "@/components/admin/data-quality-panel";
import { ReportCsvExportButton } from "@/components/admin/report-csv-export-button";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatCard } from "@/components/ui/stat-card";

export const metadata = { title: "Centrum jakości katalogu" };

export default async function DataQualityPage() {
  await requireAdmin();
  const [report, weeklyReport] = await Promise.all([
    getCatalogQualityReportAction(),
    getWeeklyReportAction(),
  ]);

  return (
    <div className="space-y-6 overflow-x-hidden" data-testid="catalog-quality-hub">
      <PageHeader
        title="Centrum jakości katalogu"
        description="Jeden widok braków danych, raportów i eksportu CSV — zamiast osobnych dashboardów jakości i raportów."
        actions={<ReportCsvExportButton />}
      />

      <SectionCard
        title="Podsumowanie braków"
        description="Agregat kategorii problemów — szczegóły i naprawy poniżej."
      >
        <CatalogQualitySummary rows={weeklyReport.rows} generatedAt={weeklyReport.generatedAt} />
      </SectionCard>

      {report && (
        <>
          <div>
            <h2 className="text-h3 mb-4">Szybkie filtry</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Brak EAN"
                value={report.totals.missingEan ?? 0}
                href="/admin/gry?missingEan=1"
                tone="warning"
              />
              <StatCard
                label="Brak okładki"
                value={report.totals.missingCover ?? 0}
                href="/admin/gry?missingCover=1"
                tone="warning"
              />
              <StatCard
                label="Brak opisu"
                value={report.totals.missingDescription ?? 0}
                href="/admin/gry?missingDescription=1"
                tone="warning"
              />
              <StatCard
                label="Bez egzemplarzy"
                value={report.totals.noCopies ?? 0}
                href="/admin/gry?missingCopies=1"
                tone="warning"
              />
            </div>
          </div>

          <SectionCard title="Szczegółowy raport" description="Przeglądaj pozycje, naprawiaj slugi i eksportuj CSV.">
            <DataQualityPanel report={report} />
          </SectionCard>
        </>
      )}

      {!report && (
        <SectionCard title="Szczegółowy raport">
          <p className="py-8 text-center text-muted-foreground">Brak dostępu do raportu.</p>
        </SectionCard>
      )}

      <SectionCard title="Okładki i backfill" description="Narzędzia CLI do uzupełniania okładek.">
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>
            <code className="text-xs">npm run audit:covers</code> — audyt brakujących i uszkodzonych okładek
          </li>
          <li>
            <code className="text-xs">npm run backfill:covers:all</code> — pobieranie okładek z BGG / Google Books
          </li>
          <li>
            <Link href="/admin/gry?missingCover=1" className="text-primary hover:underline">
              Lista gier bez okładki →
            </Link>
          </li>
        </ul>
      </SectionCard>
    </div>
  );
}
