import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GameCard } from "@/components/games/game-card";
import { Button } from "@/components/ui/button";
import type { gameListInclude } from "@/lib/games/queries";
import type { Prisma } from "@prisma/client";

type Game = Prisma.GameGetPayload<{ include: typeof gameListInclude }>;

type Props = {
  title: string;
  description?: string;
  href: string;
  games: Game[];
  showReserve?: boolean;
};

export function GameSection({ title, description, href, games, showReserve }: Props) {
  if (!games.length) return null;
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-h2">{title}</h2>
          {description && <p className="text-body mt-1 text-muted-foreground">{description}</p>}
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={href}>
            Zobacz więcej
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((game) => (
          <GameCard key={game.id} game={game} showReserve={showReserve} />
        ))}
      </div>
    </section>
  );
}
