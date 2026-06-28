"use client";

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
  if (!games.length) return null;

  return (
    <section className="zf-section-available" aria-labelledby="available-games-heading">
      <MotionReveal variant="fade-up">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border/80 pb-8">
          <div className="space-y-2">
            <p className="text-eyebrow">Gotowe do wypożyczenia</p>
            <h2 id="available-games-heading" className="text-h2 text-foreground">
              Dostępne teraz
            </h2>
            <p className="text-body max-w-xl text-muted-foreground">
              Gry z wolnym egzemplarzem — zarezerwuj online i odbierz w fundacji.
            </p>
          </div>
          <Button variant="ghost" className="text-primary hover:text-primary" asChild>
            <Link href="/katalog?availability=available">
              Zobacz cały katalog
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </MotionReveal>

      <MotionReveal variant="stagger-container" className="zf-catalog-grid mt-10">
        {games.map((game, index) => (
          <MotionStaggerItem key={game.id} index={index}>
            <GameCard game={game} showReserve variant="catalog" />
          </MotionStaggerItem>
        ))}
      </MotionReveal>
    </section>
  );
}
