import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HomeHeroSearch } from "@/components/games/home-hero-search";
import { HeroCoverFan, HeroCoverMobile } from "./hero-cover-fan";
import type { ShowcaseGame } from "./types";

type Props = {
  boardGames: ShowcaseGame[];
  rpgGames: ShowcaseGame[];
  copiesOnShelves?: number;
};

export function HeroSection({ boardGames, rpgGames, copiesOnShelves }: Props) {
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
              Zapal lampę, rozłóż pudełko i zobacz, dokąd zabierze was{" "}
              <em className="not-italic text-primary">ten wieczór</em>.
            </h1>
            <p className="hero-enter hero-enter-3 zf-hero-lead mt-4">
              540 pudełek. Tysiące historii. Jedno miejsce, w którym nikt nie gra solo.
            </p>

            <div className="hero-enter hero-enter-4 zf-hero-search-wrap">
              <HomeHeroSearch variant="hero" />
            </div>

            <p className="hero-enter hero-enter-4 mt-3 text-sm text-muted-foreground">
              Wypożyczenie za 0 zł · odbiór osobisty w Bielsku-Białej
              {copiesOnShelves != null && copiesOnShelves > 0
                ? ` · ${copiesOnShelves} egzemplarzy na półkach`
                : null}
            </p>

            <div className="hero-enter hero-enter-5 mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button size="lg" variant="hero" className="h-12 px-8" asChild>
                <Link href="/katalog">
                  Przeglądaj katalog
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <Button size="lg" variant="heroGhost" className="h-12 px-6" asChild>
                <Link href="/jak-wypozyczyc">Jak wypożyczyć?</Link>
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
