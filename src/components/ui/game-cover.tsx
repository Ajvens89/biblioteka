"use client";

import { useState } from "react";
import Image from "next/image";
import { Dices, Scroll } from "lucide-react";
import type { GameCollectionType } from "@prisma/client";
import { cn } from "@/lib/utils";

type Props = {
  src?: string | null;
  alt: string;
  className?: string;
  aspect?: "square" | "card" | "portrait";
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
  collectionType?: GameCollectionType;
};

export function GameCover({
  src,
  alt,
  className,
  aspect = "card",
  fill = false,
  priority,
  sizes = "(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 280px",
  collectionType = "BOARD_GAME",
}: Props) {
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null);
  const trimmed = src?.trim() ?? "";
  const isBroken = Boolean(trimmed && brokenSrc === trimmed);
  const isPlaceholder = !trimmed || isBroken;
  const isRpg = collectionType === "RPG";
  const isExternal = /^https?:\/\//i.test(trimmed);

  /** Podręczniki RPG są pionowe — pokaż całą okładkę, nie kadruj jak pudełko planszówki. */
  const resolvedAspect = isRpg && aspect !== "portrait" ? "portrait" : aspect;
  const imageFitClass = isRpg ? "object-contain" : "object-cover";

  const aspectClass =
    resolvedAspect === "square"
      ? "aspect-square"
      : resolvedAspect === "portrait"
        ? "aspect-[2/3]"
        : "aspect-[4/3]";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg",
        isRpg
          ? "bg-gradient-to-br from-primary/15 via-secondary to-accent/10"
          : "bg-gradient-to-br from-accent/15 via-secondary to-primary/10",
        fill ? "absolute inset-0 h-full w-full rounded-none" : aspectClass,
        className,
      )}
    >
      {isPlaceholder ? (
        <div
          className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground"
          aria-hidden
        >
          {isRpg ? (
            <Scroll className="h-12 w-12 opacity-35" />
          ) : (
            <Dices className="h-12 w-12 opacity-35" />
          )}
          <span className="text-xs font-medium">{isRpg ? "Gra fabularna" : "Gra planszowa"}</span>
        </div>
      ) : (
        <Image
          src={trimmed}
          alt={alt}
          fill
          className={imageFitClass}
          sizes={sizes}
          priority={priority}
          unoptimized={isExternal}
          onError={() => setBrokenSrc(trimmed)}
        />
      )}
    </div>
  );
}
