import type { CopyStatus, GameCopy } from "@prisma/client";

export function countAvailableCopies(copies: Pick<GameCopy, "status">[]) {
  return copies.filter((c) => c.status === "AVAILABLE").length;
}

export function getAvailabilityLabel(available: number, total: number) {
  if (total === 0) return { label: "Brak egzemplarzy", variant: "secondary" as const };
  if (available > 0) return { label: "Dostępna", variant: "success" as const };
  return { label: "Niedostępna", variant: "destructive" as const };
}

export const ACTIVE_COPY_STATUSES: CopyStatus[] = [
  "AVAILABLE",
  "RESERVED",
  "BORROWED",
];
