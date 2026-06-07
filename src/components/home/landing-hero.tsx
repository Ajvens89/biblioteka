import Link from "next/link";
import { ArrowRight, CalendarCheck, Dices, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";
import {
  LandingCategoryShowcase,
  type HeroShowcaseGame,
} from "@/components/home/landing-category-showcase";

type Props = {
  totalGames: number;
  boardGames: HeroShowcaseGame[];
  rpgGames: HeroShowcaseGame[];
};

const benefits = (total: number) => [
  { icon: Layers, text: `${total} gier w katalogu` },
  { icon: Dices, text: "2 kategorie: planszówki i RPG" },
  { icon: CalendarCheck, text: "Rezerwacje 24/7" },
];

export function LandingHero({ totalGames, boardGames, rpgGames }: Props) {
  return (
    <section className="landing-hero relative overflow-hidden px-4 py-10 md:py-14 lg:py-16">
      <div className="landing-hero-scrim pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
        <div className="space-y-7 text-center lg:text-left">
          <div className="space-y-4">
            <h1 className="landing-hero-title font-display text-white">{APP_NAME}</h1>
            <p className="landing-hero-subtitle mx-auto max-w-xl text-lg leading-relaxed text-white/90 md:text-xl lg:mx-0">
              Wypożyczaj planszówki i podręczniki RPG — znajdź grę, zarezerwuj online i odbierz w
              Fundacji.
            </p>
          </div>

          <ul className="flex flex-wrap justify-center gap-2 lg:justify-start" aria-label="Korzyści">
            {benefits(totalGames).map(({ icon: Icon, text }) => (
              <li key={text}>
                <span className="landing-benefit-chip inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium text-white">
                  <Icon className="h-4 w-4 shrink-0 text-amber-300" aria-hidden />
                  {text}
                </span>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Button
              size="lg"
              className="landing-cta-primary h-12 min-h-12 w-full rounded-xl px-8 text-base font-bold sm:w-auto"
              asChild
            >
              <Link href="/katalog">
                Przeglądaj katalog
                <ArrowRight className="h-5 w-5" aria-hidden />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="landing-cta-secondary h-12 min-h-12 w-full rounded-xl px-8 text-base font-semibold sm:w-auto"
              asChild
            >
              <Link href="/login">Zaloguj się</Link>
            </Button>
          </div>
        </div>

        <LandingCategoryShowcase
          boardGames={boardGames}
          rpgGames={rpgGames}
          className="mx-auto w-full max-w-md lg:max-w-none"
        />
      </div>
    </section>
  );
}
