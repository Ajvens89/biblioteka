import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GameCard } from "@/components/games/game-card";
import { MotionReveal, MotionStaggerItem } from "@/components/ui/motion-reveal";
import { Button } from "@/components/ui/button";
import type { gameListInclude } from "@/lib/games/queries";
import type { Prisma } from "@prisma/client";

type Game = Prisma.GameGetPayload<{ include: typeof gameListInclude }>;

type Props = {
  games: Game[];
};

export function AvailableGamesSection({ games }: Props) {
  return (
    <section className="zf-section-available" aria-labelledby="available-games-heading">
      <MotionReveal variant="fade-up">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border/80 pb-8">
          <div className="space-y-2">
            <p className="text-eyebrow">Z katalogu</p>
            <h2 id="available-games-heading" className="text-h2 text-foreground">
              Wybrane tytuły
            </h2>
            <p className="text-body max-w-xl text-muted-foreground">
              Przeglądaj zbiór gier. Informacje o wypożyczeniu uzyskasz mailowo od fundacji.
            </p>
          </div>
          <Button variant="ghost" className="text-primary hover:text-primary" asChild>
            <Link href="/katalog">
              Zobacz cały katalog
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </MotionReveal>

      {games.length === 0 ? (
        <MotionReveal variant="fade-up" className="mt-10">
          <div
            className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-6 py-12 text-center"
            data-testid="home-available-empty"
          >
            <p className="text-body text-muted-foreground">
              Brak wyróżnionych tytułów — zajrzyj do pełnego katalogu.
            </p>
            <Button className="mt-4" asChild>
              <Link href="/katalog">Przeglądaj katalog</Link>
            </Button>
          </div>
        </MotionReveal>
      ) : (
        <MotionReveal variant="stagger-container" className="zf-catalog-grid mt-10">
          {games.map((game, index) => (
            <MotionStaggerItem key={game.id} index={index}>
              <GameCard game={game} variant="catalog" />
            </MotionStaggerItem>
          ))}
        </MotionReveal>
      )}
    </section>
  );
}
