import Link from "next/link";
import { Suspense } from "react";
import { Search } from "lucide-react";
import { GameCard } from "@/components/games/game-card";
import { CatalogToolbar } from "@/components/games/catalog-toolbar";
import { CatalogCategoryTabs } from "@/components/games/catalog-category-tabs";
import { CatalogTopFilters } from "@/components/games/catalog-top-filters";
import { CatalogSidebarFilters } from "@/components/games/catalog-sidebar-filters";
import { CatalogMobileFilters } from "@/components/games/catalog-mobile-filters";
import { CatalogFilterChips } from "@/components/games/catalog-filter-chips";
import { PageShell } from "@/components/ui/page-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { fetchGames } from "@/lib/games/queries";
import { gameFilterSchema } from "@/lib/validations/game";
import { prisma } from "@/lib/db";

export const metadata = { title: "Katalog gier" };

type PageProps = { searchParams: Promise<Record<string, string | undefined>> };

export default async function CatalogPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters = gameFilterSchema.parse({
    q: params.q,
    ean: params.ean,
    category: params.category,
    collectionType: params.collectionType,
    type: params.type,
    difficulty: params.difficulty,
    minPlayers: params.minPlayers,
    maxPlayers: params.maxPlayers,
    minAge: params.minAge,
    maxPlayTime: params.maxPlayTime,
    availability: params.availability,
    tag: params.tag,
    publisher: params.publisher,
    designer: params.designer,
    sort: params.sort,
    page: params.page,
  });

  const [result, categories, tags, publishers, designers] = await Promise.all([
    fetchGames(filters),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.tag.findMany({ orderBy: { name: "asc" }, take: 40 }),
    prisma.publisher.findMany({ orderBy: { name: "asc" }, take: 50 }),
    prisma.designer.findMany({ orderBy: { name: "asc" }, take: 50 }),
  ]);

  const totalPages = Math.ceil(result.total / filters.pageSize);

  return (
    <PageShell className="overflow-x-hidden" width="wide">
      <header className="zf-catalog-hero mb-10 space-y-3">
        <p className="text-eyebrow">Katalog online</p>
        <h1 className="text-display">Katalog gier</h1>
        <p className="text-body max-w-xl text-muted-foreground">
          {result.total} pozycji w bibliotece. Szukaj po tytule, autorze, wydawcy lub zeskanuj kod EAN.
        </p>
      </header>

      <div className="lg:grid lg:grid-cols-[minmax(0,17rem)_1fr] lg:gap-8">
        <aside className="hidden lg:block">
          <div className="zf-catalog-filters sticky top-20 p-5">
            <h2 className="text-h3 mb-4">Filtry</h2>
            <CatalogSidebarFilters
              categories={categories}
              tags={tags}
              publishers={publishers}
              designers={designers}
              current={filters}
            />
          </div>
        </aside>

        <div className="min-w-0 space-y-4">
          <Suspense>
            <CatalogToolbar defaultQ={filters.q} defaultEan={filters.ean} />
          </Suspense>

          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Kategoria gry</p>
            <Suspense>
              <CatalogCategoryTabs />
            </Suspense>
          </div>

          <Suspense>
            <CatalogTopFilters current={filters} />
          </Suspense>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Suspense>
              <CatalogMobileFilters
                categories={categories}
                tags={tags}
                publishers={publishers}
                designers={designers}
                current={filters}
              />
            </Suspense>
            <p className="text-small text-muted-foreground" data-testid="catalog-result-count">
              Wyników: <strong className="text-foreground">{result.total}</strong>
            </p>
          </div>

          <Suspense>
            <CatalogFilterChips />
          </Suspense>

          {filters.ean && result.items.length === 1 && (
            <p className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm" role="status">
              Znaleziono grę po kodzie EAN produktu.
            </p>
          )}

          {result.items.length === 0 ? (
            <EmptyState
              testId="catalog-empty"
              title={filters.ean ? "Nie znaleziono gry o tym EAN" : "Nie znaleziono gry"}
              description={
                filters.ean
                  ? "Sprawdź, czy zeskanowałeś kod z pudełka produktu (nie kod naklejki egzemplarza w bibliotece)."
                  : "Zmień wyszukiwanie lub usuń filtry — w katalogu na pewno jest coś ciekawego."
              }
              icon={<Search className="h-7 w-7" />}
              action={{ label: "Wyczyść filtry", href: "/katalog" }}
            />
          ) : (
            <div
              className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3"
              data-testid="catalog-grid"
            >
              {result.items.map((game) => (
                <GameCard key={game.id} game={game} showReserve variant="catalog" />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex flex-wrap justify-center gap-2 pt-4">
              {filters.page > 1 && (
                <Button variant="outline" asChild>
                  <Link href={`/katalog?${buildPageParams(params, filters.page - 1)}`}>
                    Poprzednia
                  </Link>
                </Button>
              )}
              <span className="flex min-h-11 items-center px-4 text-small text-muted-foreground">
                Strona {filters.page} z {totalPages}
              </span>
              {filters.page < totalPages && (
                <Button variant="outline" asChild>
                  <Link href={`/katalog?${buildPageParams(params, filters.page + 1)}`}>
                    Następna
                  </Link>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}

function buildPageParams(params: Record<string, string | undefined>, page: number) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v && k !== "page") sp.set(k, v);
  });
  sp.set("page", String(page));
  return sp.toString();
}
