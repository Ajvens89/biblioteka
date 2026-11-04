import { requireAdmin } from "@/lib/auth/guards";
import { getCatalogQualityReportAction } from "@/lib/actions/catalog-quality";
import { DataQualityPanel } from "@/components/admin/data-quality-panel";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatCard } from "@/components/ui/stat-card";

export const metadata = { title: "Jakość danych katalogu" };
export default async function DataQualityPage() {
  await requireAdmin();
  const report = await getCatalogQualityReportAction();
  return <div className="space-y-6 overflow-x-hidden" data-testid="catalog-quality-hub">
    <PageHeader title="Jakość danych katalogu" description="Sprawdź tytuły, wydawców, opisy, okładki i kody EAN." />
    {report ? <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Brak EAN" value={report.totals.missingEan || 0} href="/admin/gry?missingEan=1" />
        <StatCard label="Brak okładki" value={report.totals.missingCover || 0} href="/admin/gry?missingCover=1" />
        <StatCard label="Brak opisu" value={report.totals.missingDescription || 0} href="/admin/gry?missingDescription=1" />
      </div>
      <SectionCard title="Metadane do poprawienia"><DataQualityPanel report={report} /></SectionCard>
    </> : <SectionCard title="Raport"><p>Raport jest chwilowo niedostępny.</p></SectionCard>}
  </div>;
}
