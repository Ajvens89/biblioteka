import Link from "next/link";
import { Clock, Users } from "lucide-react";
import type {
  Game,
  GameCopy,
  Category,
  Tag,
  Publisher,
  Designer,
  GameCategory,
  GameTag,
  GameCollectionType,
} from "@prisma/client";
import { countAvailableCopies, getAvailabilityLabel } from "@/lib/games/availability";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GameCover } from "@/components/ui/game-cover";
import { GameTypeBadge } from "@/components/ui/game-type-badge";
import { cn } from "@/lib/utils";

type GameWithRelations = Game & {
  copies: Pick<GameCopy, "status">[];
  categories: (GameCategory & { category: Category })[];
  tags: (GameTag & { tag: Tag })[];
  publisher: Publisher | null;
  designer: Designer | null;
};

export function GameCard({
  game,
  showReserve = false,
  variant = "default",
  className,
}: {
  game: GameWithRelations;
  showReserve?: boolean;
  variant?: "default" | "catalog";
  className?: string;
}) {
  const available = countAvailableCopies(game.copies);
  const total = game.copies.length;
  const avail = getAvailabilityLabel(available, total);
  const isBoard = game.collectionType !== "RPG";
  const collectionType = game.collectionType as GameCollectionType;
  const isCatalog = variant === "catalog";

  if (isCatalog) {
    return (
      <article
        className={cn("zf-game-card group flex h-full flex-col overflow-hidden", className)}
        data-testid="game-card"
        data-available={available > 0 ? "true" : "false"}
      >
        <Link href={`/gry/${game.slug}`} className="relative block">
          <GameCover
            src={game.coverImageUrl}
            alt={`Okładka: ${game.title}`}
            collectionType={collectionType}
            aspect="portrait"
            className="rounded-none"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
          />
          <Badge
            variant={avail.variant}
            className="absolute right-2.5 top-2.5 text-[0.6875rem] shadow-none"
            aria-label={`Status: ${avail.label}`}
          >
            {avail.label}
          </Badge>
        </Link>

        <div className="flex flex-1 flex-col gap-2.5 p-4">
          <div className="space-y-1.5">
            <h3 className="font-display line-clamp-2 text-base leading-snug">
              <Link
                href={`/gry/${game.slug}`}
                className="text-foreground transition-colors group-hover:text-primary"
              >
                {game.title}
              </Link>
            </h3>
            <GameTypeBadge collectionType={collectionType} />
          </div>

          {isBoard && (
            <p className="text-small flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" aria-hidden />
                {game.minPlayers}–{game.maxPlayers}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                {game.minPlayTime}–{game.maxPlayTime} min
              </span>
            </p>
          )}

          {showReserve && available > 0 && (
            <Link
              href={`/gry/${game.slug}#rezerwacja`}
              className="text-small mt-auto font-semibold text-accent transition-colors hover:text-primary"
            >
              Zarezerwuj →
            </Link>
          )}
        </div>
      </article>
    );
  }

  return (
    <article
      className={cn("card-elevated flex h-full max-w-full flex-col overflow-hidden", className)}
      data-testid="game-card"
      data-available={available > 0 ? "true" : "false"}
    >
      <Link href={`/gry/${game.slug}`} className="relative block">
        <GameCover
          src={game.coverImageUrl}
          alt={`Okładka: ${game.title}`}
          collectionType={collectionType}
          className="rounded-none"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
        />
        <Badge variant={avail.variant} className="absolute right-3 top-3 shadow-sm" aria-label={`Status: ${avail.label}`}>
          {avail.label}
        </Badge>
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

        <p className="text-small text-muted-foreground">
          <span className="font-medium text-foreground">{available}</span>
          {total > 0 ? ` z ${total} egzemplarzy dostępnych` : " — brak egzemplarzy w systemie"}
        </p>

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

        {(game.shortDescription || game.description) && (
          <p className="text-small line-clamp-2 text-muted-foreground">
            {game.shortDescription || game.description}
          </p>
        )}
      </div>

      <div className="flex gap-2 border-t border-border/60 p-4 pt-0">
        <Button variant="outline" className="min-h-11 flex-1" asChild>
          <Link href={`/gry/${game.slug}`}>Szczegóły</Link>
        </Button>
        {showReserve && available > 0 && (
          <Button className="min-h-11 flex-1" asChild>
            <Link href={`/gry/${game.slug}#rezerwacja`}>Zarezerwuj</Link>
          </Button>
        )}
      </div>
    </article>
  );
}
