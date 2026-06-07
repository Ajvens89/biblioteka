"use client";

import { useState } from "react";
import Link from "next/link";
import type { GameCollectionType } from "@prisma/client";
import { ArrowRight, Dices, Scroll } from "lucide-react";
import { GameCover } from "@/components/ui/game-cover";
import { CATALOG_COLLECTION_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type HeroShowcaseGame = {
  id: string;
  title: string;
  slug: string;
  coverImageUrl: string | null;
  collectionType: GameCollectionType;
};

type Props = {
  boardGames: HeroShowcaseGame[];
  rpgGames: HeroShowcaseGame[];
  className?: string;
};

type Tab = GameCollectionType;

export function LandingCategoryShowcase({ boardGames, rpgGames, className }: Props) {
  const [tab, setTab] = useState<Tab>("BOARD_GAME");
  const games = tab === "BOARD_GAME" ? boardGames : rpgGames;
  const featured = games[0];
  const rest = games.slice(1, 4);

  return (
    <div className={cn("w-full", className)} data-testid="hero-category-showcase">
      <div className="landing-showcase-card overflow-hidden rounded-2xl shadow-2xl">
        <div
          className="flex rounded-t-2xl border-b border-white/10 bg-white/5 p-1"
          role="tablist"
          aria-label="Kategoria katalogu"
        >
          {(["BOARD_GAME", "RPG"] as const).map((key) => {
            const active = tab === key;
            const Icon = key === "BOARD_GAME" ? Dices : Scroll;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                data-testid={`hero-category-tab-${key}`}
                className={cn(
                  "landing-showcase-tab flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200",
                  active
                    ? "bg-white text-foreground shadow-md"
                    : "text-white/75 hover:bg-white/10 hover:text-white",
                )}
                onClick={() => setTab(key)}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                {CATALOG_COLLECTION_LABELS[key]}
              </button>
            );
          })}
        </div>

        <div
          key={tab}
          className="landing-showcase-panel animate-in fade-in slide-in-from-right-2 p-4 duration-300 md:p-5"
          role="tabpanel"
        >
          {featured ? (
            <Link
              href={`/gry/${featured.slug}`}
              className="group mb-4 block overflow-hidden rounded-xl border border-white/15 bg-white/10 transition hover:border-white/30 hover:bg-white/14"
            >
              <div className="grid gap-3 sm:grid-cols-[7.5rem_1fr] sm:items-center">
                <GameCover
                  src={featured.coverImageUrl}
                  alt={featured.title}
                  collectionType={featured.collectionType}
                  className="h-full min-h-[6.5rem] rounded-none sm:rounded-l-xl"
                  sizes="120px"
                  priority
                />
                <div className="px-3 pb-3 sm:py-3 sm:pr-4">
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-amber-200/90">
                    Gra tygodnia
                  </p>
                  <p className="font-display text-lg font-bold leading-snug text-white group-hover:text-amber-50">
                    {featured.title}
                  </p>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-white/70 group-hover:text-white">
                    Zobacz szczegóły
                    <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            </Link>
          ) : (
            <p className="mb-4 rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-white/70">
              Brak pozycji w tej kategorii — sprawdź katalog.
            </p>
          )}

          {rest.length > 0 && (
            <ul className="space-y-2" aria-label="Inne pozycje w kategorii">
              {rest.map((game) => (
                <li key={game.id}>
                  <Link
                    href={`/gry/${game.slug}`}
                    className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-white/10"
                  >
                    <GameCover
                      src={game.coverImageUrl}
                      alt=""
                      collectionType={game.collectionType}
                      aspect="square"
                      className="h-11 w-11 shrink-0 rounded-md"
                      sizes="44px"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-white/90">
                      {game.title}
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-white/40" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link
            href={`/katalog?collectionType=${tab}`}
            className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/8 py-2.5 text-sm font-semibold text-white transition hover:bg-white/14"
          >
            Przeglądaj {CATALOG_COLLECTION_LABELS[tab].toLowerCase()}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}
