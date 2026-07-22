import { PageShell } from "@/components/ui/page-shell";
import { CatalogGridSkeleton } from "@/components/ui/loading-skeleton";

export default function CatalogLoading() {
  return (
    <PageShell className="zf-catalog-page" width="wide">
      <div className="mb-8 h-10 w-64 animate-pulse rounded-lg bg-muted" />
      <CatalogGridSkeleton count={6} />
    </PageShell>
  );
}
