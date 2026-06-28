import Link from "next/link";
import { GameCover } from "@/components/ui/game-cover";
import type { ShowcaseGame } from "./types";
import { cn } from "@/lib/utils";

type Props = {
  games: ShowcaseGame[];
  className?: string;
};

/** Desktop: dominująca okładka + tło — głębia przez scale, translate, cień. */
export function HeroCoverFan({ games, className }: Props) {
  const [hero, ...rest] = games.slice(0, 4);
  if (!hero) return null;

  const bgPositions = [
    { className: "zf-hero-cover-bg zf-hero-cover-bg--1", rotate: -12, scale: 0.88 },
    { className: "zf-hero-cover-bg zf-hero-cover-bg--2", rotate: 8, scale: 0.82 },
    { className: "zf-hero-cover-bg zf-hero-cover-bg--3", rotate: -5, scale: 0.78 },
  ] as const;

  return (
    <div className={cn("zf-hero-cover-stage hidden lg:block", className)} aria-hidden>
      {rest.slice(0, 3).map((game, i) => {
        const pos = bgPositions[i];
        if (!pos) return null;
        return (
          <Link
            key={game.id}
            href={`/gry/${game.slug}`}
            className={cn("zf-hero-cover-bg-link", pos.className)}
            style={{ transform: `rotate(${pos.rotate}deg) scale(${pos.scale})` }}
            tabIndex={-1}
          >
            <GameCover
              src={game.coverImageUrl}
              alt=""
              collectionType={game.collectionType}
              fill
              className="rounded-lg"
              sizes="200px"
            />
          </Link>
        );
      })}

      <Link
        href={`/gry/${hero.slug}`}
        className="zf-hero-cover-hero relative block"
        tabIndex={-1}
      >
        <GameCover
          src={hero.coverImageUrl}
          alt=""
          collectionType={hero.collectionType}
          fill
          priority
          className="rounded-xl"
          sizes="(min-width: 1024px) 320px, 0px"
        />
      </Link>
    </div>
  );
}

/** Mobile: kompaktowa jedna okładka — nie wypycha wyszukiwarki. */
export function HeroCoverMobile({ games }: { games: ShowcaseGame[] }) {
  const game = games[0];
  if (!game) return null;

  return (
    <div className="zf-hero-cover-mobile relative mx-auto mt-6 h-36 w-28 sm:h-40 sm:w-32 lg:hidden" aria-hidden>
      <Link href={`/gry/${game.slug}`} className="zf-hero-cover-mobile-link block h-full w-full" tabIndex={-1}>
        <GameCover
          src={game.coverImageUrl}
          alt=""
          collectionType={game.collectionType}
          fill
          priority
          className="rounded-lg shadow-lg"
          sizes="128px"
        />
      </Link>
    </div>
  );
}
