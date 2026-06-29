"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import {
  buildFilterChips,
  readFilterValues,
  type CatalogOptionLists,
} from "@/lib/games/catalog-filters";

type Props = { lists: CatalogOptionLists };

export function CatalogActiveChips({ lists }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const params = new URLSearchParams(searchParams.toString());
  const values = readFilterValues(params);
  const chips = buildFilterChips(values, lists);

  if (chips.length === 0) return null;

  const removeKeys = (keys: string[]) => {
    const next = new URLSearchParams(searchParams.toString());
    keys.forEach((key) => next.delete(key));
    next.delete("page");
    const qs = next.toString();
    startTransition(() => {
      router.push(qs ? `/katalog?${qs}` : "/katalog", { scroll: false });
    });
  };

  const clearAll = () => {
    const next = new URLSearchParams(searchParams.toString());
    chips.forEach((chip) => chip.keys.forEach((key) => next.delete(key)));
    next.delete("page");
    const qs = next.toString();
    startTransition(() => {
      router.push(qs ? `/katalog?${qs}` : "/katalog", { scroll: false });
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="catalog-filter-chips">
      {chips.map((chip) => (
        <button
          key={chip.keys.join("-")}
          type="button"
          onClick={() => removeKeys(chip.keys)}
          className="zf-chip"
        >
          <span>{chip.label}</span>
          <X className="h-3.5 w-3.5" aria-hidden />
          <span className="sr-only">Usuń filtr: {chip.srLabel}</span>
        </button>
      ))}
      <button
        type="button"
        onClick={clearAll}
        className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        data-testid="catalog-clear-all"
      >
        Wyczyść wszystkie
      </button>
    </div>
  );
}
