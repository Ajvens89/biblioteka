"use client";

import { useEffect, useState } from "react";
import { GameCard } from "@/components/games/game-card";
import type { GameListItem } from "@/lib/games/queries";

type Props = {
  items: GameListItem[];
  showReserve?: boolean;
};

export function CatalogGridAnimated({ items, showReserve = false }: Props) {
  const [gridKey, setGridKey] = useState(0);
  const itemsKey = items.map((g) => g.id).join(",");

  useEffect(() => {
    setGridKey((k) => k + 1);
  }, [itemsKey]);

  return (
    <div key={gridKey} className="zf-catalog-grid catalog-grid-enter" data-testid="catalog-grid">
      {items.map((game) => (
        <GameCard key={game.id} game={game} showReserve={showReserve} variant="catalog" />
      ))}
    </div>
  );
}
