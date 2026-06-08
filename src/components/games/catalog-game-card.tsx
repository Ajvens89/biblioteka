"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, QrCode, Users, UserRound } from "lucide-react";
import type { GameCollectionType } from "@prisma/client";
import { GameCover } from "@/components/ui/game-cover";
import { cn } from "@/lib/utils";

type Props = {
  slug: string;
  title: string;
  description: string | null;
  publisherLabel: string | null;
  ean: string | null;
  isBoard: boolean;
  minPlayers: number;
  maxPlayers: number;
  minPlayTime: number;
  maxPlayTime: number;
  coverImageUrl: string | null;
  collectionType: GameCollectionType;
  isAvailable: boolean;
  availLabel: string;
  showReserve: boolean;
  className?: string;
};

function ExpandableDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const canExpand = text.length > 110;

  if (!canExpand) {
    return <p className="text-small text-muted-foreground">{text}</p>;
  }

  return (
    <button
      type="button"
      className={cn(
        "text-small w-full text-left text-muted-foreground transition-colors",
        "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        !expanded && "line-clamp-3",
      )}
      onClick={() => setExpanded((v) => !v)}
      aria-expanded={expanded}
    >
      {text}
    </button>
  );
}

export function CatalogGameCard({
  slug,
  title,
  description,
  publisherLabel,
  ean,
  isBoard,
  minPlayers,
  maxPlayers,
  minPlayTime,
  maxPlayTime,
  coverImageUrl,
  collectionType,
  isAvailable,
  availLabel,
  showReserve,
  className,
}: Props) {
  return (
    <article
      className={cn(
        "zf-game-row group h-full",
        isAvailable ? "zf-game-row--available" : "zf-game-row--unavailable",
        className,
      )}
      data-testid="game-card"
      data-available={isAvailable ? "true" : "false"}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2.5 py-0.5">
        <div className="space-y-1.5">
          <h3 className="font-display text-base font-medium leading-snug">
            <Link
              href={`/gry/${slug}`}
              className="text-primary transition-colors hover:text-accent"
            >
              {title}
            </Link>
          </h3>
          {description && <ExpandableDescription text={description} />}
        </div>

        <ul className="text-small space-y-1 text-muted-foreground">
          {publisherLabel && (
            <li className="flex items-center gap-2">
              <UserRound className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
              <span className="truncate uppercase tracking-wide text-xs">{publisherLabel}</span>
            </li>
          )}
          {ean && (
            <li className="flex items-center gap-2 font-mono text-[0.6875rem]">
              <QrCode className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
              <span className="truncate">{ean}</span>
            </li>
          )}
          {isBoard && (
            <li className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5 opacity-60" aria-hidden />
                {minPlayers}–{maxPlayers}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 opacity-60" aria-hidden />
                {minPlayTime}–{maxPlayTime} min
              </span>
            </li>
          )}
        </ul>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
          <p
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-medium",
              isAvailable ? "text-success" : "text-muted-foreground",
            )}
          >
            {isAvailable ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : null}
            {availLabel}
          </p>
          {showReserve && isAvailable && (
            <Link
              href={`/gry/${slug}#rezerwacja`}
              className="text-xs font-semibold text-accent hover:text-primary"
            >
              Zarezerwuj →
            </Link>
          )}
        </div>
      </div>

      <Link
        href={`/gry/${slug}`}
        className="zf-game-row-cover shrink-0 self-start"
        aria-label={`Okładka: ${title}`}
      >
        <GameCover
          src={coverImageUrl}
          alt=""
          collectionType={collectionType}
          fill
          className="rounded-sm"
          sizes="(max-width: 640px) 40vw, 120px"
        />
      </Link>
    </article>
  );
}
