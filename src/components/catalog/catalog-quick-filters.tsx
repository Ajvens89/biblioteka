"use client";

import { useSearchParams } from "next/navigation";
import { CatalogGenreFilters } from "@/components/catalog/catalog-genre-filters";
import { CatalogDifficultyFilters } from "@/components/catalog/catalog-difficulty-filters";

/** Gatunek i trudność — tylko dla planszówek (ukryte przy zakładce RPG). */
export function CatalogQuickFilters() {
  const searchParams = useSearchParams();
  const collectionType = searchParams.get("collectionType");
  const isRpg = collectionType === "RPG";

  if (isRpg) return null;

  return (
    <>
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Gatunek</p>
        <CatalogGenreFilters />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Trudność</p>
        <CatalogDifficultyFilters />
      </div>
    </>
  );
}
