import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
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
    <section className="space-y-8" aria-labelledby="available-games-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-4 w-4" aria-hidden />
            <span className="text-xs font-bold uppercase tracking-[0.16em]">Gotowe do gry</span>
          </div>
          <h2 id="available-games-heading" className="font-display text-h2 text-foreground">
            Dostępne teraz
          </h2>
          <p className="text-body max-w-xl text-muted-foreground">
            Gry z wolnym egzemplarzem — zarezerwuj online i odbierz w Fundacji.
          </p>
        </div>
        <Link
          href="/katalog?availability=available"
          className="zf-link-cta inline-flex items-center gap-2 text-sm font-semibold text-primary"
        >
          Zobacz wszystkie
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((game) => (
          <GameCard key={game.id} game={game} showReserve variant="catalog" />
        ))}
      </div>
    </section>
  );
}
