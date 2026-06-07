"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { GameFilterInput } from "@/lib/validations/game";
import { Label } from "@/components/ui/label";

const selectClass =
  "h-10 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm";

export function CatalogTopFilters({ current }: { current: GameFilterInput }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const update = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`/katalog?${params.toString()}`);
  };

  return (
    <div
      className="grid gap-3 sm:grid-cols-2"
      data-testid="catalog-top-filters"
    >
      <div className="min-w-0 space-y-1">
        <Label htmlFor="top-availability" className="text-xs font-medium">
          Dostępność egzemplarza
        </Label>
        <select
          id="top-availability"
          data-testid="availability-filter"
          className={selectClass}
          value={current.availability === "available" ? "available" : ""}
          onChange={(e) =>
            update("availability", e.target.value === "available" ? "available" : "")
          }
        >
          <option value="">Wszystkie</option>
          <option value="available">Tylko dostępne</option>
        </select>
      </div>
      <div className="min-w-0 space-y-1">
        <Label htmlFor="top-sort" className="text-xs font-medium">
          Kolejność wyników
        </Label>
        <select
          id="top-sort"
          data-testid="catalog-sort"
          className={selectClass}
          value={current.sort ?? "title"}
          onChange={(e) => update("sort", e.target.value)}
        >
          <option value="title">Tytuł A–Z</option>
          <option value="newest">Najnowsze</option>
          <option value="popular">Najpopularniejsze</option>
          <option value="available">Dostępne najpierw</option>
        </select>
      </div>
    </div>
  );
}
