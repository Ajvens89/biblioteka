import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HomeHeroSearch } from "@/components/games/home-hero-search";
import { FantasyDecor } from "@/components/brand/fantasy-decor";
import { HeroCoverFan, HeroCoverMobile } from "./hero-cover-fan";
import type { ShowcaseGame } from "./types";

type Props = {
  boardGames: ShowcaseGame[];
  rpgGames: ShowcaseGame[];
};

export function HeroSection({ boardGames, rpgGames }: Props) {
  const showcase = [...boardGames, ...rpgGames].slice(0, 4);

  return (
    <section className="zf-hero">
      <div className="zf-hero-bg" aria-hidden />
      <FantasyDecor />

      <div className="zf-hero-inner relative">
        <div className="max-w-3xl">
          <p className="text-eyebrow mb-4">Fundacja Zakątek Fantastyki</p>
          <h1 className="zf-hero-title">Znajdź swoją kolejną przygodę</h1>
          <p className="zf-hero-lead mt-4">
            Odkryj nasz świat gier — planszówki i RPG do wypożyczenia w Bielsku-Białej.
            Wyszukaj tytuł, autora lub zeskanuj kod EAN.
          </p>

          <div className="zf-hero-search-wrap">
            <HomeHeroSearch variant="hero" />
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button size="lg" className="zf-btn-primary h-12 px-8" asChild>
              <Link href="/katalog">
                Przeglądaj katalog
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
            <Button size="lg" className="zf-btn-ghost h-12 px-6" asChild>
              <a href="https://zakatekfantastyki.pl/" target="_blank" rel="noopener noreferrer">
                Strona Fundacji
              </a>
            </Button>
          </div>
        </div>

        <HeroCoverFan games={showcase} />
        <HeroCoverMobile games={showcase} />
      </div>
    </section>
  );
}
