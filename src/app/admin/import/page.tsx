import { requireAdmin } from "@/lib/auth/guards";
import { getDefaultGamesJsonPath } from "@/lib/actions/games-json";
import { getDefaultProductsPath, getProductsFileInfo } from "@/lib/actions/products-import";
import { DbUnavailableBanner } from "@/components/admin/db-unavailable-banner";
import { GamesJsonPanel } from "@/components/admin/games-json-panel";
import { ImportProductsPanel } from "@/components/admin/import-products-panel";
import { PageHeader } from "@/components/ui/page-header";
import { isDatabaseAvailable } from "@/lib/db";

export const metadata = { title: "Import / eksport katalogu" };

export default async function AdminImportPage() {
  const dbOk = await isDatabaseAvailable();

  if (!dbOk) {
    return (
      <div className="space-y-6 overflow-x-hidden" data-testid="admin-import-page">
        <PageHeader
          title="Import / eksport katalogu"
          description="Eksport i import biblioteki (games.json), import hurtowy products.json oraz audyt EAN."
        />
        <DbUnavailableBanner />
      </div>
    );
  }

  await requireAdmin();
  const [gamesPathResult, productsPathResult, productsInfoResult] = await Promise.all([
    getDefaultGamesJsonPath(),
    getDefaultProductsPath(),
    getProductsFileInfo(),
  ]);

  const defaultGamesPath =
    gamesPathResult.success ? gamesPathResult.data?.path ?? null : null;
  const defaultProductsPath =
    productsPathResult.success ? productsPathResult.data?.path ?? null : null;
  const productsFileInfo = productsInfoResult.success ? productsInfoResult.data ?? null : null;

  return (
    <div className="space-y-6 overflow-x-hidden" data-testid="admin-import-page">
      <PageHeader
        title="Import / eksport katalogu"
        description="Eksport i import biblioteki (games.json), import hurtowy products.json oraz audyt EAN."
      />
      <GamesJsonPanel defaultFilePath={defaultGamesPath} />
      <ImportProductsPanel
        defaultFilePath={defaultProductsPath}
        productsFileInfo={productsFileInfo}
      />
    </div>
  );
}
