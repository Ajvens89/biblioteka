import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";
import { HomeHeroSearch } from "@/components/games/home-hero-search";
import { CategoryPreviewTabs } from "./category-preview-tabs";
import { StatsChips } from "./stats-chips";
import type { ShowcaseGame } from "./types";

type Props = {
  totalGames: number;
  boardGameCount: number;
  rpgGameCount: number;
  availableCopies?: number;
  boardGames: ShowcaseGame[];
  rpgGames: ShowcaseGame[];
};

export function HeroSection({
  totalGames,
  boardGameCount,
  rpgGameCount,
  availableCopies,
  boardGames,
  rpgGames,
}: Props) {
  return (
    <section className="zf-hero relative overflow-hidden">
      <div className="zf-hero-bg pointer-events-none absolute inset-0" aria-hidden>
        <div className="zf-hero-vignette" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pt-10 pb-0 md:pt-14 lg:pt-16">
        <div className="grid items-start gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div className="space-y-8 text-center lg:text-left">
            <div className="space-y-4">
              <p className="zf-hero-eyebrow mx-auto w-fit lg:mx-0">Fundacja Zakątek Fantastyki</p>
              <h1 className="zf-hero-title text-white">{APP_NAME}</h1>
              <p className="zf-hero-lead mx-auto max-w-lg lg:mx-0">
                Biblioteka gier planszowych i RPG. Przeglądaj katalog, rezerwuj egzemplarze online
                i odbieraj w siedzibie fundacji.
              </p>
            </div>

            <StatsChips
              totalGames={totalGames}
              boardCount={boardGameCount}
              rpgCount={rpgGameCount}
              availableCopies={availableCopies}
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Button size="lg" className="zf-btn-primary h-11 w-full sm:w-auto" asChild>
                <Link href="/katalog">
                  Przeglądaj katalog
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <Button size="lg" className="zf-btn-ghost h-11 w-full sm:w-auto" asChild>
                <Link href="/login">Zaloguj się</Link>
              </Button>
            </div>
          </div>

          <CategoryPreviewTabs
            boardGames={boardGames}
            rpgGames={rpgGames}
            className="mx-auto w-full max-w-md lg:max-w-none"
          />
        </div>
      </div>

      <div className="zf-hero-search relative z-10 mx-auto mt-12 max-w-7xl px-4 py-6 md:py-8">
        <div className="mb-4 text-center lg:text-left">
          <p className="text-eyebrow text-[var(--zf-gold)]">Wyszukiwarka</p>
          <h2 className="font-display mt-1 text-lg font-medium text-white md:text-xl">
            Znajdź grę po tytule lub kodzie EAN
          </h2>
        </div>
        <HomeHeroSearch variant="hero" />
      </div>
    </section>
  );
}

/** @deprecated Użyj HeroSection */
export const LandingHero = HeroSection;
