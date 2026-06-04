import { requireAdmin } from "@/lib/auth/guards";
import { getDefaultProductsPath } from "@/lib/actions/products-import";
import { ImportProductsPanel } from "@/components/admin/import-products-panel";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Import i audyt EAN" };

export default async function AdminImportPage() {
  await requireAdmin();
  const defaultFilePath = await getDefaultProductsPath();

  return (
    <div className="space-y-6" data-testid="admin-import-page">
      <PageHeader
        title="Import i audyt EAN"
        description="Import katalogu z products.json oraz przegląd spójności kodów EAN w bibliotece."
      />
      <ImportProductsPanel defaultFilePath={defaultFilePath} />
    </div>
  );
}
