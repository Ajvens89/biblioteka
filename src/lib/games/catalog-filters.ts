import type { Category, Designer, Publisher, Tag } from "@prisma/client";
import {
  CATALOG_COLLECTION_LABELS,
  DIFFICULTY_LABELS,
  GAME_TYPE_LABELS,
} from "@/lib/constants";
import type { GameFilterInput } from "@/lib/validations/game";

/** Parametry sterowane przez panel filtrów (bez wyszukiwarki, sortowania i paginacji). */
export const CATALOG_FILTER_KEYS = [
  "collectionType",
  "availability",
  "minPlayers",
  "maxPlayers",
  "maxPlayTime",
  "minAge",
  "difficulty",
  "category",
  "type",
  "tag",
  "publisher",
  "designer",
] as const;

export type CatalogFilterKey = (typeof CATALOG_FILTER_KEYS)[number];

/** Klucze, które nigdy nie są filtrami katalogu (wyszukiwarka / sterowanie listą). */
const NON_FILTER_KEYS = new Set(["q", "ean", "sort", "page", "pageSize"]);

export type CatalogFilterValues = Partial<Record<CatalogFilterKey, string>>;

export type CatalogOptionLists = {
  categories: Pick<Category, "slug" | "name">[];
  tags: Pick<Tag, "slug" | "name">[];
  publishers: Pick<Publisher, "slug" | "name">[];
  designers: Pick<Designer, "slug" | "name">[];
};

/** Odczyt wartości filtrów z URLSearchParams (jedno źródło prawdy). */
export function readFilterValues(params: URLSearchParams): CatalogFilterValues {
  const values: CatalogFilterValues = {};
  for (const key of CATALOG_FILTER_KEYS) {
    const raw = params.get(key);
    if (raw && raw.trim()) values[key] = raw;
  }
  if (values.availability && values.availability !== "available") {
    delete values.availability;
  }
  return values;
}

/** Liczba aktywnych filtrów panelu (na potrzeby przycisku „Filtry · N”). */
export function countActiveFilters(params: URLSearchParams): number {
  return Object.keys(readFilterValues(params)).length;
}

/** Klucze, które przy obecności wpływają na liczbę pasujących pozycji. */
const COUNTABLE_KEYS = new Set<string>([...CATALOG_FILTER_KEYS, "q", "ean"]);

/**
 * Czy URL zawiera aktywny filtr lub frazę wyszukiwania.
 * Ignoruje nieznane parametry (np. utm_*, cache-bust), aby nagłówek nie
 * przełączał się błędnie na „X z Y” przy linkach z dopiskami.
 */
export function hasAnyActiveParam(params: URLSearchParams): boolean {
  for (const [key, value] of params.entries()) {
    if (!COUNTABLE_KEYS.has(key)) continue;
    if (key === "availability" && value !== "available") continue;
    if (value && value.trim()) return true;
  }
  return false;
}

function lookup(
  list: { slug: string; name: string }[],
  slug: string,
): string {
  return list.find((item) => item.slug === slug)?.name ?? slug;
}

export type CatalogChip = {
  /** Klucze URL usuwane razem z chipem. */
  keys: CatalogFilterKey[];
  label: string;
  srLabel: string;
};

/**
 * Buduje czytelne chipy aktywnych filtrów (nazwy zamiast slugów/enumów).
 * Wyszukiwarka (q/ean) celowo pominięta — jest pokazywana w pasku wyników.
 */
export function buildFilterChips(
  values: CatalogFilterValues,
  lists: CatalogOptionLists,
): CatalogChip[] {
  const chips: CatalogChip[] = [];

  if (values.collectionType) {
    const label =
      CATALOG_COLLECTION_LABELS[
        values.collectionType as keyof typeof CATALOG_COLLECTION_LABELS
      ] ?? values.collectionType;
    chips.push({ keys: ["collectionType"], label, srLabel: `Typ: ${label}` });
  }

  if (values.availability === "available") {
    chips.push({
      keys: ["availability"],
      label: "Dostępne teraz",
      srLabel: "Dostępność: dostępne teraz",
    });
  }

  const min = values.minPlayers;
  const max = values.maxPlayers;
  if (min || max) {
    let value: string;
    if (min && max) value = min === max ? `${min}` : `${min}–${max}`;
    else if (min) value = `od ${min}`;
    else value = `do ${max}`;
    chips.push({
      keys: ["minPlayers", "maxPlayers"],
      label: `Gracze: ${value}`,
      srLabel: `Liczba graczy: ${value}`,
    });
  }

  if (values.maxPlayTime) {
    chips.push({
      keys: ["maxPlayTime"],
      label: `Czas: do ${values.maxPlayTime} min`,
      srLabel: `Czas gry: do ${values.maxPlayTime} minut`,
    });
  }

  if (values.minAge) {
    chips.push({
      keys: ["minAge"],
      label: `Wiek: od ${values.minAge} lat`,
      srLabel: `Wiek: od ${values.minAge} lat`,
    });
  }

  if (values.difficulty) {
    const label =
      DIFFICULTY_LABELS[values.difficulty as keyof typeof DIFFICULTY_LABELS] ??
      values.difficulty;
    chips.push({
      keys: ["difficulty"],
      label: `Trudność: ${label}`,
      srLabel: `Trudność: ${label}`,
    });
  }

  if (values.category) {
    const name = lookup(lists.categories, values.category);
    chips.push({ keys: ["category"], label: `Kategoria: ${name}`, srLabel: `Kategoria: ${name}` });
  }

  if (values.type) {
    const label =
      GAME_TYPE_LABELS[values.type as keyof typeof GAME_TYPE_LABELS] ?? values.type;
    chips.push({ keys: ["type"], label: `Rodzaj: ${label}`, srLabel: `Rodzaj gry: ${label}` });
  }

  if (values.tag) {
    const name = lookup(lists.tags, values.tag);
    chips.push({ keys: ["tag"], label: `Tag: ${name}`, srLabel: `Tag: ${name}` });
  }

  if (values.publisher) {
    const name = lookup(lists.publishers, values.publisher);
    chips.push({ keys: ["publisher"], label: `Wydawca: ${name}`, srLabel: `Wydawca: ${name}` });
  }

  if (values.designer) {
    const name = lookup(lists.designers, values.designer);
    chips.push({ keys: ["designer"], label: `Autor: ${name}`, srLabel: `Autor: ${name}` });
  }

  return chips;
}

/** Buduje query string katalogu z bieżących parametrów + łatki zmian. */
export function buildCatalogQuery(
  params: URLSearchParams,
  patch: Record<string, string | null | undefined>,
): string {
  const next = new URLSearchParams(params.toString());
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === undefined || value === "") next.delete(key);
    else next.set(key, value);
  }
  next.delete("page");
  return next.toString();
}

/** Usuwa wszystkie filtry panelu, zachowując frazę wyszukiwania i sortowanie. */
export function clearFiltersQuery(params: URLSearchParams): string {
  const next = new URLSearchParams(params.toString());
  for (const key of CATALOG_FILTER_KEYS) next.delete(key);
  next.delete("page");
  return next.toString();
}

export { NON_FILTER_KEYS };

export type { GameFilterInput };
