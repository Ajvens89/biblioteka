import type { GameCollectionType } from "@prisma/client";
import { Dices, Scroll } from "lucide-react";
import { COLLECTION_TYPE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Props = {
  collectionType: GameCollectionType;
  className?: string;
  size?: "sm" | "md";
};

export function GameTypeBadge({ collectionType, className, size = "sm" }: Props) {
  const isRpg = collectionType === "RPG";
  return (
    <span
      data-testid="game-type-badge"
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-semibold",
        isRpg
          ? "border-primary/25 bg-primary/10 text-primary"
          : "border-accent/35 bg-accent/15 text-accent-foreground",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
        className,
      )}
    >
      {isRpg ? <Scroll className="h-3 w-3" aria-hidden /> : <Dices className="h-3 w-3" aria-hidden />}
      {COLLECTION_TYPE_LABELS[collectionType]}
    </span>
  );
}
