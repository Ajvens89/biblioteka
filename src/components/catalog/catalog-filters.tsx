"use client";

import { useState } from "react";
import { ChevronDown, Dices, LayoutGrid, Scroll } from "lucide-react";
import type { GameCollectionType } from "@prisma/client";
import {
  CATALOG_COLLECTION_LABELS,
  DIFFICULTY_LABELS,
  GAME_TYPE_LABELS,
} from "@/lib/constants";
import type {
  CatalogFilterValues,
  CatalogOptionLists,
} from "@/lib/games/catalog-filters";
import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Patch = Record<string, string | null>;

type Props = {
  values: CatalogFilterValues;
  onChange: (patch: Patch) => void;
  lists: CatalogOptionLists;
  idPrefix?: string;
  /** Rozwiń sekcję dodatkową od razu (np. w panelu mobilnym). */
  defaultMoreOpen?: boolean;
};

const COLLECTION_TABS: { value: "" | GameCollectionType; label: string; icon: typeof LayoutGrid; testId: string }[] = [
  { value: "", label: "Wszystkie", icon: LayoutGrid, testId: "collection-type-tab-all" },
  { value: "BOARD_GAME", label: CATALOG_COLLECTION_LABELS.BOARD_GAME, icon: Dices, testId: "collection-type-tab-board" },
  { value: "RPG", label: CATALOG_COLLECTION_LABELS.RPG, icon: Scroll, testId: "collection-type-tab-rpg" },
];

const numberInputClass =
  "h-10 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background";

