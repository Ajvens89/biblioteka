"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Dices, LayoutGrid, Scroll } from "lucide-react";
import { CATALOG_COLLECTION_LABELS } from "@/lib/constants";
import type { GameCollectionType } from "@prisma/client";
import { cn } from "@/lib/utils";

type TabValue = "" | GameCollectionType;

const TABS: { value: TabValue; label: string; icon: typeof LayoutGrid }[] = [
  { value: "", label: "Wszystkie", icon: LayoutGrid },
  { value: "BOARD_GAME", label: CATALOG_COLLECTION_LABELS.BOARD_GAME, icon: Dices },
  { value: "RPG", label: CATALOG_COLLECTION_LABELS.RPG, icon: Scroll },
];

export function CatalogCategoryTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = (searchParams.get("collectionType") ?? "") as TabValue;

  const select = (value: TabValue) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("collectionType", value);
    else params.delete("collectionType");
    params.delete("page");
    router.push(`/katalog?${params.toString()}`);
  };

  return (
    <div
      className="flex flex-wrap gap-2"
      role="tablist"
      aria-label="Kategoria gry"
      data-testid="collection-type-filter"
    >
      {TABS.map(({ value, label, icon: Icon }) => {
        const active = current === value;
        return (
          <button
            key={value || "all"}
            type="button"
            role="tab"
            aria-selected={active}
            data-testid={
              value === "RPG"
                ? "collection-type-tab-rpg"
                : value === "BOARD_GAME"
                  ? "collection-type-tab-board"
                  : "collection-type-tab-all"
            }
            className={cn(
              "inline-flex min-h-10 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-secondary/60",
            )}
            onClick={() => select(value)}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}
