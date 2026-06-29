import { Suspense } from "react";
import { CatalogMobileFilters } from "@/components/catalog/catalog-mobile-filters";
import { CatalogResultsToolbar } from "@/components/catalog/catalog-results-toolbar";
import { CatalogActiveChips } from "@/components/catalog/catalog-active-chips";
import { CatalogResults } from "@/components/catalog/catalog-results";
import type { GameFilterInput } from "@/lib/validations/game";
import type { CatalogOptionLists } from "@/lib/games/catalog-filters";
import type { CatalogEmptyState } from "@/lib/games/catalog-empty";
import type { GameListItem } from "@/lib/games/queries";

type Props = {
  filters: GameFilterInput;
  params: Record<string, string | undefined>;
  lists: CatalogOptionLists;
  items: GameListItem[];
  total: number;
  totalPages: number;
  emptyState: CatalogEmptyState;
  dbOk: boolean;
};

export function CatalogMainPanel({
  filters,
  params,
  lists,
  items,
  total,
  totalPages,
  emptyState,
  dbOk,
}: Props) {
  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Suspense>
          <CatalogMobileFilters lists={lists} />
        </Suspense>
        <div className="min-w-0 flex-1">
          <Suspense>
            <CatalogResultsToolbar total={total} query={filters.q} />
          </Suspense>
        </div>
      </div>

      <Suspense>
        <CatalogActiveChips lists={lists} />
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
