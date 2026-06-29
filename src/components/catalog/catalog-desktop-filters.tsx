"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  buildCatalogQuery,
  clearFiltersQuery,
  countActiveFilters,
  readFilterValues,
  type CatalogOptionLists,
} from "@/lib/games/catalog-filters";
import { CatalogFilters } from "@/components/catalog/catalog-filters";
import { cn } from "@/lib/utils";

type Props = { lists: CatalogOptionLists };

export function CatalogDesktopFilters({ lists }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const params = new URLSearchParams(searchParams.toString());
  const values = readFilterValues(params);
  const activeCount = countActiveFilters(params);

  const onChange = (patch: Record<string, string | null>) => {
    const qs = buildCatalogQuery(new URLSearchParams(searchParams.toString()), patch);
    startTransition(() => {
      router.push(qs ? `/katalog?${qs}` : "/katalog", { scroll: false });
    });
  };

  return (
    <aside className="hidden lg:block">
      <div
        className={cn(
          "zf-catalog-filters sticky top-20 p-5 transition-opacity",
          isPending && "opacity-70",
        )}
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-h3">Filtry</h2>
          {activeCount > 0 && (
            <Link
              href={clearFiltersQuery(params) ? `/katalog?${clearFiltersQuery(params)}` : "/katalog"}
              scroll={false}
              className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Wyczyść ({activeCount})
            </Link>
          )}
        </div>
        <CatalogFilters values={values} onChange={onChange} lists={lists} />
      </div>
    </aside>
  );
}
