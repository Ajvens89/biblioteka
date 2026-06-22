import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards";
import { getCatalogQualityReportAction } from "@/lib/actions/catalog-quality";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { Button } from "@/components/ui/button";
import { DataQualityPanel } from "@/components/admin/data-quality-panel";

export const metadata = { title: "Jakość danych katalogu" };

export default async function DataQualityPage() {
  await requireAdmin();
  const report = await getCatalogQualityReportAction();

  return (
    <div className="space-y-6 overflow-x-hidden">
      <PageHeader
        title="Jakość danych"
        description="Raport braków i niespójności w katalogu. Eksport do CSV."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/duplikaty">Duplikaty</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/import">Import</Link>
            </Button>
          </div>
        }
      />
      {report ? (
        <SectionCard title="Raport jakości">
          <DataQualityPanel report={report} />
        </SectionCard>
      ) : (
        <SectionCard title="Raport jakości">
          <p className="py-8 text-center text-muted-foreground">Brak dostępu do raportu.</p>
        </SectionCard>
      )}
    </div>
  );
}
