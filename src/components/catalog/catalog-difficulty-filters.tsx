"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { DIFFICULTY_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Difficulty } from "@prisma/client";

const QUICK_DIFFICULTIES: Difficulty[] = ["EASY", "MEDIUM", "HARD"];

export function CatalogDifficultyFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = searchParams.get("difficulty") ?? "";

  const setDifficulty = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && active === value) {
      params.delete("difficulty");
    } else if (value) {
      params.set("difficulty", value);
    } else {
      params.delete("difficulty");
    }
    params.delete("page");
    router.push(`/katalog?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-2" data-testid="catalog-difficulty-filters">
      <span className="sr-only">Filtr trudności</span>
      {QUICK_DIFFICULTIES.map((key) => {
        const selected = active === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => setDifficulty(key)}
            aria-pressed={selected}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              selected
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground",
            )}
          >
            {DIFFICULTY_LABELS[key]}
          </button>
        );
      })}
    </div>
  );
}
