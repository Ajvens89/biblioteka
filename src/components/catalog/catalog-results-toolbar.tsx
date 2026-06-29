"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown } from "lucide-react";
import { GAME_SORT_LABELS } from "@/lib/constants";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  total: number;
  query?: string;
};

function gamesWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (n === 1) return "grę";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "gry";
  return "gier";
}

export function CatalogResultsToolbar({ total, query }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const sort = searchParams.get("sort") ?? "title";

  const onSort = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "title") params.set("sort", value);
    else params.delete("sort");
    params.delete("page");
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `/katalog?${qs}` : "/katalog", { scroll: false });
    });
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p
        className={cn("text-small text-muted-foreground transition-opacity", isPending && "opacity-60")}
        aria-live="polite"
        data-testid="catalog-result-count"
      >
        Znaleziono <strong className="text-foreground">{total}</strong> {gamesWord(total)}
        {query ? (
          <>
            {" "}
            dla <span className="font-medium text-foreground">„{query}”</span>
          </>
        ) : null}
      </p>

      <div className="flex items-center gap-2">
        <ArrowUpDown className="h-4 w-4 text-muted-foreground" aria-hidden />
        <Label htmlFor="catalog-sort" className="sr-only">
          Sortowanie wyników
        </Label>
        <select
          id="catalog-sort"
          data-testid="catalog-sort"
          className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
          value={sort}
          onChange={(e) => onSort(e.target.value)}
        >
          {Object.entries(GAME_SORT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
