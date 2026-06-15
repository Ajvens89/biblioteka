import type { GameCollectionType, GameType } from "@prisma/client";

/** Rodzaj gry (enum Prisma) na podstawie typu zbioru i kategorii hurtowni. */
export function inferGameType(
  collectionType: GameCollectionType,
  categoryHint = "",
): GameType {
  const h = categoryHint.toLowerCase();
  if (collectionType === "RPG") return "RPG";
  if (h.includes("karcian") || h.includes(" card")) return "CARD";
  if (h.includes("bitew") || h.includes("wargame")) return "WARGAME";
  if (h.includes("imprez") || h.includes("party")) return "PARTY";
  if (h.includes("rodzin") || h.includes("family")) return "FAMILY";
  if (h.includes("eduk")) return "EDUCATIONAL";
  return "BOARD";
}

/** ISBN 978/979 → RPG; pozostałe EAN → planszówka. */
export function inferCollectionTypeFromEan(normalizedEan: string): GameCollectionType {
  const digits = normalizedEan.replace(/\D/g, "");
  if (digits.length === 13 && (digits.startsWith("978") || digits.startsWith("979"))) {
    return "RPG";
  }
  return "BOARD_GAME";
}
