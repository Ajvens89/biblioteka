import Image from "next/image";
import Link from "next/link";
import { Users, Clock } from "lucide-react";
import type { Game, GameCopy, Category, Tag, Publisher, Designer, GameCategory, GameTag } from "@prisma/client";
import { DIFFICULTY_LABELS, GAME_TYPE_LABELS } from "@/lib/constants";
import { countAvailableCopies, getAvailabilityLabel } from "@/lib/games/availability";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

type GameWithRelations = Game & {
  copies: Pick<GameCopy, "status">[];
  categories: (GameCategory & { category: Category })[];
  tags: (GameTag & { tag: Tag })[];
  publisher: Publisher | null;
  designer: Designer | null;
};

const PLACEHOLDER = "/placeholder-game.svg";

export function GameCard({ game, showReserve = false }: { game: GameWithRelations; showReserve?: boolean }) {
  const available = countAvailableCopies(game.copies);
  const total = game.copies.length;
  const avail = getAvailabilityLabel(available, total);
  const category = game.categories[0]?.category.name;

  return (
    <Card
      className="flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md"
      data-testid="game-card"
      data-available={available > 0 ? "true" : "false"}
    >
      <div className="relative aspect-[4/3] bg-muted">
        <Image
          src={game.coverImageUrl || PLACEHOLDER}
          alt={game.title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 300px"
        />
        <Badge variant={avail.variant} className="absolute right-2 top-2">
          {avail.label}
        </Badge>
      </div>
      <CardContent className="flex flex-1 flex-col gap-2 pt-4">
        <h3 className="line-clamp-2 font-semibold leading-tight">{game.title}</h3>
        {category && <p className="text-xs text-muted-foreground">{category}</p>}
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {game.minPlayers}–{game.maxPlayers}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {game.minPlayTime}–{game.maxPlayTime} min
          </span>
        </div>
        <p className="text-xs">
          {GAME_TYPE_LABELS[game.type]} · {DIFFICULTY_LABELS[game.difficulty]} · {game.minAge}+
        </p>
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="outline" className="flex-1" asChild>
          <Link href={`/gry/${game.slug}`}>Szczegóły</Link>
        </Button>
        {showReserve && available > 0 && (
          <Button className="flex-1" asChild>
            <Link href={`/gry/${game.slug}#rezerwacja`}>Rezerwuj</Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
