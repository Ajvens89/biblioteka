"use client";

import { useState } from "react";
import Link from "next/link";
import type { GameCollectionType } from "@prisma/client";
import { ArrowRight, Dices, Scroll } from "lucide-react";
import { CATALOG_COLLECTION_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { GamePreviewCard } from "./game-preview-card";
import type { ShowcaseGame } from "./types";

export type { ShowcaseGame, HeroShowcaseGame } from "./types";

type Props = {
  boardGames: ShowcaseGame[];
  rpgGames: ShowcaseGame[];
  className?: string;
};

type Tab = GameCollectionType;

const CTA_LABEL: Record<Tab, string> = {
  BOARD_GAME: "Przeglądaj planszówki",
  RPG: "Przeglądaj RPG",
};

export function CategoryPreviewTabs({ boardGames, rpgGames, className }: Props) {
  const [tab, setTab] = useState<Tab>("BOARD_GAME");
  const games = (tab === "BOARD_GAME" ? boardGames : rpgGames).slice(0, 4);

  return (
    <div className={cn("w-full", className)} data-testid="hero-category-showcase">
      <div className="zf-showcase-panel relative overflow-hidden rounded-3xl">
        <div className="zf-showcase-glow pointer-events-none absolute inset-0" aria-hidden />

        <div
          className="relative flex gap-1 rounded-t-3xl border-b border-white/10 bg-white/[0.06] p-1.5"
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
                  "zf-showcase-tab flex flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-semibold transition-all duration-300",
                  active
                    ? "bg-white text-[var(--zf-ink)] shadow-lg shadow-black/20"
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
          className="relative animate-in fade-in slide-in-from-bottom-2 p-4 duration-300 md:p-5"
          role="tabpanel"
        >
          {games.length > 0 ? (
            <div
              className="grid h-[min(400px,58vw)] grid-cols-2 grid-rows-2 gap-3 sm:h-[420px]"
              aria-label="Podgląd gier w kategorii"
            >
              {games.map((game, index) => (
                <GamePreviewCard
                  key={game.id}
                  game={game}
                  featured={index === 0}
                  className={cn(
                    "h-full min-h-0",
                    index === 0 && games.length > 1 ? "row-span-2" : undefined,
                    index === 0 && games.length === 1 ? "col-span-2 row-span-2" : undefined,
                  )}
                />
              ))}
            </div>
          ) : (
            <div className="zf-showcase-empty flex min-h-[240px] flex-col items-center justify-center rounded-2xl px-6 py-10 text-center">
              <Dices className="mb-3 h-10 w-10 text-white/40" aria-hidden />
              <p className="text-sm font-medium text-white/80">
                Brak pozycji w tej kategorii
              </p>
              <p className="mt-1 text-xs text-white/55">Sprawdź pełny katalog biblioteki</p>
            </div>
          )}

          <Link
            href={`/katalog?collectionType=${tab}`}
            className="zf-showcase-cta mt-4 flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-white transition"
          >
            {CTA_LABEL[tab]}
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}

/** @deprecated Użyj CategoryPreviewTabs */
export const LandingCategoryShowcase = CategoryPreviewTabs;
