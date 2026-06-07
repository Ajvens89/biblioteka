import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";
import { CategoryPreviewTabs } from "./category-preview-tabs";
import { StatsChips } from "./stats-chips";
import type { ShowcaseGame } from "./types";

type Props = {
  totalGames: number;
  availableCopies?: number;
  boardGames: ShowcaseGame[];
  rpgGames: ShowcaseGame[];
};

export function HeroSection({ totalGames, availableCopies, boardGames, rpgGames }: Props) {
  return (
    <section className="zf-hero relative overflow-hidden">
      <div className="zf-hero-bg pointer-events-none absolute inset-0" aria-hidden>
        <div className="zf-hero-mesh" />
        <div className="zf-hero-grid" />
        <div className="zf-hero-vignette" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-12 md:py-16 lg:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <div className="space-y-7 text-center lg:text-left">
            <div className="space-y-5">
              <p className="zf-hero-eyebrow mx-auto w-fit lg:mx-0">
                Fundacja Zakątek Fantastyki
              </p>
              <h1 className="zf-hero-title font-display text-white">{APP_NAME}</h1>
              <p className="zf-hero-lead mx-auto max-w-xl text-lg leading-relaxed text-white/88 md:text-xl lg:mx-0">
                Prawdziwa biblioteka gier planszowych i RPG — znajdź tytuł, sprawdź szczegóły i
                zarezerwuj egzemplarz online, bez kolejki przy ladzie.
              </p>
            </div>

            <StatsChips totalGames={totalGames} availableCopies={availableCopies} />

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Button size="lg" className="zf-btn-primary group h-12 min-h-12 w-full sm:w-auto" asChild>
                <Link href="/katalog" className="group">
                  Przeglądaj katalog
                  <ArrowRight className="h-5 w-5 transition group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </Button>
              <Button size="lg" className="zf-btn-ghost h-12 min-h-12 w-full sm:w-auto" asChild>
                <Link href="/login">Zaloguj się</Link>
              </Button>
            </div>
          </div>

          <CategoryPreviewTabs
            boardGames={boardGames}
            rpgGames={rpgGames}
            className="mx-auto w-full max-w-lg lg:max-w-none"
          />
        </div>
      </div>
    </section>
  );
}

/** @deprecated Użyj HeroSection */
export const LandingHero = HeroSection;
