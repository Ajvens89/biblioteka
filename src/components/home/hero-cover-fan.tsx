import Link from "next/link";
import { GameCover } from "@/components/ui/game-cover";
import type { ShowcaseGame } from "./types";
import { cn } from "@/lib/utils";

type Props = {
  games: ShowcaseGame[];
  className?: string;
};

const POSITIONS = [
  { left: "4%", top: "8%", width: "42%", rotate: -8, z: 2 },
  { left: "28%", top: "0%", width: "38%", rotate: 4, z: 3 },
  { left: "52%", top: "12%", width: "40%", rotate: -3, z: 4 },
  { left: "18%", top: "38%", width: "36%", rotate: 6, z: 1 },
] as const;

export function HeroCoverFan({ games, className }: Props) {
  const items = games.slice(0, 4);
  if (items.length === 0) return null;

  return (
    <div className={cn("zf-cover-fan hidden lg:block", className)} aria-hidden>
      {items.map((game, i) => {
        const pos = POSITIONS[i] ?? POSITIONS[0];
        return (
          <Link
            key={game.id}
            href={`/gry/${game.slug}`}
            className="zf-cover-fan-item relative block aspect-[3/4]"
            style={{
              left: pos.left,
              top: pos.top,
              width: pos.width,
              zIndex: pos.z,
              transform: `rotate(${pos.rotate}deg)`,
            }}
            tabIndex={-1}
          >
            <GameCover
              src={game.coverImageUrl}
              alt=""
              collectionType={game.collectionType}
              fill
              className="rounded-lg"
              sizes="280px"
            />
          </Link>
        );
      })}
    </div>
  );
}

/** Mobilna wersja — jedna okładka */
export function HeroCoverMobile({ games }: { games: ShowcaseGame[] }) {
  const game = games[0];
  if (!game) return null;

  return (
    <div className="relative mx-auto mt-8 h-52 w-40 lg:hidden" aria-hidden>
      <Link
        href={`/gry/${game.slug}`}
        className="zf-cover-fan-item relative block h-full w-full rotate-[-4deg]"
        tabIndex={-1}
      >
        <GameCover
          src={game.coverImageUrl}
          alt=""
          collectionType={game.collectionType}
          fill
          className="rounded-lg"
          sizes="160px"
        />
      </Link>
    </div>
  );
}
