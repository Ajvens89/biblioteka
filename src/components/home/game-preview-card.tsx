import Link from "next/link";
import { Clock, Users } from "lucide-react";
import { GameCover } from "@/components/ui/game-cover";
import { cn } from "@/lib/utils";
import type { ShowcaseGame } from "./types";

type Props = {
  game: ShowcaseGame;
  featured?: boolean;
  className?: string;
};

export function GamePreviewCard({ game, featured = false, className }: Props) {
  const isBoard = game.collectionType !== "RPG";

  return (
    <Link
      href={`/gry/${game.slug}`}
      className={cn(
        "zf-preview-card group relative block overflow-hidden rounded-2xl",
        featured ? "row-span-2 min-h-[220px]" : "min-h-[108px]",
        className,
      )}
      data-testid="game-preview-card"
    >
      <GameCover
        src={game.coverImageUrl}
        alt={game.title}
        collectionType={game.collectionType}
        className="absolute inset-0 h-full w-full rounded-none transition duration-500 group-hover:scale-105"
        sizes={featured ? "280px" : "160px"}
      />
      <div className="zf-preview-card-scrim absolute inset-0" aria-hidden />
      <div className="relative flex h-full min-h-[inherit] flex-col justify-end p-3 md:p-3.5">
        {game.categoryLabel && (
          <span className="mb-1.5 w-fit rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
            {game.categoryLabel}
          </span>
        )}
        <h3
          className={cn(
            "zf-preview-card-title font-display font-semibold leading-tight text-white",
            featured ? "line-clamp-3 text-base md:text-lg" : "line-clamp-2 text-sm",
          )}
        >
          {game.title}
        </h3>
        {isBoard && (
          <ul className="zf-preview-card-meta mt-1.5 flex flex-wrap gap-2 text-[11px] font-medium text-white">
            <li className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" aria-hidden />
              {game.minPlayers}–{game.maxPlayers}
            </li>
            <li className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" aria-hidden />
              {game.minPlayTime}–{game.maxPlayTime} min
            </li>
            <li>{game.minAge}+</li>
          </ul>
        )}
      </div>
    </Link>
  );
}
