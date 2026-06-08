import Link from "next/link";
import { CheckCircle2, Clock, QrCode, Users, UserRound } from "lucide-react";
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

function catalogDescription(game: GameWithRelations): string | null {
  const raw = game.shortDescription?.trim() || game.description?.trim();
  if (!raw) return null;
  return raw.length > 140 ? `${raw.slice(0, 137).trim()}…` : raw;
}

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
  const description = catalogDescription(game);
  const publisherLabel = game.publisher?.name ?? game.designer?.name ?? null;

  if (isCatalog) {
    const isAvailable = available > 0;

    return (
      <article
        className={cn(
          "zf-game-row group",
          isAvailable ? "zf-game-row--available" : "zf-game-row--unavailable",
          className,
        )}
        data-testid="game-card"
        data-available={available > 0 ? "true" : "false"}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-3 py-1">
          <div className="space-y-1.5">
            <h3 className="font-display text-base font-medium leading-snug md:text-lg">
              <Link
                href={`/gry/${game.slug}`}
                className="text-primary transition-colors hover:text-accent"
              >
                {game.title}
              </Link>
            </h3>
            {description && (
              <p className="text-small line-clamp-2 text-muted-foreground">{description}</p>
            )}
          </div>

          <ul className="text-small space-y-1 text-muted-foreground">
            {publisherLabel && (
              <li className="flex items-center gap-2">
                <UserRound className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
                <span className="truncate uppercase tracking-wide">{publisherLabel}</span>
              </li>
            )}
            {game.ean && (
              <li className="flex items-center gap-2 font-mono text-xs">
                <QrCode className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
                <span>{game.ean}</span>
              </li>
            )}
            {isBoard && (
              <li className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 opacity-60" aria-hidden />
                  {game.minPlayers}–{game.maxPlayers} os.
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 opacity-60" aria-hidden />
                  {game.minPlayTime}–{game.maxPlayTime} min
                </span>
              </li>
            )}
          </ul>

          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
            <p
              className={cn(
                "inline-flex items-center gap-1.5 text-sm font-medium",
                isAvailable ? "text-success" : "text-muted-foreground",
              )}
            >
              {isAvailable ? (
                <CheckCircle2 className="h-4 w-4" aria-hidden />
              ) : null}
              {avail.label}
            </p>
            {showReserve && isAvailable && (
              <Link
                href={`/gry/${game.slug}#rezerwacja`}
                className="text-small font-semibold text-accent hover:text-primary"
              >
                Zarezerwuj →
              </Link>
            )}
          </div>
        </div>

        <Link
          href={`/gry/${game.slug}`}
          className="zf-game-row-cover shrink-0 self-center"
          aria-label={`Okładka: ${game.title}`}
        >
          <GameCover
            src={game.coverImageUrl}
            alt=""
            collectionType={collectionType}
            fill
            className="rounded-sm"
            sizes="96px"
          />
        </Link>
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
