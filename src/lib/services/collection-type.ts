import type { GameCollectionType } from "@prisma/client";

const BOARD_ALIASES = new Set([
  "board_game",
  "board",
  "boardgame",
  "planszowa",
  "planszowe",
  "gry planszowe",
  "gra planszowa",
]);

const RPG_ALIASES = new Set([
  "rpg",
  "fabularna",
  "fabularne",
  "gry fabularne",
  "gra fabularna",
  "role-playing",
  "roleplaying",
]);

/** Mapuje wartość z CSV / formularza na enum Prisma. */
export function parseCollectionType(raw: string | undefined | null): GameCollectionType {
  if (!raw?.trim()) return "BOARD_GAME";
  const key = raw.trim().toLowerCase();
  if (key === "board_game" || key === "boardgame") return "BOARD_GAME";
  if (key === "rpg") return "RPG";
  if (BOARD_ALIASES.has(key)) return "BOARD_GAME";
  if (RPG_ALIASES.has(key)) return "RPG";
  throw new Error(`Nieznany typ zbioru: ${raw}`);
}

export function collectionTypeLabel(type: GameCollectionType): string {
  return type === "RPG" ? "Gry fabularne" : "Gry planszowe";
}