export function CatalogFilters({
  values,
  onChange,
  lists,
  idPrefix = "",
  defaultMoreOpen = false,
}: Props) {
  const hasMoreActive = Boolean(
    values.category || values.tag || values.publisher || values.designer || values.type,
  );
  const [moreOpen, setMoreOpen] = useState(defaultMoreOpen || hasMoreActive);

  const isRpg = values.collectionType === "RPG";

  const commitNumber = (key: string, raw: string) => {
    const trimmed = raw.trim();
    onChange({ [key]: trimmed === "" ? null : trimmed });
  };

  return (
    <div className="space-y-5" data-testid="catalog-filters">
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-foreground">Typ zbioru</legend>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Typ zbioru" data-testid="collection-type-filter">
          {COLLECTION_TABS.map(({ value, label, icon: Icon, testId }) => {
            const active = (values.collectionType ?? "") === value;
            return (
              <button
                key={value || "all"}
                type="button"
                aria-pressed={active}
                data-testid={testId}
                onClick={() => onChange({ collectionType: value || null })}
                className={cn(
                  "inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-secondary/50",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                {label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-foreground">Dostępność</legend>
        <div className="flex gap-2" role="group" aria-label="Dostępność">
          {[
            { value: "", label: "Wszystkie" },
            { value: "available", label: "Tylko dostępne" },
          ].map((opt) => {
            const active = (values.availability ?? "") === opt.value;
            return (
              <button
                key={opt.value || "all"}
                type="button"
                aria-pressed={active}
                data-testid={opt.value === "available" ? "availability-filter-available" : "availability-filter-all"}
                onClick={() => onChange({ availability: opt.value || null })}
                className={cn(
                  "inline-flex min-h-10 flex-1 items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                  active
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground",
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {!isRpg && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-foreground">Gracze i czas</legend>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor={`${idPrefix}minPlayers`} className="text-xs text-muted-foreground">
                Min graczy
              </Label>
              <input
                key={`${idPrefix}minPlayers-${values.minPlayers ?? ""}`}
                id={`${idPrefix}minPlayers`}
                type="number"
                inputMode="numeric"
                min={1}
                className={numberInputClass}
                defaultValue={values.minPlayers ?? ""}
                onBlur={(e) => commitNumber("minPlayers", e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${idPrefix}maxPlayers`} className="text-xs text-muted-foreground">
                Max graczy
              </Label>
              <input
                key={`${idPrefix}maxPlayers-${values.maxPlayers ?? ""}`}
                id={`${idPrefix}maxPlayers`}
                type="number"
                inputMode="numeric"
                min={1}
                className={numberInputClass}
                defaultValue={values.maxPlayers ?? ""}
                onBlur={(e) => commitNumber("maxPlayers", e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${idPrefix}maxPlayTime`} className="text-xs text-muted-foreground">
                Maks. czas (min)
              </Label>
              <input
                key={`${idPrefix}maxPlayTime-${values.maxPlayTime ?? ""}`}
                id={`${idPrefix}maxPlayTime`}
                type="number"
                inputMode="numeric"
                min={1}
                className={numberInputClass}
                defaultValue={values.maxPlayTime ?? ""}
                onBlur={(e) => commitNumber("maxPlayTime", e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${idPrefix}minAge`} className="text-xs text-muted-foreground">
                Wiek od (lat)
              </Label>
              <input
                key={`${idPrefix}minAge-${values.minAge ?? ""}`}
                id={`${idPrefix}minAge`}
                type="number"
                inputMode="numeric"
                min={0}
                className={numberInputClass}
                defaultValue={values.minAge ?? ""}
                onBlur={(e) => commitNumber("minAge", e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
              />
            </div>
          </div>
        </fieldset>
      )}

      {!isRpg && (
        <fieldset className="space-y-2" data-testid="catalog-difficulty-filters">
          <legend className="text-sm font-semibold text-foreground">Trudność</legend>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(DIFFICULTY_LABELS) as (keyof typeof DIFFICULTY_LABELS)[]).map((key) => {
              const active = values.difficulty === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChange({ difficulty: active ? null : key })}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                    active
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground",
                  )}
                >
                  {DIFFICULTY_LABELS[key]}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="border-t border-border pt-4">
        <button
          type="button"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          data-testid="catalog-more-filters-toggle"
        >
          Więcej filtrów
          <ChevronDown
            className={cn("h-4 w-4 transition-transform duration-200", moreOpen && "rotate-180")}
            aria-hidden
          />
        </button>

        {moreOpen && (
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}category`}>Kategoria</Label>
              <Combobox
                id={`${idPrefix}category`}
                ariaLabel="Kategoria"
                placeholder="Wszystkie kategorie"
                searchPlaceholder="Szukaj kategorii…"
                emptyText="Brak kategorii"
                value={values.category}
                onChange={(v) => onChange({ category: v || null })}
                options={lists.categories.map((c) => ({ value: c.slug, label: c.name }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}tag`}>Tag</Label>
              <Combobox
                id={`${idPrefix}tag`}
                ariaLabel="Tag"
                placeholder="Wszystkie tagi"
                searchPlaceholder="Szukaj tagu…"
                emptyText="Brak tagów"
                value={values.tag}
                onChange={(v) => onChange({ tag: v || null })}
                options={lists.tags.map((t) => ({ value: t.slug, label: t.name }))}
              />
            </div>

            {lists.publishers.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}publisher`}>Wydawca</Label>
                <Combobox
                  id={`${idPrefix}publisher`}
                  ariaLabel="Wydawca"
                  placeholder="Wszyscy wydawcy"
                  searchPlaceholder="Szukaj wydawcy…"
                  emptyText="Brak wydawców"
                  value={values.publisher}
                  onChange={(v) => onChange({ publisher: v || null })}
                  options={lists.publishers.map((p) => ({ value: p.slug, label: p.name }))}
                />
              </div>
            )}

            {lists.designers.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}designer`}>Autor</Label>
                <Combobox
                  id={`${idPrefix}designer`}
                  ariaLabel="Autor"
                  placeholder="Wszyscy autorzy"
                  searchPlaceholder="Szukaj autora…"
                  emptyText="Brak autorów"
                  value={values.designer}
                  onChange={(v) => onChange({ designer: v || null })}
                  options={lists.designers.map((d) => ({ value: d.slug, label: d.name }))}
                />
              </div>
            )}

            {!isRpg && (
              <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}type`}>Rodzaj gry</Label>
                <select
                  id={`${idPrefix}type`}
                  className={numberInputClass}
                  value={values.type ?? ""}
                  onChange={(e) => onChange({ type: e.target.value || null })}
                >
                  <option value="">Wszystkie</option>
                  {Object.entries(GAME_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
