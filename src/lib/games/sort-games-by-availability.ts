import { countAvailableCopies } from "@/lib/games/availability";

type GameWithCopyStatuses = {
  id: string;
  title: string;
  copies: { status: string }[];
};

/** Sortuje malejąco po liczbie egzemplarzy AVAILABLE, potem tytuł A–Z. */
export function sortGamesByAvailableCopies<T extends GameWithCopyStatuses>(games: T[]): T[] {
  return [...games].sort((a, b) => {
    const diff = countAvailableCopies(b.copies) - countAvailableCopies(a.copies);
    if (diff !== 0) return diff;
    return a.title.localeCompare(b.title, "pl");
  });
}

export function paginateIds(ids: string[], page: number, pageSize: number): string[] {
  const skip = (page - 1) * pageSize;
  return ids.slice(skip, skip + pageSize);
}
