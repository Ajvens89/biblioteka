import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GameCard } from "@/components/games/game-card";
import type { gameListInclude } from "@/lib/games/queries";
import type { Prisma } from "@prisma/client";

type Game = Prisma.GameGetPayload<{ include: typeof gameListInclude }>;

type Props = {
  games: Game[];
};

export function AvailableGamesSection({ games }: Props) {
  if (!games.length) return null;

  return (
    <section className="space-y-10" aria-labelledby="available-games-heading">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-2">
          <p className="text-eyebrow">Gotowe do wypożyczenia</p>
          <h2 id="available-games-heading" className="text-h2 text-foreground">
            Dostępne teraz
          </h2>
          <p className="text-body max-w-xl text-muted-foreground">
            Gry z wolnym egzemplarzem — zarezerwuj online i odbierz w fundacji.
          </p>
        </div>
        <Link
          href="/katalog?availability=available"
          className="zf-link-cta inline-flex items-center gap-2 text-sm"
        >
          Pełny katalog
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {games.map((game) => (
          <GameCard key={game.id} game={game} showReserve variant="catalog" />
        ))}
      </div>
    </section>
  );
}
