import Link from "next/link";
import { GameCover } from "@/components/ui/game-cover";
import type { ShowcaseGame } from "./types";
import { cn } from "@/lib/utils";

type Props = {
  games: ShowcaseGame[];
  className?: string;
};

/** Desktop: trzy okładki w wachlarzu (środek z amber border jak Lovable). */
export function HeroCoverFan({ games, className }: Props) {
  const picks = games.filter((g) => g.coverImageUrl).slice(0, 3);
  if (picks.length === 0) return null;

  const center = picks[0]!;
  const left = picks[1];
  const right = picks[2] ?? picks[1];

  return (
    <div className={cn("zf-hero-cover-stage hidden lg:block", className)} aria-hidden>
      {left && (
        <Link
          href={`/gry/${left.slug}`}
          className="zf-hero-cover-bg-link zf-hero-cover-bg--1"
          style={{ transform: "rotate(-14deg) translateY(8px)" }}
          tabIndex={-1}
        >
          <GameCover
            src={left.coverImageUrl}
            alt=""
            collectionType={left.collectionType}
            fill
            className="rounded-[1.2rem]"
            sizes="210px"
          />
        </Link>
      )}

      {right && (
        <Link
          href={`/gry/${right.slug}`}
          className="zf-hero-cover-bg-link zf-hero-cover-bg--2"
          style={{ transform: "rotate(12deg) translateY(12px)" }}
          tabIndex={-1}
        >
          <GameCover
            src={right.coverImageUrl}
            alt=""
            collectionType={right.collectionType}
            fill
            className="rounded-[1.2rem]"
            sizes="210px"
          />
        </Link>
      )}

      <Link href={`/gry/${center.slug}`} className="zf-hero-cover-hero relative block" tabIndex={-1}>
        <GameCover
          src={center.coverImageUrl}
          alt=""
          collectionType={center.collectionType}
          fill
          priority
          className="rounded-[1.35rem]"
          sizes="(min-width: 1024px) 260px, 0px"
        />
      </Link>
    </div>
  );
}

/** Mobile: kompaktowa jedna okładka. */
export function HeroCoverMobile({ games }: { games: ShowcaseGame[] }) {
  const game = games.find((g) => g.coverImageUrl) ?? games[0];
  if (!game) return null;

  return (
    <div className="zf-hero-cover-mobile relative mx-auto mt-6 h-40 w-28 sm:h-44 sm:w-32 lg:hidden" aria-hidden>
      <Link href={`/gry/${game.slug}`} className="zf-hero-cover-mobile-link block h-full w-full" tabIndex={-1}>
        <GameCover
          src={game.coverImageUrl}
          alt=""
          collectionType={game.collectionType}
          fill
          priority
          className="rounded-[1.1rem]"
          sizes="128px"
        />
      </Link>
    </div>
  );
}
