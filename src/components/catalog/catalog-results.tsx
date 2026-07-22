import Link from "next/link";
import { Search } from "lucide-react";
import { CatalogGridAnimated } from "@/components/catalog/catalog-grid-animated";
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

function buildPageNumbers(current: number, total: number): number[] {
  const pages = new Set<number>();
  pages.add(1);
  pages.add(total);
  for (let p = current - 2; p <= current + 2; p++) {
    if (p >= 1 && p <= total) pages.add(p);
  }
  return [...pages].sort((a, b) => a - b);
}

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
        <CatalogGridAnimated items={items} />
      )}

      {totalPages > 1 && (
        <nav
          className="flex flex-wrap items-center justify-center gap-2 pt-4"
          aria-label="Paginacja katalogu"
        >
          {page > 1 && (
            <Button variant="outline" asChild>
              <Link href={`/katalog?${buildPageParams(pageParams, page - 1)}`}>Poprzednia</Link>
            </Button>
          )}
          {buildPageNumbers(page, totalPages).map((p, i, arr) => {
            const prev = arr[i - 1];
            const gap = prev != null && p - prev > 1;
            return (
              <span key={p} className="flex items-center gap-2">
                {gap && <span className="text-muted-foreground">…</span>}
                <Button
                  variant={p === page ? "default" : "outline"}
                  size="sm"
                  className="min-w-9"
                  asChild={p !== page}
                  aria-current={p === page ? "page" : undefined}
                >
                  {p === page ? (
                    <span>{p}</span>
                  ) : (
                    <Link href={`/katalog?${buildPageParams(pageParams, p)}`}>{p}</Link>
                  )}
                </Button>
              </span>
            );
          })}
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
