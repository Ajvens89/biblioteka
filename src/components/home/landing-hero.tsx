import Link from "next/link";
import { ArrowRight, Dices, Scroll, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";
import { LandingFeaturedVisual } from "@/components/home/landing-featured-visual";

export function LandingHero() {
  return (
    <section className="landing-hero relative overflow-hidden px-4 py-8 md:py-10 lg:py-12">
      <div className="landing-hero-board pointer-events-none absolute inset-0" aria-hidden />
      <div className="landing-hero-ornament landing-hero-ornament--left pointer-events-none" aria-hidden />
      <div className="landing-hero-ornament landing-hero-ornament--right pointer-events-none" aria-hidden />

      <div className="relative mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
        <div className="space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/25 bg-white/10 px-4 py-1.5 text-sm font-medium text-amber-50 shadow-sm backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-amber-300" aria-hidden />
            Fundacja Zakątek Fantastyki
          </div>

          <div className="space-y-3">
            <h1 className="font-display text-display text-white">{APP_NAME}</h1>
            <p className="text-body mx-auto max-w-lg text-base leading-relaxed text-violet-100/90 md:text-lg lg:mx-0">
              Wypożyczaj planszówki i podręczniki RPG — znajdź grę, zarezerwuj online i odbierz w
              naszej siedzibie.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Button
              size="lg"
              className="landing-cta-primary h-12 min-h-12 w-full rounded-xl px-7 text-base font-semibold sm:w-auto"
              asChild
            >
              <Link href="/katalog">
                <Dices className="h-5 w-5" aria-hidden />
                Przeglądaj katalog
                <ArrowRight className="h-5 w-5" aria-hidden />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="landing-cta-secondary h-12 min-h-12 w-full rounded-xl px-7 text-base font-semibold sm:w-auto"
              asChild
            >
              <Link href="/login">
                <Scroll className="h-5 w-5" aria-hidden />
                Zaloguj się
              </Link>
            </Button>
          </div>

          <p className="text-small text-violet-200/70">
            Ponad 440 tytułów · rezerwacje online · odbiór w Fundacji
          </p>
        </div>

        <LandingFeaturedVisual className="mx-auto w-full max-w-md lg:max-w-none" />
      </div>
    </section>
  );
}
