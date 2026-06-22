"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
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
  isAvailable,
  availLabel,
  showReserve,
  className,
}: Props) {
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
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          sizes="(max-width: 640px) 45vw, (max-width: 1280px) 20vw, 200px"
        />
        <div className="absolute left-2 top-2">
          <GameTypeBadge collectionType={collectionType} />
        </div>
      </Link>

      <div className="zf-game-card-body">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug md:text-base">
          <Link href={`/gry/${slug}`} className="hover:text-[var(--zf-green-500)]">
            {title}
          </Link>
        </h3>

        {isBoard && (
          <p className="text-xs text-muted-foreground">
            {minPlayers}–{maxPlayers} graczy
          </p>
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

        {showReserve && isAvailable && (
          <Button size="sm" className="zf-btn-primary mt-1 h-9 w-full text-xs" asChild>
            <Link href={`/gry/${slug}#rezerwacja`}>Zarezerwuj</Link>
          </Button>
        )}
      </div>
    </article>
  );
}
