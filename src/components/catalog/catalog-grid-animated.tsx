"use client";

import { GameCard } from "@/components/games/game-card";
import type { GameListItem } from "@/lib/games/queries";

type Props = {
  items: GameListItem[];
  showReserve?: boolean;
};

export function CatalogGridAnimated({ items, showReserve = false }: Props) {
  const itemsKey = items.map((g) => g.id).join(",");

  return (
    <div key={itemsKey} className="zf-catalog-grid catalog-grid-enter" data-testid="catalog-grid">
      {items.map((game) => (
        <GameCard key={game.id} game={game} showReserve={showReserve} variant="catalog" />
      ))}
    </div>
  );
}
