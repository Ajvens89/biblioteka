import { Suspense } from "react";
import { CatalogToolbar } from "@/components/games/catalog-toolbar";
import { CatalogCategoryTabs } from "@/components/games/catalog-category-tabs";
import { CatalogTopFilters } from "@/components/games/catalog-top-filters";
import { CatalogMobileFilters } from "@/components/games/catalog-mobile-filters";
import { CatalogFilterChips } from "@/components/games/catalog-filter-chips";
import { CatalogGenreFilters } from "@/components/catalog/catalog-genre-filters";
import { CatalogResults } from "@/components/catalog/catalog-results";
import type { Category, Designer, Publisher, Tag } from "@prisma/client";
import type { GameFilterInput } from "@/lib/validations/game";
import type { CatalogEmptyState } from "@/lib/games/catalog-empty";
import type { GameListItem } from "@/lib/games/queries";

type Props = {
  filters: GameFilterInput;
  params: Record<string, string | undefined>;
  categories: Category[];
  tags: Tag[];
  publishers: Publisher[];
  designers: Designer[];
  items: GameListItem[];
  total: number;
  totalPages: number;
  emptyState: CatalogEmptyState;
  dbOk: boolean;
};

export function CatalogMainPanel({
  filters,
  params,
  categories,
  tags,
  publishers,
  designers,
  items,
  total,
  totalPages,
  emptyState,
  dbOk,
}: Props) {
  return (
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

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Gatunek</p>
        <Suspense>
          <CatalogGenreFilters />
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
          Wyników: <strong className="text-foreground">{total}</strong>
        </p>
      </div>

      <Suspense>
        <CatalogFilterChips />
      </Suspense>

      {dbOk && (
        <CatalogResults
          items={items}
          emptyState={emptyState}
          showEmpty={items.length === 0}
          eanMatch={Boolean(filters.ean && items.length === 1)}
          page={filters.page}
          totalPages={totalPages}
          pageParams={params}
        />
      )}
    </div>
  );
}
