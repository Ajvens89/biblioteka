import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards";
import { getCatalogQualityReportAction } from "@/lib/actions/catalog-quality";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { DataQualityPanel } from "@/components/admin/data-quality-panel";

export const metadata = { title: "Jakość danych katalogu" };

export default async function DataQualityPage() {
  await requireAdmin();
  const report = await getCatalogQualityReportAction();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jakość danych"
        description="Raport braków i niespójności w katalogu. Eksport do CSV."
      />
      <div className="flex gap-2 text-sm">
        <Link href="/admin/duplikaty" className="text-primary underline-offset-2 hover:underline">
          Duplikaty →
        </Link>
        <Link href="/admin/import" className="text-primary underline-offset-2 hover:underline">
          Import →
        </Link>
      </div>
      {report && <DataQualityPanel report={report} />}
      {!report && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">Brak dostępu do raportu.</CardContent>
        </Card>
      )}
    </div>
  );
}
