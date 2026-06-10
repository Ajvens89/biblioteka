import type { CopyStatus, GameCopy } from "@prisma/client";

export function countAvailableCopies(copies: Pick<GameCopy, "status">[]) {
  return copies.filter((c) => c.status === "AVAILABLE").length;
}

export function getAvailabilityLabel(available: number, total: number) {
  if (total === 0) return { label: "Brak egzemplarzy", variant: "secondary" as const };
  if (available > 0) return { label: "Dostępna", variant: "success" as const };
  return { label: "Niedostępna", variant: "destructive" as const };
}

/** Szczegółowy opis dostępności na kartach katalogu (np. „2 z 3 dostępne”). */
export function formatCopyAvailability(available: number, total: number): string {
  if (total === 0) return "Brak egzemplarzy w systemie";
  if (available > 0) return `${available} z ${total} dostępne`;
  return `0 z ${total} — niedostępna`;
}

export const ACTIVE_COPY_STATUSES: CopyStatus[] = [
  "AVAILABLE",
  "RESERVED",
  "BORROWED",
];
