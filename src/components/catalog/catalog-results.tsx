import Link from "next/link";
import { Search } from "lucide-react";
import { GameCard } from "@/components/games/game-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import type { CatalogEmptyState } from "@/lib/games/catalog-empty";
import type { GameListItem } from "@/lib/games/queries";

type Props = {
  items: GameListItem[];
  emptyState: CatalogEmptyState;
  showEmpty: boolean;
  eanMatch?: boolean;
  page: number;
  totalPages: number;
  pageParams: Record<string, string | undefined>;
};

export function CatalogResults({
  items,
  emptyState,
  showEmpty,
  eanMatch,
  page,
  totalPages,
  pageParams,
}: Props) {
  return (
    <>
      {eanMatch && (
        <p className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm" role="status">
          Znaleziono grę po kodzie EAN produktu.
        </p>
      )}

      {showEmpty ? (
        <EmptyState
          testId="catalog-empty"
          title={emptyState.title}
          description={emptyState.description}
          icon={<Search className="h-7 w-7" />}
          action={emptyState.action}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="catalog-grid">
          {items.map((game) => (
            <GameCard key={game.id} game={game} showReserve variant="catalog" />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav
          className="flex flex-wrap justify-center gap-2 pt-4"
          aria-label="Paginacja katalogu"
        >
          {page > 1 && (
            <Button variant="outline" asChild>
              <Link href={`/katalog?${buildPageParams(pageParams, page - 1)}`}>Poprzednia</Link>
            </Button>
          )}
          <span className="flex min-h-11 items-center px-4 text-small text-muted-foreground">
            Strona {page} z {totalPages}
          </span>
          {page < totalPages && (
            <Button variant="outline" asChild>
              <Link href={`/katalog?${buildPageParams(pageParams, page + 1)}`}>Następna</Link>
            </Button>
          )}
        </nav>
      )}
    </>
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
