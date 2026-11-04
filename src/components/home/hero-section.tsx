import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HomeHeroSearch } from "@/components/games/home-hero-search";
import { HeroCoverFan, HeroCoverMobile } from "./hero-cover-fan";
import type { ShowcaseGame } from "./types";
import { pluralPl } from "@/lib/plural-pl";

type Props = {
  boardGames: ShowcaseGame[];
  rpgGames: ShowcaseGame[];
  titlesInCatalog?: number;
};

export function HeroSection({ boardGames, rpgGames, titlesInCatalog }: Props) {
  const showcase = [...boardGames, ...rpgGames].slice(0, 4);

  return (
    <section className="zf-hero">
      <div className="zf-hero-bg" aria-hidden />
      <div className="zf-hero-ambient zf-hero-ambient--green" aria-hidden />
      <div className="zf-hero-ambient zf-hero-ambient--warm" aria-hidden />

      <div className="zf-hero-inner">
        <div className="zf-hero-grid">
          <div className="zf-hero-content">
            <p className="hero-enter hero-enter-1 text-eyebrow mb-4">
              Biblioteka Fundacji Zakątek Fantastyki
            </p>
            <h1 className="hero-enter hero-enter-2 zf-hero-title">
              Znajdź grę na{" "}
              <em className="not-italic text-primary">wspólny wieczór</em>.
            </h1>
            <p className="hero-enter hero-enter-3 zf-hero-lead mt-4">
              {titlesInCatalog != null && titlesInCatalog > 0
                ? `${titlesInCatalog} ${pluralPl(titlesInCatalog, "tytuł", "tytuły", "tytułów")}. `
                : null}
              Przeglądaj gry planszowe i podręczniki RPG Zakątka Fantastyki.
            </p>

            <div className="hero-enter hero-enter-4 zf-hero-search-wrap">
              <HomeHeroSearch variant="hero" />
            </div>

            <p className="hero-enter hero-enter-4 mt-3 text-sm text-muted-foreground">
              Szukaj po tytule lub nazwie wydawcy. Katalog przeglądasz bez konta.
            </p>

            <div className="hero-enter hero-enter-5 mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button size="lg" variant="hero" className="h-12 px-8" asChild>
                <Link href="/katalog">
                  Przeglądaj katalog
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </div>
          </div>

          <div className="hero-enter hero-enter-6 zf-hero-covers">
            <HeroCoverFan games={showcase} />
            <HeroCoverMobile games={showcase} />
          </div>
        </div>
      </div>
    </section>
  );
}
