import Link from "next/link";
import { Clock, Users } from "lucide-react";
import type {
  Game,
  Category,
  Tag,
  Publisher,
  Designer,
  GameCategory,
  GameTag,
  GameCollectionType,
} from "@prisma/client";
import { Button } from "@/components/ui/button";
import { GameCover } from "@/components/ui/game-cover";
import { GameTypeBadge } from "@/components/ui/game-type-badge";
import { CatalogGameCard } from "@/components/games/catalog-game-card";
import { cn } from "@/lib/utils";
import { getPublicGameDescriptions } from "@/lib/games/public-descriptions";

type GameWithRelations = Game & {
  categories: (GameCategory & { category: Category })[];
  tags: (GameTag & { tag: Tag })[];
  publisher: Publisher | null;
  designer: Designer | null;
};

export function GameCard({
  game,
  variant = "default",
  className,
}: {
  game: GameWithRelations;
  showReserve?: boolean;
  variant?: "default" | "catalog";
  className?: string;
}) {
  const isBoard = game.collectionType !== "RPG";
  const collectionType = game.collectionType as GameCollectionType;

  if (variant === "catalog") {
    return (
      <CatalogGameCard
        slug={game.slug}
        title={game.title}
        isBoard={isBoard}
        minPlayers={game.minPlayers}
        maxPlayers={game.maxPlayers}
        maxPlayTime={game.maxPlayTime}
        minAge={game.minAge}
        coverImageUrl={game.coverImageUrl}
        collectionType={collectionType}
        publisherName={game.publisher?.name}
        className={className}
      />
    );
  }

  const publicDescriptions = getPublicGameDescriptions(game);
  const description = publicDescriptions.shortDescription || publicDescriptions.description;

  return (
    <article
      className={cn("card-elevated flex h-full max-w-full flex-col overflow-hidden", className)}
      data-testid="game-card"
    >
      <Link href={`/gry/${game.slug}`} className="relative block">
        <GameCover
          src={game.coverImageUrl}
          alt={`Okładka: ${game.title}`}
          collectionType={collectionType}
          className="rounded-none"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        <div className="space-y-2">
          <h3 className="text-h3 line-clamp-2 leading-snug">
            <Link href={`/gry/${game.slug}`} className="hover:text-primary">
              {game.title}
            </Link>
          </h3>
          <GameTypeBadge collectionType={collectionType} />
        </div>

        {game.publisher?.name ? <p className="text-small text-muted-foreground">{game.publisher.name}</p> : null}

        {isBoard && (
          <div className="text-small flex flex-wrap gap-3 text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" aria-hidden />
              {game.minPlayers}–{game.maxPlayers}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {game.minPlayTime}–{game.maxPlayTime} min
            </span>
            <span>{game.minAge}+</span>
          </div>
        )}

        {description && (
          <p className="text-small line-clamp-2 text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      <div className="flex gap-2 border-t border-border/60 p-4 pt-0">
        <Button variant="outline" className="min-h-11 flex-1" asChild>
          <Link href={`/gry/${game.slug}`}>Szczegóły</Link>
        </Button>
      </div>
    </article>
  );
}
