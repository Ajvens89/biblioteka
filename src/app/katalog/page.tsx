import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { PageShell } from "@/components/ui/page-shell";
import { DbUnavailableBanner } from "@/components/db-unavailable-banner";
import { CatalogHeader } from "@/components/catalog/catalog-header";
import { CatalogSearch } from "@/components/catalog/catalog-search";
import { CatalogResults } from "@/components/catalog/catalog-results";
import { fetchGames, fetchPublicStatsCached } from "@/lib/games/queries";
import { parsePublicCatalogQuery } from "@/lib/games/public-catalog-query";
import type { CatalogSearchParams } from "@/lib/games/catalog-query";
import { isDatabaseAvailable, prisma } from "@/lib/db";
import { APP_NAME } from "@/lib/constants";

export const revalidate = 60;
type Props = { searchParams: Promise<CatalogSearchParams> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { filters } = parsePublicCatalogQuery(await searchParams);
  const title = filters.q ? `Szukaj: ${filters.q}` : "Katalog gier";
  const description = "Przeglądaj gry Zakątka Fantastyki. Wyszukuj po tytule lub wydawcy.";
  return { title, description, openGraph: { title: `${title} | ${APP_NAME}`, description } };
}

export default async function CatalogPage({ searchParams }: Props) {
  const { filters, navigationParams } = parsePublicCatalogQuery(await searchParams);
  const dbOk = await isDatabaseAvailable();
  const [result, publishers, stats] = dbOk ? await Promise.all([
    fetchGames(filters),
    prisma.publisher.findMany({ where: { games: { some: { isActive: true, deletedAt: null } } }, orderBy: { name: "asc" }, select: { slug: true, name: true } }),
    fetchPublicStatsCached(),
  ]) : [{ items: [], total: 0, page: 1 }, [], { games: 0 }];
  const active = Boolean(filters.q || filters.publisher || filters.collectionType);
  const totalPages = Math.ceil(result.total / filters.pageSize);

  return (
    <PageShell className="zf-catalog-page" width="wide">
      <CatalogHeader total={stats.games} matching={result.total} hasActiveParams={active} dbOk={dbOk} />
      <div className="zf-catalog-controls">
        <Suspense><CatalogSearch key={`${filters.q ?? ""}:${filters.publisher ?? ""}`} defaultQ={filters.q} defaultPublisher={filters.publisher} publishers={publishers} /></Suspense>
      </div>
      {!dbOk ? <DbUnavailableBanner /> : (
        <div className="min-w-0 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p data-testid="catalog-result-count" className="text-sm text-muted-foreground" aria-live="polite">Liczba znalezionych tytułów: <strong className="text-foreground">{result.total}</strong></p>
            {active ? <Link href="/katalog" className="text-sm font-medium text-primary underline-offset-4 hover:underline">Pokaż cały katalog</Link> : null}
          </div>
          <CatalogResults items={result.items} showEmpty={result.items.length === 0} page={result.page} totalPages={totalPages} pageParams={navigationParams} emptyState={{ title: "Nie znaleziono gry", description: "Spróbuj innego tytułu lub wybierz innego wydawcę.", action: { label: "Pokaż cały katalog", href: "/katalog" } }} />
        </div>
      )}
    </PageShell>
  );
}
