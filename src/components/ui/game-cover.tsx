"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Dices, Scroll } from "lucide-react";
import type { GameCollectionType } from "@prisma/client";
import { cn } from "@/lib/utils";

type Props = {
  src?: string | null;
  alt: string;
  className?: string;
  aspect?: "square" | "card";
  priority?: boolean;
  sizes?: string;
  collectionType?: GameCollectionType;
};

export function GameCover({
  src,
  alt,
  className,
  aspect = "card",
  priority,
  sizes = "(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 280px",
  collectionType = "BOARD_GAME",
}: Props) {
  const [failed, setFailed] = useState(false);
  const trimmed = src?.trim() ?? "";
  const isPlaceholder = !trimmed || failed;
  const isRpg = collectionType === "RPG";
  const isExternal = /^https?:\/\//i.test(trimmed);

  useEffect(() => {
    setFailed(false);
  }, [trimmed]);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg",
        isRpg
          ? "bg-gradient-to-br from-primary/15 via-secondary to-accent/10"
          : "bg-gradient-to-br from-accent/15 via-secondary to-primary/10",
        aspect === "square" ? "aspect-square" : "aspect-[4/3]",
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
          className="object-cover"
          sizes={sizes}
          priority={priority}
          unoptimized={isExternal}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
