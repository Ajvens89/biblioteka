"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { GENRE_CATEGORY_FILTERS } from "@/lib/constants";

/** Szybkie filtry gatunkowe — mapowane na slug kategorii w bazie (Strategia, Kooperacja, Imprezowe). */
export function CatalogGenreFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = searchParams.get("category") ?? "";

  const setCategory = (slug: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (slug && active === slug) {
      params.delete("category");
    } else if (slug) {
      params.set("category", slug);
    } else {
      params.delete("category");
    }
    params.delete("page");
    router.push(`/katalog?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-2" data-testid="catalog-genre-filters">
      <span className="sr-only">Filtry gatunkowe</span>
      {GENRE_CATEGORY_FILTERS.map(({ slug, label }) => {
        const selected = active === slug;
        return (
          <button
            key={slug}
            type="button"
            onClick={() => setCategory(slug)}
            aria-pressed={selected}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              selected
                ? "border-accent bg-accent/20 text-accent-foreground"
                : "border-border bg-secondary/50 text-muted-foreground hover:border-accent/40 hover:bg-accent/10 hover:text-foreground",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
