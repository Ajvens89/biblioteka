"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import {
  CATALOG_COLLECTION_LABELS,
  DIFFICULTY_LABELS,
  GAME_SORT_LABELS,
  GAME_TYPE_LABELS,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";

const LABELS: Record<string, (v: string) => string> = {
  q: (v) => `Szukaj: ${v}`,
  ean: (v) => `EAN: ${v}`,
  collectionType: (v) =>
    CATALOG_COLLECTION_LABELS[v as keyof typeof CATALOG_COLLECTION_LABELS] ?? v,
  availability: (v) => (v === "available" ? "Tylko dostępne" : v),
  category: (v) => `Kategoria: ${v}`,
  tag: (v) => `Tag: ${v}`,
  type: (v) => GAME_TYPE_LABELS[v as keyof typeof GAME_TYPE_LABELS] ?? v,
  difficulty: (v) => DIFFICULTY_LABELS[v as keyof typeof DIFFICULTY_LABELS] ?? v,
  minPlayers: (v) => `Min. ${v} graczy`,
  maxPlayers: (v) => `Max. ${v} graczy`,
  minAge: (v) => `Wiek ${v}+`,
  maxPlayTime: (v) => `Do ${v} min`,
  publisher: (v) => `Wydawca: ${v}`,
  designer: (v) => `Autor: ${v}`,
  sort: (v) => GAME_SORT_LABELS[v] ?? `Sort: ${v}`,
};

const SKIP = new Set(["page", "pageSize"]);

export function CatalogFilterChips() {
  const searchParams = useSearchParams();
  const entries = [...searchParams.entries()].filter(([k, v]) => {
    if (!v || SKIP.has(k)) return false;
    if (k === "availability" && v !== "available") return false;
    return true;
  });

  const chips = entries
    .map(([key, value]) => {
      if (key === "availability" && value !== "available") return null;
      const labelFn = LABELS[key];
      return { key, value, label: labelFn ? labelFn(value) : `${key}: ${value}` };
    })
    .filter(Boolean) as { key: string; value: string; label: string }[];

  if (chips.length === 0) return null;

  const removeKey = (key: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    if (key === "q") params.delete("ean");
    params.delete("page");
    return `/katalog?${params.toString()}`;
  };

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="catalog-filter-chips">
      {chips.map(({ key, label }) => (
        <Link
          key={key}
          href={removeKey(key)}
          className="inline-flex items-center gap-1 rounded-full border bg-secondary/50 px-3 py-1 text-xs font-medium hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {label}
          <X className="h-3 w-3" aria-hidden />
          <span className="sr-only">Usuń filtr {label}</span>
        </Link>
      ))}
      <Button variant="ghost" size="sm" asChild className="focus-visible:ring-2 focus-visible:ring-ring">
        <Link href="/katalog">Wyczyść wszystkie filtry</Link>
      </Button>
    </div>
  );
}
