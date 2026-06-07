import type { GameCollectionType } from "@prisma/client";

/** Gra do podglądu na landingu — dane z bazy (lub fallback oznaczony w kodzie). */
export type ShowcaseGame = {
  id: string;
  title: string;
  slug: string;
  coverImageUrl: string | null;
  collectionType: GameCollectionType;
  minPlayers: number;
  maxPlayers: number;
  minPlayTime: number;
  maxPlayTime: number;
  minAge: number;
  categoryLabel?: string | null;
};

/** @deprecated Użyj ShowcaseGame */
export type HeroShowcaseGame = ShowcaseGame;
