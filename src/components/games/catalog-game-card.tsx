"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, Users } from "lucide-react";
import type { GameCollectionType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { GameCover } from "@/components/ui/game-cover";
import { GameTypeBadge } from "@/components/ui/game-type-badge";
import { cn } from "@/lib/utils";

type Props = {
  slug: string;
  title: string;
  coverImageUrl: string | null;
  collectionType: GameCollectionType;
  isBoard: boolean;
  minPlayers: number;
  maxPlayers: number;
  maxPlayTime: number;
  minAge: number;
  isAvailable: boolean;
  availLabel: string;
  showReserve: boolean;
  className?: string;
};

export function CatalogGameCard({
  slug,
  title,
  coverImageUrl,
  collectionType,
  isBoard,
  minPlayers,
  maxPlayers,
  maxPlayTime,
  minAge,
  isAvailable,
  availLabel,
  showReserve,
  className,
}: Props) {
  const playersText =
    isBoard && maxPlayers > 0
      ? minPlayers && minPlayers !== maxPlayers
        ? `${minPlayers}–${maxPlayers}`
        : `${maxPlayers}`
      : null;
  const timeText = isBoard && maxPlayTime > 0 ? `≤${maxPlayTime} min` : null;
  const ageText = isBoard && minAge > 0 ? `${minAge}+` : null;
  const hasMeta = Boolean(playersText || timeText || ageText);

  return (
    <article
      className={cn("zf-game-card group", className)}
      data-testid="game-card"
      data-available={isAvailable ? "true" : "false"}
    >
      <Link href={`/gry/${slug}`} className="zf-game-card-cover relative block overflow-hidden">
        <GameCover
          src={coverImageUrl}
          alt={`Okładka: ${title}`}
          collectionType={collectionType}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 45vw, (max-width: 1280px) 22vw, 220px"
        />
        <div className="absolute left-2 top-2">
          <GameTypeBadge collectionType={collectionType} />
        </div>
      </Link>

      <div className="zf-game-card-body">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug md:text-base">
          <Link href={`/gry/${slug}`} className="transition-colors hover:text-primary">
            {title}
          </Link>
        </h3>

        {hasMeta && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {playersText && (
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" aria-hidden />
                {playersText}
              </span>
            )}
            {timeText && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                {timeText}
              </span>
            )}
            {ageText && <span>{ageText}</span>}
          </div>
        )}

        <p
          className={cn(
            "zf-game-card-status mt-auto inline-flex items-center gap-1",
            isAvailable ? "zf-game-card-status--available" : "text-muted-foreground",
          )}
        >
          {isAvailable && <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />}
          {availLabel}
        </p>

        {showReserve && isAvailable ? (
          <Button size="sm" className="mt-1 h-9 w-full text-xs" asChild>
            <Link href={`/gry/${slug}#rezerwacja`}>Zarezerwuj</Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="mt-1 h-9 w-full text-xs" asChild>
            <Link href={`/gry/${slug}`}>
              Zobacz szczegóły
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </Button>
        )}
      </div>
    </article>
  );
}
