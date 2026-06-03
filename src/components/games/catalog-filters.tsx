"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Category, Tag } from "@prisma/client";
import { DIFFICULTY_LABELS, GAME_TYPE_LABELS } from "@/lib/constants";
import type { GameFilterInput } from "@/lib/validations/game";

export function CatalogFilters({
  categories,
  tags,
  current,
}: {
  categories: Category[];
  tags: Tag[];
  current: GameFilterInput;
}) {
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
    <div className="flex flex-wrap gap-2">
      <select
        className="h-9 rounded-md border bg-background px-2 text-sm"
        value={current.sort ?? "title"}
        onChange={(e) => update("sort", e.target.value)}
      >
        <option value="title">Tytuł A–Z</option>
        <option value="newest">Najnowsze</option>
        <option value="popular">Najpopularniejsze</option>
        <option value="available">Dostępne najpierw</option>
      </select>

      <select
        className="h-9 rounded-md border bg-background px-2 text-sm"
        value={current.category ?? ""}
        onChange={(e) => update("category", e.target.value)}
      >
        <option value="">Wszystkie kategorie</option>
        {categories.map((c) => (
          <option key={c.id} value={c.slug}>
            {c.name}
          </option>
        ))}
      </select>

      <select
        className="h-9 rounded-md border bg-background px-2 text-sm"
        value={current.type ?? ""}
        onChange={(e) => update("type", e.target.value)}
      >
        <option value="">Wszystkie typy</option>
        {Object.entries(GAME_TYPE_LABELS).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>

      <select
        className="h-9 rounded-md border bg-background px-2 text-sm"
        value={current.difficulty ?? ""}
        onChange={(e) => update("difficulty", e.target.value)}
      >
        <option value="">Trudność</option>
        {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>

      <select
        className="h-9 rounded-md border bg-background px-2 text-sm"
        value={current.availability ?? "all"}
        onChange={(e) => update("availability", e.target.value === "all" ? "" : e.target.value)}
      >
        <option value="">Wszystkie</option>
        <option value="available">Tylko dostępne</option>
      </select>

      <select
        className="h-9 rounded-md border bg-background px-2 text-sm"
        value={current.tag ?? ""}
        onChange={(e) => update("tag", e.target.value)}
      >
        <option value="">Tag</option>
        {tags.map((t) => (
          <option key={t.id} value={t.slug}>
            {t.name}
          </option>
        ))}
      </select>
    </div>
  );
}
